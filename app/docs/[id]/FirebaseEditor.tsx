"use client";

import { useAuth } from "@clerk/nextjs";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase-client";
import "quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type QuillType = typeof import("quill");

interface FirestoreDeltaDoc {
  deltaOps: any[];
  updatedAt?: any;
}

interface PresenceDoc {
  name: string;
  color: string;
  index: number; // -1 means hidden
  length: number;
  updatedAt: any;
}

export default function FirebaseEditor({ docId }: { docId: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);
  const cursorsModuleRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const savingTimer = useRef<number | null>(null);
  const isApplyingRemote = useRef(false);
  const { isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;

    let unsubDoc: (() => void) | null = null;
    let unsubPresence: (() => void) | null = null;
    let _hasUnmounted = false;

    const setup = async () => {
      if (typeof window === "undefined") return;

      const [{ default: Quill }] = await Promise.all([import("quill")]);
      try {
        const { default: QuillCursors } = await import("quill-cursors");
        // @ts-ignore register module for Quill
        Quill.register("modules/cursors", QuillCursors);
      } catch (e) {
        console.warn("quill-cursors not available", e);
      }

      const editorEl = document.createElement("div");
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(editorEl);

      const quill = new Quill(editorEl, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "blockquote", "code-block"],
            ["clean"],
          ],
          cursors: true,
        },
      });
      quillRef.current = quill as any;
      cursorsModuleRef.current = quill.getModule("cursors");

      // Ensure base document exists
      const docRef = doc(db, "documents", docId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, {
          deltaOps: [],
          updatedAt: serverTimestamp(),
        } satisfies FirestoreDeltaDoc);
      }

      // Migrate any legacy 'delta' field (Quill Delta instance) to plain JSON ops
      if (snap.exists()) {
        const data: any = snap.data();
        if (data && data.delta !== undefined) {
          console.log("Migrating legacy delta field:", data.delta);
          let ops: any[] | null = null;
          if (Array.isArray(data.delta?.ops)) ops = data.delta.ops;
          else if (Array.isArray(data.delta)) ops = data.delta;
          else {
            console.warn("Unable to extract ops from delta:", data.delta);
          }
          try {
            await setDoc(
              docRef,
              {
                deltaOps: ops ?? [],
                delta: deleteField(),
                updatedAt: serverTimestamp(),
              } as any,
              { merge: true },
            );
            console.log("Successfully migrated delta field to deltaOps");
          } catch (error) {
            console.error("Failed to migrate delta field:", error);
            throw error;
          }
        }
      }

      // Subscribe to document content
      unsubDoc = onSnapshot(docRef, (ds) => {
        if (!ds.exists()) return;
        const data = ds.data() as FirestoreDeltaDoc;
        if (!data?.deltaOps) return;
        // Prevent echo when we are the writer
        if (isApplyingRemote.current) return;
        const current = (quillRef.current as any)?.getContents?.();
        // Only update if changed
        try {
          const incoming = { ops: data.deltaOps };
          if (JSON.stringify(current?.ops) !== JSON.stringify(incoming.ops)) {
            (quillRef.current as any)?.setContents(incoming);
          }
        } catch {}
      });

      // Push local edits to Firestore (debounced)
      quill.on("text-change", (_delta: any, _old: any, source: string) => {
        if (source !== "user") return;
        if (savingTimer.current) window.clearTimeout(savingTimer.current);
        savingTimer.current = window.setTimeout(async () => {
          try {
            isApplyingRemote.current = true;
            const delta = quill.getContents();
            console.log("Saving delta to Firestore:", {
              deltaOps: delta.ops,
              deltaOpsType: typeof delta.ops,
              deltaOpsLength: delta.ops?.length,
              updatedAt: serverTimestamp(),
            });
            await setDoc(
              docRef,
              {
                deltaOps: delta.ops,
                updatedAt: serverTimestamp(),
              } as FirestoreDeltaDoc,
              { merge: true },
            );
            console.log("Successfully saved to Firestore");
          } catch (error) {
            console.error("Failed to save to Firestore:", error);
            throw error;
          } finally {
            // Release after a tick so snapshot handler can skip echo
            setTimeout(() => {
              isApplyingRemote.current = false;
            }, 0);
          }
        }, 150);
      });

      // Rollback handler: accept external delta JSON and persist
      const onApplyDelta = (e: Event) => {
        const custom = e as CustomEvent;
        const delta = custom.detail?.delta;
        if (!delta) return;
        try {
          (quillRef.current as any).setContents(delta);
          const ops = Array.isArray(delta?.ops) ? delta.ops : delta;
          console.log("Rollback: saving ops to Firestore:", {
            ops,
            opsType: typeof ops,
            opsLength: ops?.length,
            updatedAt: serverTimestamp(),
          });
          void setDoc(
            docRef,
            {
              deltaOps: ops,
              updatedAt: serverTimestamp(),
            } as FirestoreDeltaDoc,
            { merge: true },
          );
        } catch (error) {
          console.error("Rollback: Failed to save to Firestore:", error);
        }
      };
      window.addEventListener("apply-delta", onApplyDelta as EventListener);

      // Presence: write local selection and listen to others
      const presenceCol = collection(db, "documents", docId, "presence");
      const myPresenceRef = doc(presenceCol, userId ?? "anonymous");

      const color = `hsl(${Math.abs((userId ?? "anon").split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 360}, 70%, 50%)`;
      const name = userId ?? "anonymous";

      const writePresence = async (index: number, length: number) => {
        const presenceData = {
          name,
          color,
          index,
          length,
          updatedAt: serverTimestamp(),
        } as PresenceDoc;
        console.log("Writing presence to Firestore:", {
          ...presenceData,
          nameType: typeof name,
          colorType: typeof color,
          indexType: typeof index,
          lengthType: typeof length,
        });
        try {
          await setDoc(myPresenceRef, presenceData, { merge: true });
          console.log("Successfully wrote presence");
        } catch (error) {
          console.error("Failed to write presence:", error);
          throw error;
        }
      };

      // Initial presence (hidden)
      await writePresence(-1, 0);

      const onSelection = (range: any, _oldRange: any, source: string) => {
        if (source !== "user") return;
        if (!range) {
          void writePresence(-1, 0);
          return;
        }
        void writePresence(range.index, range.length ?? 0);
      };
      quill.on("selection-change", onSelection);

      unsubPresence = onSnapshot(presenceCol, (qs) => {
        const cursors = cursorsModuleRef.current;
        if (!cursors) return;
        qs.docChanges().forEach((change) => {
          const id = change.doc.id;
          if (id === (userId ?? "anonymous")) return;
          const data = change.doc.data() as PresenceDoc;
          if (change.type === "removed") {
            try {
              cursors.removeCursor(id);
            } catch {}
            return;
          }
          if (data.index < 0) {
            try {
              cursors.removeCursor(id);
            } catch {}
            return;
          }
          try {
            if (!cursors.cursors?.[id]) {
              cursors.createCursor(id, data.name, data.color);
            }
            cursors.moveCursor(id, {
              index: data.index,
              length: data.length ?? 0,
            });
          } catch {}
        });
      });

      // Clean up on unload: hide presence and remove listener
      const onBeforeUnload = async () => {
        try {
          await deleteDoc(myPresenceRef);
        } catch {}
      };
      window.addEventListener("beforeunload", onBeforeUnload);

      setIsReady(true);

      // Allow parent/page to open the commit dialog
      const openDialog = () => {
        setCommitMessage("");
        setShowCommitDialog(true);
      };
      window.addEventListener("open-commit-dialog", openDialog);

      return () => {
        window.removeEventListener("beforeunload", onBeforeUnload);
        window.removeEventListener(
          "apply-delta",
          onApplyDelta as EventListener,
        );
        window.removeEventListener("open-commit-dialog", openDialog);
        quill.off("selection-change", onSelection);
      };
    };

    setup();

    return () => {
      _hasUnmounted = true;
      if (unsubDoc) unsubDoc();
      if (unsubPresence) unsubPresence();
    };
  }, [docId, isSignedIn, userId]);

  const handleSaveSnapshot = () => {
    setCommitMessage("");
    setShowCommitDialog(true);
  };

  const handleConfirmSaveSnapshot = async () => {
    if (!quillRef.current || !commitMessage.trim()) return;

    setIsSavingSnapshot(true);
    try {
      const delta = (quillRef.current as any).getContents();
      console.log("Saving snapshot with delta:", delta);

      const response = await fetch(`/api/documents/${docId}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delta, commitMessage: commitMessage.trim() }),
      });

      if (!response.ok) {
        const detail = await response.text();
        console.error("Failed to save snapshot", response.status, detail);
        return;
      }

      const result = await response.json();
      console.log("Snapshot saved:", result);

      setShowCommitDialog(false);
      setCommitMessage("");
    } catch (error) {
      console.error("Error saving snapshot:", error);
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {isReady ? "Connected (Firebase)" : "Connecting..."}
        </div>
        <Button
          type="button"
          onClick={handleSaveSnapshot}
          disabled={!isReady || isSavingSnapshot}
        >
          {isSavingSnapshot ? "Saving..." : "Save Snapshot"}
        </Button>
      </div>
      <div ref={containerRef} className="min-h-[400px]" />

      {/* Commit Message Dialog */}
      <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Snapshot</DialogTitle>
            <DialogDescription>
              Enter a commit message to describe the changes you're saving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="commit-message" className="text-sm font-medium">
                Commit Message
              </label>
              <Textarea
                id="commit-message"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Describe your changes..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCommitDialog(false)}
              disabled={isSavingSnapshot}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSaveSnapshot}
              disabled={isSavingSnapshot || !commitMessage.trim()}
            >
              {isSavingSnapshot ? "Saving..." : "Save Snapshot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

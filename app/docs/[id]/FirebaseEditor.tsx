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
import { jsPDF } from "jspdf";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const docRefRef = useRef<ReturnType<typeof doc> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
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
      docRefRef.current = docRef;
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
            const q = quillRef.current as any;
            const sel = q.getSelection();
            q.setContents(incoming);
            if (sel) {
              // Restore selection to avoid cursor jump to start
              try { q.setSelection(sel.index, sel.length ?? 0, "silent"); } catch {}
            }
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

  // AI: Summarize selected text or whole document
  const handleSummarize = async () => {
    try {
      setIsSummarizing(true);
      const q = quillRef.current as any;
      const range = q.getSelection();
      const text = range && range.length > 0 ? q.getText(range.index, range.length) : q.getText();
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text })
      });
      if (!res.ok) return;
      const { summary } = await res.json();
      setSummaryText(summary || "");
      setShowSummaryDialog(true);
    } catch (e) {
      console.error('Summarize failed', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  // AI: Trigger audio file select and send to transcribe
  const handleChooseAudio = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleAudioSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ai/transcribe', { method: 'POST', body: fd, credentials: 'include' });
      if (!res.ok) return;
      const { text } = await res.json();
      const q = quillRef.current as any;
      const range = q.getSelection();
      const insertAt = range ? range.index : (q.getLength?.() ?? 0);
      q.insertText(insertAt, `\n[Transcript]\n${text}\n`, 'silent');
    } catch (err) {
      console.error('Transcription failed', err);
    }
  };

  // Live dictation using Web Speech API with visual animation and dynamic insertion
  const startListening = () => {
    try {
      const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        console.warn('SpeechRecognition not supported in this browser');
        return;
      }
      const recog = new SR();
      recognitionRef.current = recog;
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US';
      setInterim("");
      setIsListening(true);

      const q = quillRef.current as any;
      let anchorIndex = (q?.getSelection?.()?.index) ?? (q?.getLength?.() ?? 0);

      recog.onresult = (event: any) => {
        let interimText = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) finalText += res[0].transcript;
          else interimText += res[0].transcript;
        }
        // Insert final text and keep interim as a lightweight preview
        if (finalText && q) {
          q.insertText(anchorIndex, finalText + " ", 'silent');
          anchorIndex += (finalText + " ").length;
          q.setSelection(anchorIndex, 0, 'silent');
          // Persist to Firestore so collaborators receive updates
          try {
            const ref = docRefRef.current;
            if (ref) {
              const currentDelta = q.getContents();
              isApplyingRemote.current = true;
              void setDoc(ref, {
                deltaOps: currentDelta.ops,
                updatedAt: serverTimestamp(),
              } as any, { merge: true });
              setTimeout(() => { isApplyingRemote.current = false; }, 0);
            }
          } catch (e) {
            console.error('Failed to sync dictated text:', e);
          }
        }
        setInterim(interimText);
      };

      recog.onerror = () => { stopListening(); };
      recog.onend = () => { setIsListening(false); setInterim(""); };
      recog.start();
    } catch (err) {
      console.error('listen failed', err);
    }
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop?.(); } catch {}
    setIsListening(false);
    setInterim("");
  };

  // Text-to-Speech (browser SpeechSynthesis)
  // Pick a female-sounding voice when available
  const pickFemaleVoice = (): SpeechSynthesisVoice | null => {
    try {
      const synth = window.speechSynthesis;
      const voices = synth?.getVoices?.() || [];
      const preferNames = [
        'female', 'woman', 'Google UK English Female', 'Google US English',
        'Samantha', 'Victoria', 'Karen', 'Tessa', 'Serena', 'Moira', 'Zira', 'Salli'
      ];
      const byName = voices.find(v => preferNames.some(n => v.name.toLowerCase().includes(n.toLowerCase())));
      if (byName) return byName;
      // fallback: first en-* voice
      const byLang = voices.find(v => v.lang?.toLowerCase().startsWith('en'));
      return byLang || voices[0] || null;
    } catch { return null; }
  };

  // Warm up voices and remember preferred one
  useEffect(() => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth) return;
    const update = () => { preferredVoiceRef.current = pickFemaleVoice(); };
    update();
    synth.addEventListener?.('voiceschanged', update as any);
    return () => { synth.removeEventListener?.('voiceschanged', update as any); };
  }, []);

  const startTTS = () => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const q = quillRef.current as any;
      const range = q?.getSelection?.();
      const text = range && range.length > 0 ? q.getText(range.index, range.length) : q.getText();
      if (!text?.trim()) return;
      const utt = new SpeechSynthesisUtterance(text);
      const voice = preferredVoiceRef.current || pickFemaleVoice();
      if (voice) utt.voice = voice;
      utt.rate = 1.0;
      utt.pitch = 1.1; // slightly brighter
      utt.onend = () => { setIsSpeaking(false); ttsUtteranceRef.current = null; };
      utt.onerror = () => { setIsSpeaking(false); ttsUtteranceRef.current = null; };
      ttsUtteranceRef.current = utt;
      synth.cancel();
      synth.speak(utt);
      setIsSpeaking(true);
    } catch (e) {
      console.error('TTS failed', e);
    }
  };

  const stopTTS = () => {
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    setIsSpeaking(false);
    ttsUtteranceRef.current = null;
  };

  // Download current content as PDF
  const handleDownloadPdf = () => {
    try {
      const q = quillRef.current as any;
      const text = q?.getText?.() || "";
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const height = doc.internal.pageSize.getHeight();
      const lines = doc.splitTextToSize(text, width);
      let y = margin;
      const lineHeight = 16;
      lines.forEach((line: string) => {
        if (y > height - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });
      doc.save(`document-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {isReady ? "Connected (Firebase)" : "Connecting..."}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleSummarize} disabled={!isReady || isSummarizing}>{isSummarizing ? 'Summarizing…' : 'Summarize'}</Button>
          {!isListening ? (
            <Button type="button" variant="outline" onClick={startListening} disabled={!isReady}>Dictate</Button>
          ) : (
            <Button type="button" variant="destructive" onClick={stopListening}>Stop</Button>
          )}
          {!isSpeaking ? (
            <Button type="button" variant="outline" onClick={startTTS} disabled={!isReady}>Read</Button>
          ) : (
            <Button type="button" variant="destructive" onClick={stopTTS}>Stop TTS</Button>
          )}
          <Button type="button" variant="outline" onClick={handleDownloadPdf} disabled={!isReady}>Download PDF</Button>
        <Button
          type="button"
          onClick={handleSaveSnapshot}
            disabled={!isReady || isSavingSnapshot}
        >
            {isSavingSnapshot ? "Saving..." : "Save Snapshot"}
        </Button>
        </div>
      </div>
      <div className="relative">
      <div ref={containerRef} className="min-h-[400px]" />
        {isListening && (
          <div className="absolute top-2 right-2 flex items-center gap-2 bg-background/70 backdrop-blur border rounded px-3 py-2">
            <div className="relative h-3 w-3">
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
              <span className="absolute inset-0 rounded-full bg-red-500" />
            </div>
            <span className="text-xs text-muted-foreground">Listening… {interim && <em className="opacity-70">{interim}</em>}</span>
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleAudioSelected} className="hidden" />

      {/* Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Summary</DialogTitle>
            <DialogDescription>
              Generated by AI. You can insert it into the document.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap max-h-72 overflow-auto">{summaryText || 'No summary.'}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummaryDialog(false)}>Close</Button>
            <Button onClick={() => {
              try {
                const q = quillRef.current as any;
                const range = q.getSelection();
                const insertAt = range ? range.index + range.length : (q.getLength?.() ?? 0);
                q.insertText(insertAt, `\nSummary:\n${summaryText}\n`, 'silent');
              } catch {}
              setShowSummaryDialog(false);
            }}>Insert into editor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

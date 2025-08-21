"use client";

import { format } from "date-fns";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
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

interface AnyVersionMeta {
  versionId: string;
  // legacy
  createdAt?: any;
  fileKey?: string;
  createdByUserId?: string;
  // new
  timestamp?: string;
  s3Key?: string;
  createdBy?: string;
  // optional
  commitMessage?: string;
}

export default function VersionHistory({
  docId,
  onRollback,
}: {
  docId: string;
  onRollback: (delta: unknown) => void;
}) {
  const [versions, setVersions] = useState<AnyVersionMeta[]>([]);
  const [reverting, setReverting] = useState<AnyVersionMeta | null>(null);
  const [revertMessage, setRevertMessage] = useState("");
  const [isReverting, setIsReverting] = useState(false);

  useEffect(() => {
    const colRef = collection(db, "documents", docId, "versions");
    const unsub = onSnapshot(colRef, (snap) => {
      const items: AnyVersionMeta[] = [];
      snap.docs.forEach((d) => {
        items.push(d.data() as AnyVersionMeta);
      });
      // Sort client-side by createdAt (Timestamp) or timestamp (ISO)
      items.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? (a.timestamp ? Date.parse(a.timestamp) : 0);
        const bTime = b.createdAt?.toMillis?.() ?? (b.timestamp ? Date.parse(b.timestamp) : 0);
        return bTime - aTime;
      });
      setVersions(items);
    });
    return () => unsub();
  }, [docId]);

  const handleRollback = async (key: string | undefined) => {
    if (!key) return;
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileKey: key }),
    });
    if (!res.ok) return;
    const { downloadUrl } = await res.json();
    const delta = await fetch(downloadUrl).then((r) => r.json());
    onRollback(delta);
  };

  const openRevert = (v: AnyVersionMeta) => {
    setReverting(v);
    setRevertMessage(`Revert to ${v.versionId.slice(0, 8)}`);
  };

  const confirmRevert = async () => {
    if (!reverting) return;
    setIsReverting(true);
    try {
      const key = reverting.s3Key ?? reverting.fileKey;
      if (!key) return;
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fileKey: key }),
      });
      if (!res.ok) return;
      const { downloadUrl } = await res.json();
      const delta = await fetch(downloadUrl).then((r) => r.json());

      // Apply locally
      onRollback(delta);

      // Create a snapshot with revert commit message
      await fetch(`/api/documents/${docId}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delta, commitMessage: revertMessage.trim() || `Revert to ${reverting.versionId.slice(0,8)}` }),
      });

      setReverting(null);
      setRevertMessage("");
    } finally {
      setIsReverting(false);
    }
  };

  const formatWhen = (v: AnyVersionMeta) => {
    try {
      if (v.createdAt?.toDate) return format(v.createdAt.toDate(), "PPpp");
      if (v.timestamp) return format(new Date(v.timestamp), "PPpp");
    } catch {}
    return "";
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Version History</h3>
      <ul className="space-y-2">
        {versions.map((v) => (
          <li
            key={v.versionId}
            className="flex items-center justify-between border p-2 rounded"
          >
            <div className="text-sm">
              <div className="flex items-center gap-2">
                <span>Version: {v.versionId.slice(0, 8)}</span>
                {v.commitMessage ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-muted">
                    {v.commitMessage}
                  </span>
                ) : null}
              </div>
              <div className="text-gray-500 text-xs">
                {formatWhen(v)} {v.createdBy || v.createdByUserId ? `• by ${v.createdBy ?? v.createdByUserId}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => handleRollback(v.fileKey ?? v.s3Key)}
                size="sm"
                variant="outline"
              >
                Preview
              </Button>
              <Button
                type="button"
                onClick={() => openRevert(v)}
                size="sm"
                variant="destructive"
              >
                Revert
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!reverting} onOpenChange={(open) => !open && setReverting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revert document</DialogTitle>
            <DialogDescription>
              This will create a new snapshot with the content from the selected version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="revert-message" className="text-sm font-medium">Commit message</label>
              <Textarea
                id="revert-message"
                value={revertMessage}
                onChange={(e) => setRevertMessage(e.target.value)}
                rows={3}
                placeholder="Describe why you're reverting..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReverting(null)} disabled={isReverting}>
              Cancel
            </Button>
            <Button onClick={confirmRevert} disabled={isReverting || !revertMessage.trim()}>
              {isReverting ? "Reverting..." : "Confirm Revert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

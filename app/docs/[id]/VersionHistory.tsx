"use client";

import { format } from "date-fns";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
import type { VersionMeta } from "@/lib/firestore-types";
import { Button } from "@/components/ui/button";

export default function VersionHistory({
  docId,
  onRollback,
}: {
  docId: string;
  onRollback: (delta: unknown) => void;
}) {
  const [versions, setVersions] = useState<VersionMeta[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "documents", docId, "versions"),
      orderBy("timestamp", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: VersionMeta[] = [];
      snap.docs.forEach((d) => {
        items.push(d.data() as VersionMeta);
      });
      setVersions(items);
    });
    return () => unsub();
  }, [docId]);

  const handleRollback = async (fileKey: string) => {
    // Get presigned URL and fetch delta
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileKey }),
    });
    if (!res.ok) return;
    const { downloadUrl } = await res.json();
    const delta = await fetch(downloadUrl).then((r) => r.json());
    onRollback(delta);
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
              <div>Version: {v.versionId.slice(0, 8)}</div>
              <div className="text-gray-500 text-xs">
                {format(v.createdAt.toDate(), "PPpp")}
              </div>
            </div>
            <Button
              type="button"
              onClick={() => handleRollback(v.fileKey)}
              size="sm"
              variant="destructive"
            >
              Rollback
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

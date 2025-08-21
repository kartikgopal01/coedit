"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { format } from "date-fns";

interface VersionMeta {
  versionId: string;
  timestamp: string;
  createdBy: string;
  s3Key: string;
}

export default function VersionHistory({ docId, onRollback }: { docId: string; onRollback: (delta: any) => void }) {
  const [versions, setVersions] = useState<VersionMeta[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "documents", docId, "versions"),
      orderBy("timestamp", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: VersionMeta[] = [];
      snap.forEach((d) => items.push(d.data() as VersionMeta));
      setVersions(items);
    });
    return () => unsub();
  }, [docId]);

  const handleRollback = async (s3Key: string) => {
    // Get presigned URL and fetch delta
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileKey: s3Key }),
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
          <li key={v.versionId} className="flex items-center justify-between border p-2 rounded">
            <div className="text-sm">
              <div>Version: {v.versionId.slice(0, 8)}</div>
              <div className="text-gray-500 text-xs">{format(new Date(v.timestamp), "PPpp")}</div>
            </div>
            <button
              onClick={() => handleRollback(v.s3Key)}
              className="text-sm bg-gray-800 text-white px-2 py-1 rounded"
            >
              Rollback
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

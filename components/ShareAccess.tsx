"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ShareAccess({ docId }: { docId: string }) {
  const [shareKey, setShareKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const sp = useSearchParams();

  const generate = async () => {
    setStatus("");
    const res = await fetch(`/api/documents/${docId}/share`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      setStatus("Failed to generate share key");
      return;
    }
    const { shareKey } = await res.json();
    setShareKey(shareKey);
  };

  useEffect(() => {
    const key = sp.get("key");
    if (!key) return;
    const join = async () => {
      const res = await fetch(`/api/documents/${docId}/join-with-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key }),
      });
      if (res.ok) setStatus("Joined via key");
      else setStatus("Invalid or expired key");
    };
    void join();
  }, [docId, sp]);

  const shareUrl = shareKey
    ? `${window.location.origin}/docs/${docId}?key=${shareKey}`
    : "";

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Share Access</h3>
      <Button
        type="button"
        onClick={generate}
      >
        Generate Share Link
      </Button>
      {shareKey && (
        <div className="text-sm">
          <div className="break-all">{shareUrl}</div>
        </div>
      )}
      {status && <div className="text-sm text-gray-600">{status}</div>}
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import dynamic from "next/dynamic";
const CollaborativeEditor = dynamic(() => import("./FirebaseEditor"), {
  ssr: false,
});
import VersionHistory from "./VersionHistory";
import InviteCollaborator from "@/components/InviteCollaborator";
import ShareAccess from "@/components/ShareAccess";

export default function DocPage() {
  const params = useParams<{ id: string }>();
  const docId = params.id;

  const handleRollback = useCallback((delta: any) => {
    window.dispatchEvent(new CustomEvent("apply-delta", { detail: { delta } }));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="lg:col-span-2">
        <CollaborativeEditor docId={docId} />
      </div>
      <div className="lg:col-span-1 space-y-4">
        <VersionHistory docId={docId} onRollback={handleRollback} />
        <InviteCollaborator docId={docId} />
        <ShareAccess docId={docId} />
      </div>
    </div>
  );
}

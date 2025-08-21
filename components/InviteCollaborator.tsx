"use client";

import { useState } from "react";

export default function InviteCollaborator({ docId }: { docId: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const invite = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/documents/${docId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to invite");
      setMessage("Invitation sent");
      setEmail("");
    } catch (e) {
      setMessage("Error sending invite");
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/documents/${docId}/accept-invite`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to accept invite");
      setMessage("Invite accepted. You now have access.");
    } catch (e) {
      setMessage("No pending invite found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Collaborators</h3>
      <div className="flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="border px-2 py-1 rounded w-full"
        />
        <button onClick={invite} disabled={loading} className="bg-blue-600 text-white px-3 py-1 rounded">
          Invite
        </button>
      </div>
      <button onClick={accept} disabled={loading} className="text-sm underline">
        Accept my invite
      </button>
      {message && <div className="text-sm text-gray-600">{message}</div>}
    </div>
  );
}

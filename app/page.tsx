"use client";

import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [ownedDocs, setOwnedDocs] = useState<any[]>([]);
  const [sharedDocs, setSharedDocs] = useState<any[]>([]);
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    if (!userId) return;
    const ownedQ = query(
      collection(db, "documents"),
      where("ownerId", "==", userId),
    );
    const sharedQ = query(
      collection(db, "documents"),
      where("collaborators", "array-contains", userId),
    );
    const unsubOwned = onSnapshot(ownedQ, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setOwnedDocs(items);
    });
    const unsubShared = onSnapshot(sharedQ, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setSharedDocs(items);
    });
    return () => {
      unsubOwned();
      unsubShared();
    };
  }, [userId]);

  const handleCreate = async () => {
    const res = await fetch("/api/documents", { method: "POST" });
    if (!res.ok) return;
    const { id } = await res.json();
    router.push(`/docs/${id}`);
  };

  const handleCollaborate = () => {
    try {
      const url = new URL(joinUrl);
      router.push(url.pathname + url.search);
    } catch {
      // If a plain key is pasted or invalid URL, ignore
    }
  };
  return (
    <main className="flex-1 p-8">
      <SignedOut>
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to CoEdit</h1>
          <p className="text-lg text-gray-600 mb-8">
            A real-time collaborative document platform with version control.
            Sign in to start creating and collaborating on documents.
          </p>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-gray-600">Create or join collaborative documents.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
              <input
                value={joinUrl}
                onChange={(e) => setJoinUrl(e.target.value)}
                placeholder="Paste a share link to collaborate"
                className="border px-3 py-2 rounded w-72"
              />
              <button onClick={handleCollaborate} className="bg-gray-800 text-white px-4 py-2 rounded">Collaborate</button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="font-semibold mb-3">Your files</h2>
              <div className="space-y-2">
                {ownedDocs.length === 0 && (
                  <div className="text-sm text-gray-500">No documents yet.</div>
                )}
                {ownedDocs.map((d) => (
                  <Link key={d.id} href={`/docs/${d.id}`} className="block border rounded p-3 hover:bg-gray-50">
                    <div className="font-medium">{d.title || "Untitled"}</div>
                    <div className="text-xs text-gray-500">Updated {d.updatedAt}</div>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-3">Collaborated files</h2>
              <div className="space-y-2">
                {sharedDocs.length === 0 && (
                  <div className="text-sm text-gray-500">No shared documents.</div>
                )}
                {sharedDocs.map((d) => (
                  <Link key={d.id} href={`/docs/${d.id}`} className="block border rounded p-3 hover:bg-gray-50">
                    <div className="font-medium">{d.title || "Untitled"}</div>
                    <div className="text-xs text-gray-500">Owner: {d.ownerId}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </main>
  );
}

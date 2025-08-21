"use client";

import { useRouter } from "next/navigation";

export default function NewDocPage() {
  const router = useRouter();

  const handleCreate = async () => {
    const res = await fetch("/api/documents", { method: "POST" });
    if (!res.ok) return;
    const { id } = await res.json();
    router.push(`/docs/${id}`);
  };

  return (
    <div className="p-8">
      <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded">
        Create Document
      </button>
    </div>
  );
}

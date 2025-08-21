import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const docRef = adminDb.collection("documents").doc(params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = docSnap.data()!;
    if (data.ownerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const inviteRef = docRef.collection("invites").doc();
    const now = new Date().toISOString();
    await inviteRef.set({ email, invitedBy: userId, createdAt: now, status: "pending" });

    // Optionally, also store pending collaborators by email
    await docRef.update({ updatedAt: now });

    return NextResponse.json({ inviteId: inviteRef.id });
  } catch (error) {
    console.error("Error inviting collaborator:", error);
    return NextResponse.json({ error: "Failed to invite collaborator" }, { status: 500 });
  }
}

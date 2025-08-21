import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await clerkClient().users.getUser(userId);
    const emails = [
      user.primaryEmailAddress?.emailAddress,
      ...user.emailAddresses.map((e) => e.emailAddress),
    ].filter(Boolean) as string[];

    if (emails.length === 0) {
      return NextResponse.json({ error: "User has no email" }, { status: 400 });
    }

    const docRef = adminDb.collection("documents").doc(params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Find pending invite
    const invitesSnap = await docRef
      .collection("invites")
      .where("email", "in", emails)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (invitesSnap.empty) {
      return NextResponse.json({ error: "No pending invite found" }, { status: 404 });
    }

    const inviteDoc = invitesSnap.docs[0].ref;
    await inviteDoc.update({ status: "accepted" });

    // Add collaborator by userId
    await docRef.update({ collaborators: FieldValue.arrayUnion(userId) });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}

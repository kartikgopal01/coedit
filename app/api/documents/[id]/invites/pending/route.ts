import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { InviteData } from "@/lib/firestore-types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user is the owner
    const docRef = adminDb.collection("documents").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const docData = docSnap.data();
    if (docData?.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all pending invites for this document
    const invitesSnapshot = await docRef.collection("invites")
      .where("status", "==", "pending")
      .get();

    const pendingInvites: Array<{
      id: string;
      email: string;
      invitedBy: string;
      status: string;
      createdAt: any;
      expiresAt: any;
    }> = [];

    invitesSnapshot.forEach((inviteDoc) => {
      const inviteData = inviteDoc.data() as InviteData;
      pendingInvites.push({
        id: inviteDoc.id,
        email: inviteData.email,
        invitedBy: inviteData.invitedBy,
        status: inviteData.status,
        createdAt: inviteData.createdAt,
        expiresAt: inviteData.expiresAt,
      });
    });

    return NextResponse.json({ invites: pendingInvites });
  } catch (error) {
    console.error("Error fetching pending invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending invites" },
      { status: 500 },
    );
  }
}

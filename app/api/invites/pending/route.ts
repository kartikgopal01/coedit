import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { InviteData } from "@/lib/firestore-types";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all documents that have invites for this user
    const documentsSnapshot = await adminDb.collection("documents").get();
    const pendingInvites: Array<{
      documentId: string;
      documentTitle: string;
      invite: InviteData;
    }> = [];

    for (const docSnapshot of documentsSnapshot.docs) {
      const documentData = docSnapshot.data();
      const inviteRef = docSnapshot.ref.collection("invites").doc(userId);
      const inviteSnapshot = await inviteRef.get();

      if (inviteSnapshot.exists) {
        const inviteData = inviteSnapshot.data() as InviteData;

        // Only include pending invites that haven't expired
        if (inviteData.status === "pending" &&
            inviteData.expiresAt &&
            inviteData.expiresAt.toDate() > new Date()) {
          pendingInvites.push({
            documentId: docSnapshot.id,
            documentTitle: documentData.title || "Untitled",
            invite: inviteData,
          });
        }
      }
    }

    return NextResponse.json({ invites: pendingInvites });
  } catch (error) {
    console.error("Error fetching pending invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending invites" },
      { status: 500 },
    );
  }
}

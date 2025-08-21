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

    // Read from the user's invite inbox for fast dashboard loading
    const inboxSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("invites")
      .get();

    const pendingInvites: Array<{
      documentId: string;
      documentTitle: string;
      invite: InviteData;
    }> = [];

    inboxSnap.forEach((inboxDoc) => {
      const data = inboxDoc.data() as any;
      const invite = data.invite as InviteData;
      if (!invite) return;
      const expires = invite.expiresAt as any;
      const notExpired = !expires || (typeof expires.toDate === 'function' ? expires.toDate() : new Date(expires)) > new Date();
      if (invite.status === 'pending' && notExpired) {
        pendingInvites.push({
          documentId: data.documentId,
          documentTitle: data.documentTitle || 'Untitled',
          invite,
        });
      }
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

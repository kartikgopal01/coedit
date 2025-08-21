import { auth, clerkClient } from "@clerk/nextjs/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { InviteData } from "@/lib/firestore-types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const { id } = await params;
    const docRef = adminDb.collection("documents").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const data = docSnap.data()!;
    if (data.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user exists in Clerk (support both old/new clerkClient shapes)
    try {
      const cc: any = typeof (clerkClient as any) === 'function' ? await (clerkClient as any)() : (clerkClient as any);
      const users = await cc.users.getUserList({
        emailAddress: [email],
      });

      if (users.data.length === 0) {
        return NextResponse.json(
          { error: "User not found. They need to sign up first." },
          { status: 404 },
        );
      }

      const invitedUserId = users.data[0].id;

      // Check if already invited
      const inviteRef = docRef.collection("invites").doc(invitedUserId);
      const inviteSnap = await inviteRef.get();

      if (inviteSnap.exists) {
        return NextResponse.json(
          { error: "User already invited" },
          { status: 400 },
        );
      }

      // Create invite (expires in 7 days)
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const inviteData: Omit<InviteData, "id"> = {
        email,
        invitedBy: userId,
        status: "pending",
        createdAt: FieldValue.serverTimestamp() as any,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + sevenDaysMs)) as any,
      };

      await inviteRef.set(inviteData);

      // Fan-out to the invited user's dashboard inbox for quick access
      try {
        const inboxRef = adminDb
          .collection("users")
          .doc(invitedUserId)
          .collection("invites")
          .doc(id);

        await inboxRef.set({
          documentId: id,
          documentTitle: data.title || 'Untitled',
          invite: inviteData,
        }, { merge: true });
      } catch (inboxError) {
        console.error("Failed to write invite to user's inbox:", inboxError);
      }

      return NextResponse.json({
        message: "Invitation sent successfully",
        invitedUserId,
      });
    } catch (error) {
      console.error("Error inviting user:", error);
      return NextResponse.json(
        { error: "Failed to send invitation" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in invite endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

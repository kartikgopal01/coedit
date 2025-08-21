import { auth, clerkClient } from "@clerk/nextjs/server";
import { FieldValue } from "firebase-admin/firestore";
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

    // Check if user exists in Clerk
    try {
      const client = await clerkClient();
      const users = await client.users.getUserList({
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

      // Create invite
      const inviteData: Omit<InviteData, "id"> = {
        email,
        invitedBy: userId,
        status: "pending",
        createdAt: FieldValue.serverTimestamp() as any,
        expiresAt: FieldValue.serverTimestamp() as any, // Set to 7 days from now
      };

      await inviteRef.set(inviteData);

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

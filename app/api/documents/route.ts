import { auth } from "@clerk/nextjs/server";
import { FieldValue } from "firebase-admin/firestore";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { DocumentData } from "@/lib/firestore-types";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description } = await request.json().catch(() => ({ title: "Untitled", description: "" }));

    const docRef = adminDb.collection("documents").doc();
    const now = FieldValue.serverTimestamp();

    const documentData: Omit<DocumentData, "id"> = {
      title: title || "Untitled",
      description: description || "",
      ownerId: userId,
      collaborators: [],
      createdAt: now as any,
      updatedAt: now as any,
      deltaOps: [],
    };

    await docRef.set(documentData);

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const docRef = adminDb.collection("documents").doc(params.id);
    const snap = await docRef.get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = snap.data()!;
    if (data.ownerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const shareKey = data.shareKey || uuidv4();
    if (!data.shareKey) {
      await docRef.update({ shareKey });
    }

    return NextResponse.json({ shareKey });
  } catch (error) {
    console.error("Error generating share key:", error);
    return NextResponse.json({ error: "Failed to generate share key" }, { status: 500 });
  }
}

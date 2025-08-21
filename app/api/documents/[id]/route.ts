import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const docSnap = await adminDb.collection("documents").doc(id).get();
    if (!docSnap.exists)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = docSnap.data()!;
    const hasAccess =
      data.ownerId === userId || (data.collaborators || []).includes(userId);
    if (!hasAccess)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ id, ...data });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 },
    );
  }
}

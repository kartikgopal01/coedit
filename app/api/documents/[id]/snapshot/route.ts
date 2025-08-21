import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { adminDb } from "@/lib/firebase-admin";
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3-client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { delta } = await request.json();
    if (!delta) return NextResponse.json({ error: "Delta required" }, { status: 400 });

    const { id } = await params;
    const docRef = adminDb.collection("documents").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = docSnap.data()!;
    const hasAccess = data.ownerId === userId || (data.collaborators || []).includes(userId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const versionId = uuidv4();
    const timestamp = new Date().toISOString();
    const s3Key = `snapshots/${id}/${timestamp}-${versionId}.json`;

    // Upload JSON delta to S3
    const putCmd = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: JSON.stringify(delta),
      ContentType: "application/json",
    });
    await s3Client.send(putCmd);

    // Write Firestore metadata
    await docRef.collection("versions").doc(versionId).set({
      versionId,
      timestamp,
      createdBy: userId,
      s3Key,
    });

    await docRef.update({ updatedAt: timestamp });

    return NextResponse.json({ versionId, timestamp, s3Key });
  } catch (error) {
    console.error("Error saving snapshot:", error);
    return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
  }
}

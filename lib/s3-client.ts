import { S3Client } from "@aws-sdk/client-s3";

// Initialize S3 Client
export const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// S3 bucket configuration
export const S3_BUCKET_NAME =
  process.env.AWS_S3_BUCKET_NAME || "coedit-codeit";
export const S3_REGION =
  process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-1";

// File upload configuration
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  "text/plain",
  "text/markdown",
  "application/json",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

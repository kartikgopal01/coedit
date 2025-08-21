import type { Timestamp } from "firebase/firestore";

// Document metadata stored in Firestore
export interface DocumentData {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  collaborators: string[];
  shareKey?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deltaOps?: any[]; // For real-time collaboration
}

// Version metadata stored in Firestore
export interface VersionMeta {
  versionId: string;
  fileKey: string; // S3 object key
  fileName: string;
  fileType: string;
  size: number;
  createdAt: Timestamp;
  createdByUserId: string;
  commitMessage?: string;
  downloadStrategy: "presigned";
}

// Presence data for real-time collaboration
export interface PresenceData {
  name: string;
  color: string;
  index: number; // -1 means hidden
  length: number;
  updatedAt: Timestamp;
}

// Invite data for document sharing
export interface InviteData {
  email: string;
  invitedBy: string;
  status: "pending" | "accepted" | "declined";
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

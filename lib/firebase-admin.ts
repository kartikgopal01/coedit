import fs from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

function normalizePrivateKey(obj: any) {
  if (obj && typeof obj.private_key === "string") {
    obj.private_key = obj.private_key.replace(/\\n/g, "\n");
  }
  return obj;
}

function tryParseJson(raw: string) {
  try {
    return normalizePrivateKey(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function tryParseBase64(raw: string) {
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    return normalizePrivateKey(JSON.parse(decoded));
  } catch {
    return undefined;
  }
}

function tryReadJsonFile(filePath: string) {
  try {
    const full = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    if (!fs.existsSync(full)) return undefined;
    const content = fs.readFileSync(full, "utf8");
    return normalizePrivateKey(JSON.parse(content));
  } catch {
    return undefined;
  }
}

// Resolve Firebase service account from env or common defaults
function resolveServiceAccount(): ServiceAccountKey | string | undefined {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const keyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  const keyFile =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // 1) Explicit JSON env
  if (key) {
    const asJson = tryParseJson(key);
    if (asJson) return asJson;
    const asB64 = tryParseBase64(key);
    if (asB64) return asB64;
    // If looks like a path or a file exists, read file
    const asFile = tryReadJsonFile(key);
    if (asFile) return asFile;
    // If not JSON and not a valid existing file but not starting with '{', allow cert to read path
    if (!key.trim().startsWith("{")) {
      return key;
    }
  }

  // 2) Base64 env
  if (keyB64) {
    const asB64 = tryParseBase64(keyB64);
    if (asB64) return asB64;
  }

  // 3) Explicit file path envs
  if (keyFile) {
    const fromFile = tryReadJsonFile(keyFile);
    if (fromFile) return fromFile;
    return keyFile; // let admin SDK try path
  }

  // 4) Common local files
  for (const candidate of [
    "service-account.json",
    "service.json",
    "firebase-service-account.json",
  ]) {
    const fromFile = tryReadJsonFile(candidate);
    if (fromFile) return fromFile;
  }

  return undefined;
}

const serviceAccount = resolveServiceAccount();

const app =
  getApps().length === 0
    ? initializeApp({
        credential: serviceAccount ? cert(serviceAccount as any) : undefined,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

export default app;

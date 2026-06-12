import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 — transit host for LARGE videos only (Supabase free tier caps
// files at 50 MB; IG accepts Reels up to ~1 GB). Images and small videos stay on
// Supabase Storage. Objects are deleted right after the post publishes, so the
// 10 GB free tier is ample. All five env vars must be set (locally in .env.local
// AND in Vercel) or big-video uploads fail with a clear message:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE
const ACCOUNT = process.env.R2_ACCOUNT_ID;
const KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;
const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || "").replace(/\/+$/, "");

export const r2Configured = () => !!(ACCOUNT && KEY && SECRET && BUCKET && PUBLIC_BASE);

const client = () => new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: KEY, secretAccessKey: SECRET },
});

// Short-lived presigned PUT so the browser uploads straight to R2 (the file
// never transits our serverless function, which has its own body-size limits).
export async function presignR2Put(key, contentType) {
  return getSignedUrl(client(), new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }), { expiresIn: 600 });
}

export const r2PublicUrl = (key) => `${PUBLIC_BASE}/${key}`;
export const isR2Url = (p) => !!PUBLIC_BASE && typeof p === "string" && p.startsWith(`${PUBLIC_BASE}/`);

export async function r2Delete(urlOrKey) {
  const key = isR2Url(urlOrKey) ? urlOrKey.slice(PUBLIC_BASE.length + 1) : urlOrKey;
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// Mock S3 storage service
// In production, replace with actual S3 client

const storage = new Map<string, { data: Buffer; expiresAt: number }>();

export async function uploadPDF(key: string, buffer: Buffer): Promise<string> {
  // Store in memory (mock)
  storage.set(key, {
    data: buffer,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
  });

  // Return mock S3 URL
  return `s3://zenith-hr-contracts/${key}`;
}

export async function generatePresignedURL(key: string): Promise<string> {
  const entry = storage.get(key);
  if (!entry) {
    throw new Error("File not found");
  }

  if (Date.now() > entry.expiresAt) {
    storage.delete(key);
    throw new Error("File expired");
  }

  // Return mock presigned URL (15 min expiry)
  const expiresIn = Math.floor((entry.expiresAt - Date.now()) / 1000);
  return `https://storage.zenith-hr.com/contracts/${key}?expires=${expiresIn}`;
}

export async function getPDF(key: string): Promise<Buffer | null> {
  const entry = storage.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    storage.delete(key);
    return null;
  }

  return entry.data;
}

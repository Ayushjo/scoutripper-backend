export function buildImageUrl(key: string | null): string | null {
  if (!key) return null;

  const trimmedKey = key.trim();
  if (!trimmedKey) return null;
  if (trimmedKey.startsWith("http")) return trimmedKey;

  const storageUrl = process.env.STORAGE_URL?.replace(/\/$/, "");
  if (!storageUrl) return trimmedKey;

  return `${storageUrl}/${trimmedKey.replace(/^\//, "")}`;
}

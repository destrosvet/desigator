export const PREVIEW_MODEL_TYPES = new Set(["model/gltf-binary"]);

export function anonymousAttachmentName(originalName: string, index = 0) {
  const extension = originalName.match(/\.[a-z0-9]{1,10}$/i)?.[0].toLowerCase() || "";
  return `Příloha ${index + 1}${extension}`;
}
export const PREVIEW_DOCUMENT_TYPES = new Set(["application/pdf"]);
export const PREVIEW_VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
export const PREVIEW_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type WorkAttachment = { id: string; originalName: string; mimeType: string; size: number };

export function attachmentUrl(id: string, mode?: "preview" | "thumbnail") {
  return `/api/uploads/${encodeURIComponent(id)}${mode ? `?${mode}=1` : ""}`;
}

export function uploadFileSizeLimit(mimeType: string) {
  return (mimeType === "video/mp4" ? 100 : 25) * 1024 * 1024;
}

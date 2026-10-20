export const PREVIEW_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type WorkAttachment = { id: string; originalName: string; mimeType: string; size: number };

export function attachmentUrl(id: string, mode?: "preview" | "thumbnail") {
  return `/api/uploads/${encodeURIComponent(id)}${mode ? `?${mode}=1` : ""}`;
}

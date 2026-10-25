export const MODEL_MIME_TYPE = "model/gltf-binary";

// Browsers commonly report GLB as an empty or generic MIME type.
export function normalizeModelFile(file: File): File {
  return /\.glb$/i.test(file.name) && ["", "application/octet-stream", MODEL_MIME_TYPE].includes(file.type)
    ? new File([file], file.name, { type: MODEL_MIME_TYPE, lastModified: file.lastModified }) : file;
}

export function validateGlb(buffer: Uint8Array): string | null {
  const invalid = "Neplatný GLB model. Exportujte samostatný GLB 2.0 bez externích souborů a bez komprese Draco/Meshopt/KTX2.";
  try {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    if (buffer.length < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.length || view.getUint32(16, true) !== 0x4e4f534a) return invalid;
    const length = view.getUint32(12, true);
    if (!length || length % 4 || length + 20 > buffer.length) return invalid;
    const document = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(20, 20 + length)));
    if (document?.asset?.version !== "2.0") return invalid;
    const unsupported = ["KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_texture_basisu"];
    if ([...(document.extensionsUsed || []), ...(document.extensionsRequired || [])].some((name) => unsupported.includes(name))) return invalid;
    // Prevent a model or extension from causing requests for external resources.
    const stack: unknown[] = [document];
    while (stack.length) {
      const value = stack.pop();
      if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
        if (key === "uri" && (typeof child !== "string" || !/^data:(image\/(png|jpeg|webp)|application\/octet-stream);base64,[a-z0-9+/=\s]*$/i.test(child))) return invalid;
        if (child && typeof child === "object") stack.push(child);
      }
    }
    let offset = length + 20;
    while (offset < buffer.length) {
      if (offset + 8 > buffer.length) return invalid;
      const chunkLength = view.getUint32(offset, true);
      if (chunkLength % 4 || offset + 8 + chunkLength > buffer.length) return invalid;
      offset += 8 + chunkLength;
    }
    return null;
  } catch { return invalid; }
}

import { createHash } from "crypto";
export async function importFingerprint(stage: string, files: File[], studentIds: string[]) {
  const entries: string[] = [];
  for (const [index, file] of files.entries()) {
    entries.push(JSON.stringify([studentIds[index], file.name, file.type, file.size, createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex")]));
  }
  // File order and an edited note do not make unchanged work a new version.
  return createHash("sha256").update(JSON.stringify([stage, entries.sort()])).digest("hex");
}

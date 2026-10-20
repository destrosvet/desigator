/**
 * S3 kompatibilní klient pro ukládání souborů.
 * Podporuje MinIO, AWS S3, Cloudflare R2, DigitalOcean Spaces, apod.
 */

const S3_CONFIG = {
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION || "us-east-1",
  bucket: process.env.S3_BUCKET!,
  accessKeyId: process.env.S3_ACCESS_KEY_ID!,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  publicUrl: process.env.S3_PUBLIC_URL,
};

async function getSignedHeaders(
  method: string,
  path: string,
  payload: string | ArrayBuffer,
  timestamp: string,
  dateStamp: string,
  host: string
): Promise<Record<string, string>> {
  const { accessKeyId, secretAccessKey, region } = S3_CONFIG;

  const payloadHash = await asyncSha256(payload);
  const canonicalRequest = [
    method.toUpperCase(),
    path,
    "",
    `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${timestamp}\n`,
    "host;x-amz-content-sha256;x-amz-date",
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const canonicalHash = await asyncSha256(canonicalRequest);
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    credentialScope,
    canonicalHash,
  ].join("\n");

  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, "s3");
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signatureBytes = await hmacSha256(kSigning, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope},` +
    `SignedHeaders=host;x-amz-content-sha256;x-amz-date,` +
    `Signature=${signature}`;

  return {
    Authorization: authorization,
    "x-amz-date": timestamp,
    "x-amz-content-sha256": payloadHash,
    Host: host,
  };
}

async function asyncSha256(data: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const buf =
    typeof data === "string" ? encoder.encode(data) : new Uint8Array(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(
  key: string | ArrayBuffer,
  data: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data)
  );
  return signature;
}

function objectLocation(key: string) {
  const url = new URL(S3_CONFIG.endpoint);
  const encoded = key.split("/").map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)).join("/");
  const prefix = url.pathname.replace(/\/$/, "");
  if (S3_CONFIG.forcePathStyle) url.pathname = `${prefix}/${encodeURIComponent(S3_CONFIG.bucket)}/${encoded}`;
  else {
    url.hostname = `${S3_CONFIG.bucket}.${url.hostname}`;
    url.pathname = `${prefix}/${encoded}`;
  }
  return { url: url.toString(), path: url.pathname, host: url.host };
}

/**
 * Vrátí veřejnou URL souboru
 */
export function getPublicUrl(key: string): string {
  if (S3_CONFIG.publicUrl) {
    return `${S3_CONFIG.publicUrl}/${key}`;
  }
  return objectLocation(key).url;
}

/**
 * Nahraje soubor do S3/MinIO
 */
export async function uploadFile(
  key: string,
  file: Buffer | Uint8Array | ArrayBuffer,
  contentType: string = "application/octet-stream"
): Promise<{ url: string; key: string }> {
  const { url, path, host } = objectLocation(key);

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:\-]|\.\d{3}/g, "");
  const dateStamp = timestamp.slice(0, 8);

  const body =
    file instanceof ArrayBuffer
      ? Buffer.from(file)
      : Buffer.isBuffer(file)
      ? file
      : Buffer.from(file);

  const requestBody = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  const headers = await getSignedHeaders("PUT", path, requestBody, timestamp, dateStamp, host);

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": contentType,
      "Content-Length": String(body.length),
    },
    body: requestBody,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`S3 upload failed: ${response.status} ${text}`);
  }

  return { url: getPublicUrl(key), key };
}

/**
 * Smaže soubor z S3/MinIO
 */
export async function deleteFile(key: string): Promise<void> {
  const { url, path, host } = objectLocation(key);

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:\-]|\.\d{3}/g, "");
  const dateStamp = timestamp.slice(0, 8);

  const headers = await getSignedHeaders("DELETE", path, "", timestamp, dateStamp, host);

  const response = await fetch(url, {
    method: "DELETE",
    headers,
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`S3 delete failed: ${response.status} ${text}`);
  }
}

/**
 * Získá soubor z S3/MinIO
 */
export async function getFile(key: string): Promise<Buffer> {
  const { url, path, host } = objectLocation(key);

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:\-]|\.\d{3}/g, "");
  const dateStamp = timestamp.slice(0, 8);

  const headers = await getSignedHeaders("GET", path, "", timestamp, dateStamp, host);

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`S3 get failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

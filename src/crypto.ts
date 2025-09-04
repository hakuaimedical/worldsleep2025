// AES-GCM + ECDH helpers (demo-grade). No external libs.

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
export function bytesToB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

// ---------- AES data encryption/decryption ----------
export async function encryptJson(obj: unknown) {
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt","decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const blob = new Blob([new Uint8Array(ct)], { type: "application/octet-stream" });

  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const key_b64 = bytesToB64(rawKey);
  const iv_b64 = bytesToB64(iv);

  return { blob, iv_b64, key_b64 };
}

export async function decryptFromBytes(cipherBytes: ArrayBuffer, key_b64: string, iv_b64: string): Promise<any> {
  const keyRaw = b64ToBytes(key_b64);
  const iv = b64ToBytes(iv_b64);
  const key = await crypto.subtle.importKey("raw", keyRaw, { name: "AES-GCM" }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBytes);
  const json = new TextDecoder().decode(new Uint8Array(pt));
  return JSON.parse(json);
}

// ---------- ECDH (P-256) for key wrapping (demo) ----------
type KP = { publicKey: CryptoKey; privateKey: CryptoKey };

export async function genECDHKeyPair(): Promise<KP> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey","deriveBits"]
  ) as Promise<KP>;
}

export async function exportPubKeySpkiB64(pub: CryptoKey): Promise<string> {
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pub));
  return bytesToB64(spki);
}
export async function importPubKeySpkiB64(b64: string): Promise<CryptoKey> {
  const spki = b64ToBytes(b64);
  return crypto.subtle.importKey("spki", spki, { name: "ECDH", namedCurve: "P-256" }, true, []);
}

async function deriveWrappingKey(myPriv: CryptoKey, theirPub: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPub },
    myPriv,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt","decrypt"]
  );
}

export async function wrapAesKeyForRecipient(
  aesKeyRaw_b64: string,
  myPriv: CryptoKey,
  recipientPub_b64: string
): Promise<{ wrapped_b64: string; iv_b64: string; }> {
  const recipientPub = await importPubKeySpkiB64(recipientPub_b64);
  const wrapKey = await deriveWrappingKey(myPriv, recipientPub);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const raw = b64ToBytes(aesKeyRaw_b64);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrapKey, raw);
  return { wrapped_b64: bytesToB64(new Uint8Array(ct)), iv_b64: bytesToB64(iv) };
}

export async function unwrapAesKeyFromSender(
  wrapped_b64: string,
  iv_b64: string,
  myPriv: CryptoKey,
  senderPub_b64: string
): Promise<{ rawKey_b64: string; }> {
  const senderPub = await importPubKeySpkiB64(senderPub_b64);
  const wrapKey = await deriveWrappingKey(myPriv, senderPub);
  const iv = b64ToBytes(iv_b64);
  const ct = b64ToBytes(wrapped_b64);
  const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, wrapKey, ct);
  return { rawKey_b64: bytesToB64(new Uint8Array(raw)) };
}

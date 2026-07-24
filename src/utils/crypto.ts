// Web Crypto helpers for USNEE.
// - PIN is never stored in plaintext: we keep a PBKDF2-SHA256 verifier.
// - Export supports real AES-256-GCM encryption (password-derived key via PBKDF2).
// NOTE: crypto.subtle is only available in a secure context (https / localhost).
// That holds for the Telegram Mini App (https) and local dev (localhost).

const enc = new TextEncoder();
const dec = new TextDecoder();

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

const PIN_ITER = 150_000;

// Stored verifier format: "PINv1:<saltB64>:<hashB64>"
export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PIN_ITER, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `PINv1:${bufToBase64(salt.buffer)}:${bufToBase64(bits)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (!stored || !stored.startsWith('PINv1:')) return false;
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const [, saltB64, hashB64] = parts;
  let salt: ArrayBuffer;
  try {
    salt = base64ToBuf(saltB64);
  } catch {
    return false;
  }
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PIN_ITER, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const computed = bufToBase64(bits);
  // Constant-time compare to avoid timing leaks.
  if (computed.length !== hashB64.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ hashB64.charCodeAt(i);
  return diff === 0;
}

// ---- AES-GCM export envelope ----
export interface EncryptedEnvelope {
  format: 'usnee-export-aes';
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string;
  iv: string;
  data: string;
}

const EXPORT_ITER = 250_000;

export async function encryptData(plaintext: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: EXPORT_ITER, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const envelope: EncryptedEnvelope = {
    format: 'usnee-export-aes',
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iter: EXPORT_ITER,
    salt: bufToBase64(salt.buffer),
    iv: bufToBase64(iv.buffer),
    data: bufToBase64(cipher)
  };
  return JSON.stringify(envelope);
}

export async function decryptData(payload: string, password: string): Promise<string> {
  const env = JSON.parse(payload) as EncryptedEnvelope;
  if (env.format !== 'usnee-export-aes') throw new Error('Неподдерживаемый формат экспорта');
  const salt = base64ToBuf(env.salt);
  const iv = base64ToBuf(env.iv);
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: env.iter, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64ToBuf(env.data));
  return dec.decode(plain);
}

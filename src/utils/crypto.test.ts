import { describe, expect, it } from 'vitest';
import { decryptData, encryptData } from './crypto';

describe('crypto export envelope', () => {
  it('roundtrips plaintext', async () => {
    const payload = JSON.stringify({ entries: [{ id: 'e1' }] });
    const encrypted = await encryptData(payload, 'pass-123');
    await expect(decryptData(encrypted, 'pass-123')).resolves.toBe(payload);
  });

  it('rejects a tampered iter below the allowed range', async () => {
    const encrypted = await encryptData('secret', 'pass-123');
    const env = JSON.parse(encrypted);
    env.iter = 1000;
    await expect(decryptData(JSON.stringify(env), 'pass-123')).rejects.toThrow(
      'Недопустимое число итераций KDF в экспорте'
    );
  });

  it('rejects a malicious iter DoS payload', async () => {
    const encrypted = await encryptData('secret', 'pass-123');
    const env = JSON.parse(encrypted);
    env.iter = 50_000_000;
    await expect(decryptData(JSON.stringify(env), 'pass-123')).rejects.toThrow(
      'Недопустимое число итераций KDF в экспорте'
    );
  });

  it('rejects non-integer iter', async () => {
    const encrypted = await encryptData('secret', 'pass-123');
    const env = JSON.parse(encrypted);
    env.iter = NaN;
    await expect(decryptData(JSON.stringify(env), 'pass-123')).rejects.toThrow(
      'Недопустимое число итераций KDF в экспорте'
    );
  });

  it('rejects unsupported kdf before deriving keys', async () => {
    const encrypted = await encryptData('secret', 'pass-123');
    const env = JSON.parse(encrypted);
    env.kdf = 'PBKDF2-SHA512';
    await expect(decryptData(JSON.stringify(env), 'pass-123')).rejects.toThrow(
      'Неподдерживаемый KDF экспорта'
    );
  });

  it('rejects unsupported format', async () => {
    await expect(decryptData('{"format":"other"}', 'pass-123')).rejects.toThrow(
      'Неподдерживаемый формат экспорта'
    );
  });
});

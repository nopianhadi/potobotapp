const pinPattern = /^\d{4,6}$/;

export async function hashBoothPin(pin: string): Promise<string> {
  const normalized = pin.trim();
  if (!pinPattern.test(normalized)) throw new Error("PIN harus berupa 4 sampai 6 angka.");
  const bytes = new TextEncoder().encode(`flashfold-booth-pin:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isValidPinFormat(pin: string): boolean {
  return pinPattern.test(pin.trim());
}

export async function verifyBoothPin(pin: string, expectedHash: string): Promise<boolean> {
  if (!expectedHash) return true;
  try {
    const candidate = await hashBoothPin(pin);
    return candidate === expectedHash;
  } catch {
    return false;
  }
}

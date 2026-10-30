// ISBN checksums and conversion. All functions take digits only, without hyphens.

export function isValidIsbn13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(value[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === Number(value[12]);
}

export function isValidIsbn10(value: string): boolean {
  if (!/^\d{9}[\dX]$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += (value[i] === "X" ? 10 : Number(value[i])) * (10 - i);
  return sum % 11 === 0;
}

/** The ISBN-10 of a 978 ISBN-13. A 979 ISBN-13 has none. */
export function isbn13To10(isbn13: string): string | null {
  if (!isValidIsbn13(isbn13) || !isbn13.startsWith("978")) return null;
  const body = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(body[i]) * (10 - i);
  const check = (11 - (sum % 11)) % 11;
  return body + (check === 10 ? "X" : String(check));
}

export function isbn10To13(isbn10: string): string | null {
  if (!isValidIsbn10(isbn10)) return null;
  const body = `978${isbn10.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
  return body + String((10 - (sum % 10)) % 10);
}

/** Digits of a written ISBN ("978-602-03-2478-4" becomes "9786020324784"), upper case X. */
export function cleanIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

/** The ISBN-13 for any written ISBN, or null when it fails its checksum. */
export function toIsbn13(raw: string): string | null {
  const clean = cleanIsbn(raw);
  if (isValidIsbn13(clean)) return clean;
  return isbn10To13(clean);
}

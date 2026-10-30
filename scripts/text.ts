// Text helpers shared by the validator, the build and the add tool.

/**
 * Lower case, accents removed, anything but letters and digits turned into
 * single spaces: "Bumi Manusia: Edisi Revisi" becomes "bumi manusia edisi revisi".
 */
export function normalizeSearchText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Title and first author, normalized: the key that hints two files may be one book. */
export function bookKey(title: string, firstAuthor: string): string {
  return `${normalizeSearchText(title)}|${normalizeSearchText(firstAuthor)}`;
}

/** URL and file name form of a text, cut at a word boundary when it is too long. */
export function slugify(raw: string, max = 80): string {
  const slug = normalizeSearchText(raw).replace(/ /g, "-");
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max);
  const hyphen = cut.lastIndexOf("-");
  return hyphen > max / 2 ? cut.slice(0, hyphen) : cut;
}

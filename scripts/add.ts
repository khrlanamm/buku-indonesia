// Starts a new book file, filled from Open Library when it knows the ISBN.
//
//   npm run add -- 9786020324784
//   npm run add -- 9786020324784 --category Novel --source https://example.com/book
//   npm run add -- --title "Judul" --author "Nama Penulis" --source physical-book
//
// Check the file it writes against the book before opening a pull request.

import {createHash} from "node:crypto";
import {parseArgs} from "node:util";

import {loadBookFiles, writeBook} from "./book-file.ts";
import {toIsbn13} from "./isbn.ts";
import {BOOK_CATEGORIES, bookSchema} from "./schema.ts";
import type {Book} from "./schema.ts";
import {bookKey} from "./text.ts";

const USER_AGENT = "buku-indonesia (https://github.com/khrlanamm/buku-indonesia)";

async function openLibrary<T>(path: string): Promise<T | null> {
  const response = await fetch(`https://openlibrary.org${path}`, {headers: {"User-Agent": USER_AGENT, Accept: "application/json"}});
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Open Library answered HTTP ${response.status} for ${path}`);
  return (await response.json()) as T;
}

interface Edition {
  key: string;
  title?: string;
  subtitle?: string;
  publishers?: string[];
  publish_date?: string;
  number_of_pages?: number;
  covers?: number[];
  authors?: {key: string}[];
  works?: {key: string}[];
}

const olKey = (key: string | undefined) => key?.split("/").pop() ?? null;

async function authorsOf(edition: Edition): Promise<string[]> {
  let keys = (edition.authors ?? []).map((a) => a.key);
  if (keys.length === 0 && edition.works?.[0]) {
    const work = await openLibrary<{authors?: {author?: {key: string}}[]}>(`${edition.works[0].key}.json`);
    keys = (work?.authors ?? []).map((a) => a.author?.key).filter((k): k is string => !!k);
  }
  const names: string[] = [];
  for (const key of keys.slice(0, 5)) {
    const author = await openLibrary<{name?: string}>(`${key}.json`);
    if (author?.name) names.push(author.name);
  }
  return names;
}

const usage = 'Usage: npm run add -- <isbn> [--title "..."] [--author "..."] [--publisher "..."] [--year 2015] [--pages 300] [--category Novel] [--source URL]';

async function main(): Promise<void> {
  const {values, positionals} = parseArgs({
    allowPositionals: true,
    options: {
      title: {type: "string"},
      subtitle: {type: "string"},
      author: {type: "string", multiple: true},
      publisher: {type: "string"},
      year: {type: "string"},
      pages: {type: "string"},
      category: {type: "string", multiple: true},
      source: {type: "string"},
    },
  });

  const isbn13 = positionals[0] ? toIsbn13(positionals[0]) : null;
  if (positionals[0] && !isbn13) throw new Error(`${positionals[0]} is not a valid ISBN: its check digit does not match.`);

  const existing = loadBookFiles();
  if (isbn13) {
    const same = existing.find((file) => (file.data as {isbn13?: string}).isbn13 === isbn13);
    if (same) throw new Error(`This ISBN already has a file: ${same.path}`);
  }

  const edition = isbn13 ? await openLibrary<Edition>(`/isbn/${isbn13}.json`) : null;
  if (isbn13 && !edition) console.log("Open Library does not know this ISBN. Fill the facts with the options below.");

  const authors = values.author ?? (edition ? await authorsOf(edition) : []);
  const title = values.title ?? edition?.title;
  if (!title || authors.length === 0) throw new Error(`A book needs a title and an author.\n${usage}`);

  const year = values.year ? Number(values.year) : Number(edition?.publish_date?.match(/(1[89]\d\d|20\d\d)/)?.[1]) || null;
  const pages = values.pages ? Number(values.pages) : (edition?.number_of_pages ?? null);
  const publisher = values.publisher ?? edition?.publishers?.[0] ?? null;
  const categories = (values.category ?? []) as (typeof BOOK_CATEGORIES)[number][];
  const source = values.source ?? (edition ? "open-library" : null);
  if (!source) throw new Error(`Say where the facts come from with --source: a URL or "physical-book".\n${usage}`);

  const needsCheck: Book["needsCheck"] = [];
  if (!publisher) needsCheck.push("publisher");
  if (!year) needsCheck.push("year");
  if (!pages) needsCheck.push("pages");
  if (categories.length === 0) needsCheck.push("categories");

  const seed = isbn13 ?? bookKey(title, authors[0]);
  const book = bookSchema.parse({
    id: `bk_${createHash("sha1").update(seed).digest("hex").slice(0, 16)}`,
    title,
    subtitle: values.subtitle ?? edition?.subtitle ?? null,
    authors,
    publisher,
    year,
    isbn13,
    pages,
    language: "id",
    categories: categories.length ? categories : ["Lainnya"],
    reviewed: false,
    needsCheck,
    sources: [source],
    openLibrary: edition
      ? {work: olKey(edition.works?.[0]?.key), edition: olKey(edition.key), coverId: edition.covers?.find((c) => c > 0) ?? null}
      : null,
  });

  const path = writeBook(book);
  console.log(`Wrote ${path}`);
  if (needsCheck.length) console.log(`Still to fill or check: ${needsCheck.join(", ")}`);
  console.log(`Categories: ${BOOK_CATEGORIES.join(", ")}`);
  console.log("Check it against the book, then run: npm run validate");
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});

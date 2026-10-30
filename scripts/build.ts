// Builds dist/: the static API, the downloads and the site. GitHub Pages serves it as is.
//
//   npm run build

import {cpSync, mkdirSync, rmSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {DatabaseSync} from "node:sqlite";

import {loadBookFiles, ROOT} from "./book-file.ts";
import {isbn13To10} from "./isbn.ts";
import {BOOK_CATEGORIES, bookSchema} from "./schema.ts";
import type {Book} from "./schema.ts";
import {normalizeSearchText, slugify} from "./text.ts";
import {loadAliases, validateFiles} from "./validate.ts";

const DIST = join(ROOT, "dist");

const coverUrl = (book: Book) =>
  book.openLibrary?.coverId ? `https://covers.openlibrary.org/b/id/${book.openLibrary.coverId}-M.jpg` : null;

const openLibraryUrl = (book: Book) => {
  const key = book.openLibrary?.edition
    ? `books/${book.openLibrary.edition}`
    : book.openLibrary?.work
      ? `works/${book.openLibrary.work}`
      : null;
  return key ? `https://openlibrary.org/${key}` : null;
};

/** What the API returns for a book: the file's fields and a few derived ones. */
export function publicBook(book: Book) {
  return {
    ...book,
    isbn10: book.isbn13 ? isbn13To10(book.isbn13) : null,
    coverUrl: coverUrl(book),
    openLibraryUrl: openLibraryUrl(book),
  };
}

function summary(book: Book) {
  return {
    id: book.id,
    title: book.title,
    authors: book.authors,
    year: book.year,
    isbn13: book.isbn13,
    categories: book.categories,
    reviewed: book.reviewed,
    coverUrl: coverUrl(book),
  };
}

/** Compact rows for the search box of the site. */
function searchRow(book: Book) {
  return {
    i: book.id,
    t: book.title,
    s: book.subtitle,
    a: book.authors,
    p: book.publisher,
    y: book.year,
    b: book.isbn13,
    c: book.categories,
    r: book.reviewed,
    v: book.openLibrary?.coverId ?? null,
  };
}

/** Readers should see the checked books first, in a stable order. */
export function sortBooks(books: Book[]): Book[] {
  return [...books].sort(
    (a, b) =>
      Number(b.reviewed) - Number(a.reviewed) ||
      normalizeSearchText(a.title).localeCompare(normalizeSearchText(b.title)) ||
      a.id.localeCompare(b.id),
  );
}

function groupBySlug(books: Book[], namesOf: (book: Book) => readonly string[]) {
  const groups = new Map<string, {spellings: Map<string, number>; books: Book[]}>();
  for (const book of books) {
    for (const name of new Set(namesOf(book))) {
      const slug = slugify(name);
      if (!slug) continue;
      const group = groups.get(slug) ?? {spellings: new Map<string, number>(), books: [] as Book[]};
      group.spellings.set(name, (group.spellings.get(name) ?? 0) + 1);
      group.books.push(book);
      groups.set(slug, group);
    }
  }
  // Two spellings of one slug are one name: the most frequent one wins.
  return [...groups.entries()].map(([slug, group]) => ({
    slug,
    name: [...group.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
    books: group.books,
  }));
}

export function buildStats(books: Book[]) {
  const decades: Record<string, number> = {};
  const categories: Record<string, number> = {};
  for (const book of books) {
    if (book.year) {
      const decade = `${Math.floor(book.year / 10) * 10}s`;
      decades[decade] = (decades[decade] ?? 0) + 1;
    }
    for (const category of book.categories) categories[category] = (categories[category] ?? 0) + 1;
  }
  return {
    books: books.length,
    reviewed: books.filter((b) => b.reviewed).length,
    withIsbn: books.filter((b) => b.isbn13).length,
    withCover: books.filter((b) => b.openLibrary?.coverId).length,
    needsCheck: books.filter((b) => b.needsCheck.length).length,
    authors: new Set(books.flatMap((b) => b.authors.map((a) => slugify(a)))).size,
    publishers: new Set(books.map((b) => b.publisher && slugify(b.publisher)).filter(Boolean)).size,
    categories,
    decades: Object.fromEntries(Object.entries(decades).sort(([a], [b]) => a.localeCompare(b))),
  };
}

const CSV_COLUMNS = [
  "id", "title", "subtitle", "authors", "publisher", "year", "isbn13", "isbn10", "pages", "language",
  "categories", "reviewed", "needs_check", "sources", "open_library_work", "open_library_edition", "cover_id", "cover_url",
];

/** One CSV cell. A leading = + - @ is neutralized so spreadsheets do not run it as a formula. */
export function csvCell(value: string | number | boolean | null): string {
  if (value === null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function booksCsv(books: Book[]): string {
  const rows = books.map((book) =>
    [
      book.id,
      book.title,
      book.subtitle,
      book.authors.join("; "),
      book.publisher,
      book.year,
      book.isbn13,
      book.isbn13 ? isbn13To10(book.isbn13) : null,
      book.pages,
      book.language,
      book.categories.join("; "),
      book.reviewed,
      book.needsCheck.join("; "),
      book.sources.join("; "),
      book.openLibrary?.work ?? null,
      book.openLibrary?.edition ?? null,
      book.openLibrary?.coverId ?? null,
      coverUrl(book),
    ]
      .map(csvCell)
      .join(","),
  );
  return `${[CSV_COLUMNS.join(","), ...rows].join("\n")}\n`;
}

function writeSqlite(path: string, books: Book[]): void {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      publisher TEXT,
      year INTEGER,
      isbn13 TEXT,
      isbn10 TEXT,
      pages INTEGER,
      language TEXT NOT NULL,
      reviewed INTEGER NOT NULL,
      open_library_work TEXT,
      open_library_edition TEXT,
      cover_url TEXT
    );
    CREATE TABLE book_authors (book_id TEXT NOT NULL REFERENCES books(id), position INTEGER NOT NULL, name TEXT NOT NULL);
    CREATE TABLE book_categories (book_id TEXT NOT NULL REFERENCES books(id), position INTEGER NOT NULL, name TEXT NOT NULL);
    CREATE INDEX books_isbn13 ON books(isbn13);
    CREATE INDEX book_authors_name ON book_authors(name);
    CREATE INDEX book_categories_name ON book_categories(name);
  `);
  const insertBook = db.prepare("INSERT INTO books VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
  const insertAuthor = db.prepare("INSERT INTO book_authors VALUES (?,?,?)");
  const insertCategory = db.prepare("INSERT INTO book_categories VALUES (?,?,?)");
  db.exec("BEGIN");
  for (const book of books) {
    insertBook.run(
      book.id,
      book.title,
      book.subtitle,
      book.publisher,
      book.year,
      book.isbn13,
      book.isbn13 ? isbn13To10(book.isbn13) : null,
      book.pages,
      book.language,
      book.reviewed ? 1 : 0,
      book.openLibrary?.work ?? null,
      book.openLibrary?.edition ?? null,
      coverUrl(book),
    );
    book.authors.forEach((name, position) => insertAuthor.run(book.id, position, name));
    book.categories.forEach((name, position) => insertCategory.run(book.id, position, name));
  }
  db.exec("COMMIT");
  db.exec("VACUUM");
  db.close();
}

function writeJson(path: string, data: unknown): void {
  const full = join(DIST, path);
  mkdirSync(dirname(full), {recursive: true});
  writeFileSync(full, JSON.stringify(data));
}

function main(): void {
  const files = loadBookFiles();
  const errors = validateFiles(files, loadAliases()).filter((p) => p.level === "error");
  if (errors.length) {
    for (const {file, line, message} of errors) console.error(`${file}:${line} ${message}`);
    throw new Error(`${errors.length} errors. Run npm run validate.`);
  }
  const books = sortBooks(files.map((file) => bookSchema.parse(file.data)));

  rmSync(DIST, {recursive: true, force: true});
  cpSync(join(ROOT, "site"), DIST, {recursive: true});
  writeFileSync(join(DIST, ".nojekyll"), "");

  for (const book of books) {
    const data = publicBook(book);
    writeJson(`api/v1/books/${book.id}.json`, data);
    if (book.isbn13) writeJson(`api/v1/isbn/${book.isbn13}.json`, data);
    if (data.isbn10) writeJson(`api/v1/isbn/${data.isbn10}.json`, data);
  }

  const authors = groupBySlug(books, (book) => book.authors);
  writeJson(
    "api/v1/authors.json",
    authors
      .map(({slug, name, books: list}) => ({slug, name, books: list.length}))
      .sort((a, b) => b.books - a.books || a.name.localeCompare(b.name)),
  );
  for (const {slug, name, books: list} of authors) {
    writeJson(`api/v1/authors/${slug}.json`, {slug, name, books: list.map(summary)});
  }

  const categories = groupBySlug(books, (book) => book.categories);
  const order = (name: string) => BOOK_CATEGORIES.indexOf(name as (typeof BOOK_CATEGORIES)[number]);
  writeJson(
    "api/v1/categories.json",
    categories
      .map(({slug, name, books: list}) => ({slug, name, books: list.length}))
      .sort((a, b) => order(a.name) - order(b.name)),
  );
  for (const {slug, name, books: list} of categories) {
    writeJson(`api/v1/categories/${slug}.json`, {slug, name, books: list.map(summary)});
  }

  writeJson("api/v1/search-index.json", books.map(searchRow));
  const stats = buildStats(books);
  writeJson("api/v1/stats.json", stats);
  writeJson("api/v1/index.json", {
    name: "Buku Indonesia",
    docs: "https://github.com/khrlanamm/buku-indonesia#api",
    books: "books/{id}.json",
    isbn: "isbn/{isbn}.json",
    authors: "authors.json",
    author: "authors/{slug}.json",
    categories: "categories.json",
    category: "categories/{slug}.json",
    searchIndex: "search-index.json",
    stats: "stats.json",
    license: "CC0-1.0",
  });

  writeJson("downloads/books.json", books.map(publicBook));
  writeFileSync(join(DIST, "downloads/books.csv"), booksCsv(books));
  writeSqlite(join(DIST, "downloads/books.sqlite"), books);

  console.log(`Built dist/: ${stats.books} books, ${authors.length} authors, ${categories.length} categories`);
}

if (import.meta.main ?? process.argv[1]?.endsWith("build.ts")) main();

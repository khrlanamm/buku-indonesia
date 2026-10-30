// Reading and writing the files under data/books/.

import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, join, relative, resolve} from "node:path";

import {LineCounter, Document, isNode, parseDocument, visit} from "yaml";

import type {Book} from "./schema.ts";
import {slugify} from "./text.ts";

export const ROOT = resolve(import.meta.dirname, "..");
export const BOOKS_DIR = join(ROOT, "data/books");
export const ALIASES_FILE = join(ROOT, "data/publisher-aliases.yaml");

/** One parsed file, with what is needed to point at a line in it. */
export interface BookFile {
  /** Path from the repo root, with forward slashes. */
  path: string;
  data: unknown;
  /** Line of a field path such as ["authors", 0], 1 when unknown. */
  lineOf: (path: readonly PropertyKey[]) => number;
  /** YAML syntax problems and comments found in the file. */
  syntax: {line: number; message: string}[];
}

export function parseBookFile(path: string, source: string): BookFile {
  const lineCounter = new LineCounter();
  const doc = parseDocument(source, {lineCounter, prettyErrors: false});
  const lineAt = (offset: number) => lineCounter.linePos(offset).line;

  const syntax = [...doc.errors, ...doc.warnings].map((problem) => ({
    line: lineAt(problem.pos[0]),
    message: problem.message,
  }));
  // A comment is how "title: Laskar Pelangi #2" silently loses its end.
  if (doc.comment || doc.commentBefore) syntax.push({line: 1, message: commentMessage()});
  visit(doc, (_key, node) => {
    if (isNode(node) && (node.comment || node.commentBefore)) {
      syntax.push({line: node.range ? lineAt(node.range[0]) : 1, message: commentMessage()});
    }
  });

  return {
    path,
    data: doc.toJS(),
    syntax,
    lineOf: (fieldPath) => {
      const node = doc.getIn(fieldPath as Iterable<unknown>, true);
      return isNode(node) && node.range ? lineAt(node.range[0]) : 1;
    },
  };
}

function commentMessage(): string {
  return 'Found a YAML comment. A # in unquoted text starts a comment and cuts the value. Remove the comment, or put the text in double quotes.';
}

/** Every file under data/books/, sorted by path so runs are repeatable. */
export function bookFilePaths(): string[] {
  const paths: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".yaml")) paths.push(full);
    }
  };
  if (existsSync(BOOKS_DIR)) walk(BOOKS_DIR);
  return paths.sort();
}

export function loadBookFiles(): BookFile[] {
  return bookFilePaths().map((full) =>
    parseBookFile(relative(ROOT, full).split("\\").join("/"), readFileSync(full, "utf8")),
  );
}

/** Where a new book goes. The slug only helps people browse: only the id suffix is checked. */
export function bookPath(book: Pick<Book, "id" | "title" | "authors">): string {
  const slug = slugify(`${book.authors[0] ?? ""} ${book.title}`) || "buku";
  return `data/books/${slug[0]}/${slug}--${book.id}.yaml`;
}

/** The YAML text of a book: every string quoted, no folding, fields in schema order. */
export function bookYaml(book: Book): string {
  const doc = new Document(book);
  return doc.toString({lineWidth: 0, defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN", flowCollectionPadding: false, collectionStyle: "block"});
}

/** Writes a book to its path and returns that path. */
export function writeBook(book: Book): string {
  const path = bookPath(book);
  const full = join(ROOT, path);
  mkdirSync(dirname(full), {recursive: true});
  writeFileSync(full, bookYaml(book));
  return path;
}

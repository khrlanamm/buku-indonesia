// Checks every book file. Errors fail CI; warnings ask a person to look.
//
//   npm run validate
//
// In GitHub Actions the messages become annotations on the changed lines.

import {existsSync, readFileSync} from "node:fs";

import {parse} from "yaml";

import {ALIASES_FILE, loadBookFiles} from "./book-file.ts";
import type {BookFile} from "./book-file.ts";
import {bookSchema} from "./schema.ts";
import {bookKey} from "./text.ts";

export interface Problem {
  level: "error" | "warning";
  file: string;
  line: number;
  message: string;
}

/** Alias to official publisher name, keyed by the alias. */
export function loadAliases(): Record<string, string> {
  if (!existsSync(ALIASES_FILE)) return {};
  return (parse(readFileSync(ALIASES_FILE, "utf8")) ?? {}) as Record<string, string>;
}

export function validateFiles(files: BookFile[], aliases: Record<string, string>): Problem[] {
  const problems: Problem[] = [];
  const error = (file: BookFile, line: number, message: string) =>
    problems.push({level: "error", file: file.path, line, message});
  const warn = (file: BookFile, line: number, message: string) =>
    problems.push({level: "warning", file: file.path, line, message});

  const byId = new Map<string, BookFile>();
  const byIsbn = new Map<string, BookFile>();
  const byKey = new Map<string, BookFile>();

  for (const file of files) {
    for (const {line, message} of file.syntax) error(file, line, message);

    const parsed = bookSchema.safeParse(file.data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        error(file, file.lineOf(issue.path), `${issue.path.join(".") || "file"}: ${issue.message}`);
      }
      continue;
    }
    const book = parsed.data;

    if (!file.path.endsWith(`--${book.id}.yaml`)) {
      error(file, file.lineOf(["id"]), `The file name must end with --${book.id}.yaml so it matches the id.`);
    }

    const sameId = byId.get(book.id);
    if (sameId) error(file, file.lineOf(["id"]), `This id is already used by ${sameId.path}.`);
    byId.set(book.id, file);

    if (book.isbn13) {
      const sameIsbn = byIsbn.get(book.isbn13);
      if (sameIsbn) error(file, file.lineOf(["isbn13"]), `This ISBN is already used by ${sameIsbn.path}. One file per edition.`);
      byIsbn.set(book.isbn13, file);
    }

    if (book.publisher && aliases[book.publisher]) {
      error(file, file.lineOf(["publisher"]), `Use the official name "${aliases[book.publisher]}" instead of "${book.publisher}".`);
    }

    // Two books can share a title and an author, so this only asks for a look.
    const key = bookKey(book.title, book.authors[0]);
    const sameKey = byKey.get(key);
    if (sameKey) warn(file, file.lineOf(["title"]), `Same title and first author as ${sameKey.path}. Fine if they are different editions or books.`);
    byKey.set(key, file);

    if (book.pages != null && (book.pages < 30 || book.pages > 2000)) {
      warn(file, file.lineOf(["pages"]), `${book.pages} pages looks unusual. Check it against the book.`);
    }
  }
  return problems;
}

function report(problems: Problem[]): void {
  const inActions = !!process.env.GITHUB_ACTIONS;
  for (const {level, file, line, message} of problems) {
    if (inActions) console.log(`::${level} file=${file},line=${line}::${message.replace(/\n/g, " ")}`);
    else console.log(`${level === "error" ? "ERROR" : "warn "} ${file}:${line} ${message}`);
  }
}

if (import.meta.main ?? process.argv[1]?.endsWith("validate.ts")) {
  const files = loadBookFiles();
  const problems = validateFiles(files, loadAliases());
  report(problems);
  const errors = problems.filter((p) => p.level === "error").length;
  console.log(`${files.length} books, ${errors} errors, ${problems.length - errors} warnings`);
  if (errors) process.exitCode = 1;
}

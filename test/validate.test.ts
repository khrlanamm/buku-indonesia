import assert from "node:assert/strict";
import {test} from "node:test";

import {bookPath, bookYaml, parseBookFile} from "../scripts/book-file.ts";
import type {Book} from "../scripts/schema.ts";
import {validateFiles} from "../scripts/validate.ts";

const book: Book = {
  id: "bk_d08a4591e6bed608",
  title: "Bumi Manusia",
  subtitle: null,
  authors: ["Pramoedya Ananta Toer"],
  publisher: "Hasta Mitra",
  year: 1980,
  isbn13: "9786020324784",
  pages: 535,
  language: "id",
  categories: ["Novel"],
  reviewed: true,
  needsCheck: [],
  sources: ["open-library"],
  openLibrary: {work: "OL123W", edition: "OL456M", coverId: 789},
};

const path = bookPath(book);

function check(yaml: string, filePath = path, aliases: Record<string, string> = {}) {
  return validateFiles([parseBookFile(filePath, yaml)], aliases);
}

const errors = (yaml: string, filePath = path, aliases: Record<string, string> = {}) =>
  check(yaml, filePath, aliases).filter((p) => p.level === "error");

test("a written book passes and reads back the same", () => {
  const yaml = bookYaml(book);
  assert.deepEqual(check(yaml), []);
  assert.deepEqual(parseBookFile(path, yaml).data, book);
});

test("quotes values that YAML would otherwise read as something else", () => {
  const tricky: Book = {...book, title: "1998 #2: no", subtitle: "yes", publisher: "null"};
  const yaml = bookYaml(tricky);
  assert.deepEqual(parseBookFile(path, yaml).data, tricky);
  assert.deepEqual(check(yaml), []);
});

test("the book path uses the first letter of the slug and ends with the id", () => {
  assert.equal(path, "data/books/p/pramoedya-ananta-toer-bumi-manusia--bk_d08a4591e6bed608.yaml");
});

test("a wrong ISBN check digit fails on its line", () => {
  const yaml = bookYaml({...book, isbn13: "9786020324785"});
  const [problem] = errors(yaml);
  assert.match(problem.message, /check digit/);
  assert.equal(problem.line, yaml.split("\n").findIndex((l) => l.startsWith("isbn13")) + 1);
});

test("an unquoted # that cuts a title fails", () => {
  const yaml = bookYaml(book).replace('title: "Bumi Manusia"', "title: Laskar Pelangi #2");
  assert.ok(errors(yaml).some((p) => /comment/.test(p.message)));
});

test("a title read as a number fails", () => {
  const yaml = bookYaml(book).replace('title: "Bumi Manusia"', "title: 1998");
  assert.ok(errors(yaml).some((p) => p.message.startsWith("title:")));
});

test("angle brackets in text fail", () => {
  assert.ok(errors(bookYaml({...book, title: "Buku <b>Tebal</b>"})).some((p) => /< or >/.test(p.message)));
});

test("a known publisher alias fails and names the official spelling", () => {
  const yaml = bookYaml({...book, publisher: "PT Elex Media Komputindo"});
  const [problem] = errors(yaml, path, {"PT Elex Media Komputindo": "Elex Media Komputindo"});
  assert.match(problem.message, /"Elex Media Komputindo"/);
});

test("a file name that does not end with the id fails", () => {
  const [problem] = errors(bookYaml(book), "data/books/p/bumi-manusia--bk_0000000000000000.yaml");
  assert.match(problem.message, /file name/);
});

test("the slug part of the file name may go stale", () => {
  assert.deepEqual(errors(bookYaml(book), `data/books/x/old-title--${book.id}.yaml`), []);
});

test("an unknown field fails", () => {
  assert.ok(errors(`${bookYaml(book)}description: "copied text"\n`).length > 0);
});

test("missing sources fail", () => {
  assert.ok(errors(bookYaml({...book, sources: []})).some((p) => p.message.startsWith("sources:")));
});

test("duplicate id and ISBN fail, across files", () => {
  const other = {...book, title: "Lain"};
  const problems = validateFiles(
    [parseBookFile(path, bookYaml(book)), parseBookFile(`data/books/l/lain--${book.id}.yaml`, bookYaml(other))],
    {},
  );
  assert.ok(problems.some((p) => /id is already used/.test(p.message)));
  assert.ok(problems.some((p) => /ISBN is already used/.test(p.message)));
});

test("same title and author only warns", () => {
  const other: Book = {...book, id: "bk_0000000000000001", isbn13: null};
  const problems = validateFiles(
    [parseBookFile(path, bookYaml(book)), parseBookFile(bookPath(other), bookYaml(other))],
    {},
  );
  assert.deepEqual(problems.map((p) => p.level), ["warning"]);
});

test("an unusual page count only warns", () => {
  assert.deepEqual(check(bookYaml({...book, pages: 12})).map((p) => p.level), ["warning"]);
});

test("null pages and needsCheck are allowed", () => {
  assert.deepEqual(check(bookYaml({...book, pages: null, needsCheck: ["pages"]})), []);
});

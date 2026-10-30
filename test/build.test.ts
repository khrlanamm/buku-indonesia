import assert from "node:assert/strict";
import {test} from "node:test";

import {booksCsv, buildStats, csvCell, publicBook, sortBooks} from "../scripts/build.ts";
import type {Book} from "../scripts/schema.ts";

const book: Book = {
  id: "bk_d08a4591e6bed608",
  title: "Bumi Manusia",
  subtitle: null,
  authors: ["Pramoedya Ananta Toer", "Penulis Kedua"],
  publisher: "Hasta Mitra",
  year: 1980,
  isbn13: "9786020618487",
  pages: 535,
  language: "id",
  categories: ["Novel", "Sastra Klasik"],
  reviewed: true,
  needsCheck: [],
  sources: ["open-library"],
  openLibrary: {work: "OL1W", edition: "OL2M", coverId: 42},
};

test("the API adds the ISBN-10, cover URL and Open Library URL", () => {
  const data = publicBook(book);
  assert.equal(data.isbn10, "602061848X");
  assert.equal(data.coverUrl, "https://covers.openlibrary.org/b/id/42-M.jpg");
  assert.equal(data.openLibraryUrl, "https://openlibrary.org/books/OL2M");
});

test("a book without Open Library keys has no derived links", () => {
  const data = publicBook({...book, isbn13: null, openLibrary: null});
  assert.equal(data.isbn10, null);
  assert.equal(data.coverUrl, null);
  assert.equal(data.openLibraryUrl, null);
});

test("reviewed books come first, then by title", () => {
  const sorted = sortBooks([
    {...book, id: "bk_1", title: "Zaman", reviewed: true},
    {...book, id: "bk_2", title: "Awal", reviewed: false},
    {...book, id: "bk_3", title: "Bumi", reviewed: true},
  ]);
  assert.deepEqual(sorted.map((b) => b.id), ["bk_3", "bk_1", "bk_2"]);
});

test("CSV quotes what needs quoting and neutralizes formulas", () => {
  assert.equal(csvCell('Kata "dalam", kutip'), '"Kata ""dalam"", kutip"');
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(1980), "1980");
});

test("the CSV has one header and one row per book, with lists joined", () => {
  const lines = booksCsv([book]).trim().split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^id,title,subtitle,authors,/);
  assert.match(lines[1], /Pramoedya Ananta Toer; Penulis Kedua/);
  assert.equal(lines[0].split(",").length, lines[1].split(",").length);
});

test("stats count books, authors and decades", () => {
  const stats = buildStats([book, {...book, id: "bk_2", reviewed: false, year: 2015, isbn13: null, openLibrary: null}]);
  assert.equal(stats.books, 2);
  assert.equal(stats.reviewed, 1);
  assert.equal(stats.withIsbn, 1);
  assert.equal(stats.withCover, 1);
  assert.equal(stats.authors, 2);
  assert.deepEqual(stats.decades, {"1980s": 1, "2010s": 1});
  assert.equal(stats.categories.Novel, 2);
});

import assert from "node:assert/strict";
import {test} from "node:test";

import {bookKey, normalizeSearchText, slugify} from "../scripts/text.ts";

test("normalizes accents, case and punctuation", () => {
  assert.equal(normalizeSearchText("Bumi Manusia: Édisi Revisi!"), "bumi manusia edisi revisi");
});

test("builds the book key from title and first author", () => {
  assert.equal(bookKey("Laskar Pelangi", "Andrea Hirata"), "laskar pelangi|andrea hirata");
});

test("slugs stay short and do not end inside a word when possible", () => {
  assert.equal(slugify("Tere Liye Pulang"), "tere-liye-pulang");
  const long = slugify("kata ".repeat(40));
  assert.ok(long.length <= 80);
  assert.ok(!long.endsWith("-"));
  assert.ok(long.endsWith("kata"));
});

test("a slug with no letters or digits is empty", () => {
  assert.equal(slugify("!!!"), "");
});

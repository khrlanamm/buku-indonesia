import assert from "node:assert/strict";
import {test} from "node:test";

import {cleanIsbn, isbn10To13, isbn13To10, isValidIsbn10, isValidIsbn13, toIsbn13} from "../scripts/isbn.ts";

test("accepts a valid ISBN-13 and rejects a wrong check digit", () => {
  assert.equal(isValidIsbn13("9786020324784"), true);
  assert.equal(isValidIsbn13("9786020324785"), false);
  assert.equal(isValidIsbn13("978602032478"), false);
});

test("accepts a valid ISBN-10, including X", () => {
  assert.equal(isValidIsbn10("6020324788"), true);
  assert.equal(isValidIsbn10("602061848X"), true);
  assert.equal(isValidIsbn10("6020618481"), false);
});

test("converts between ISBN-13 and ISBN-10", () => {
  assert.equal(isbn13To10("9786020618487"), "602061848X");
  assert.equal(isbn10To13("602061848X"), "9786020618487");
});

test("a 979 ISBN-13 has no ISBN-10", () => {
  assert.equal(isbn13To10("9798888888882"), null);
});

test("reads written forms", () => {
  assert.equal(cleanIsbn("978-602-03-2478-4"), "9786020324784");
  assert.equal(toIsbn13("602-06-1848-x"), "9786020618487");
  assert.equal(toIsbn13("978-602-03-2478-5"), null);
});

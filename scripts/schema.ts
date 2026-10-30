// The shape of one book file. CONTRIBUTING.md explains every field.

import {z} from "zod";

import {isValidIsbn13} from "./isbn.ts";

/** Fixed categories, in display order. */
export const BOOK_CATEGORIES = [
  "Novel",
  "Sastra Klasik",
  "Remaja",
  "Puisi",
  "Kumpulan Cerpen",
  "Sejarah",
  "Biografi",
  "Agama",
  "Pengembangan Diri",
  "Sains",
  "Bisnis",
  "Komik",
  "Anak",
  "Nonfiksi Umum",
  "Lainnya",
] as const;

/** Fields a person can be asked to check. */
export const CHECKABLE_FIELDS = [
  "title",
  "subtitle",
  "authors",
  "publisher",
  "year",
  "isbn13",
  "pages",
  "categories",
] as const;

const NO_ANGLE_BRACKETS = "Must not contain < or >. Write the text without them.";

const text = (max: number) =>
  z
    .string({error: "Must be text. Put it in double quotes."})
    .trim()
    .min(1, "Must not be empty.")
    .max(max, `Must be at most ${max} characters.`)
    .refine((value) => !/[<>]/.test(value), NO_ANGLE_BRACKETS);

export const bookSchema = z.strictObject({
  id: z.string().regex(/^bk_[0-9a-f]{16}$/, 'Must look like "bk_" and 16 hex digits. npm run add writes one for you.'),
  title: text(200),
  subtitle: text(200).nullable(),
  authors: z.array(text(120)).min(1, "List at least one author.").max(5, "List at most five authors."),
  publisher: text(120).nullable(),
  year: z.number("Must be a year, or null.").int().min(1800).max(2100).nullable(),
  isbn13: z
    .string("Must be 13 digits in double quotes, or null.")
    .refine(isValidIsbn13, "This is not a valid ISBN-13: its check digit does not match. Check the number on the book.")
    .nullable(),
  pages: z.number("Must be a page count, or null.").int().min(1).max(10000).nullable(),
  language: z.string().regex(/^[a-z]{2,3}$/, 'Must be a language code such as "id".'),
  categories: z.array(z.enum(BOOK_CATEGORIES, `Must be one of: ${BOOK_CATEGORIES.join(", ")}.`)).min(1).max(3),
  reviewed: z.boolean(),
  needsCheck: z.array(z.enum(CHECKABLE_FIELDS)),
  sources: z.array(text(300)).min(1, 'Say where the facts come from: a URL, "open-library", or "physical-book".'),
  openLibrary: z
    .strictObject({
      work: z.string().regex(/^OL\d+W$/).nullable(),
      edition: z.string().regex(/^OL\d+M$/).nullable(),
      coverId: z.number().int().positive().nullable(),
    })
    .nullable(),
});

export type Book = z.infer<typeof bookSchema>;

# Buku Indonesia

Open data for Indonesian books: more than 3,000 records with title, author, publisher, year, ISBN, and page count. Use it as a static JSON API, or download it as CSV, JSON, or SQLite. No API key, no server, no cost.

**[Search the catalog](https://khrlanamm.github.io/buku-indonesia/)** | [API](#api) | [Downloads](#downloads) | [Contribute](#contribute) | [Bahasa Indonesia](README.id.md)

[![CI](https://github.com/khrlanamm/buku-indonesia/actions/workflows/ci.yml/badge.svg)](https://github.com/khrlanamm/buku-indonesia/actions/workflows/ci.yml)
[![Data: CC0](https://img.shields.io/badge/data-CC0-blue)](data/LICENSE)
[![Code: MIT](https://img.shields.io/badge/code-MIT-blue)](LICENSE)

<p>
  <img src="https://covers.openlibrary.org/b/id/14840998-M.jpg" alt="Bumi Manusia" height="150">
  <img src="https://covers.openlibrary.org/b/id/7079796-M.jpg" alt="Laskar Pelangi" height="150">
  <img src="https://covers.openlibrary.org/b/id/14330869-M.jpg" alt="Cantik Itu Luka" height="150">
  <img src="https://covers.openlibrary.org/b/id/14303993-M.jpg" alt="Negeri 5 Menara" height="150">
  <img src="https://covers.openlibrary.org/b/id/4317176-M.jpg" alt="Ronggeng Dukuh Paruk" height="150">
  <img src="https://covers.openlibrary.org/b/id/15094936-M.jpg" alt="Pulang" height="150">
</p>

Good book data in English is easy to find. Good data for Indonesian editions is not. This repo collects it in the open, as plain files anyone can read, fix, and reuse, for a reading app, a class project, a thesis, or a school library.

## Quick start

```sh
curl https://khrlanamm.github.io/buku-indonesia/api/v1/isbn/9789799731234.json
```

```js
const response = await fetch("https://khrlanamm.github.io/buku-indonesia/api/v1/authors/tere-liye.json");
const {name, books} = await response.json();
console.log(`${name} has ${books.length} books here`);
```

```dart
final response = await http.get(Uri.parse(
  'https://khrlanamm.github.io/buku-indonesia/api/v1/isbn/9789799731234.json',
));
final book = jsonDecode(response.body);
print('${book['title']}, ${book['pages']} pages');
```

## API

Base URL: `https://khrlanamm.github.io/buku-indonesia/api/v1/`

| Endpoint | Returns |
|---|---|
| `isbn/{isbn}.json` | One book, by ISBN-13 or ISBN-10, digits only |
| `books/{id}.json` | One book, by ID |
| `authors.json` | Every author with a book count, most books first |
| `authors/{slug}.json` | One author and their books |
| `categories.json` | Every category with a book count |
| `categories/{slug}.json` | One category and its books |
| `search-index.json` | Compact rows of every book, for searching in the browser |
| `stats.json` | Totals, categories, and decades |

These are static files on GitHub Pages, so any website can call them directly (`Access-Control-Allow-Origin: *`). A book that is not here returns HTTP 404.

A book looks like this:

```json
{
  "id": "bk_b4a005e3558d0371",
  "title": "Bumi Manusia",
  "subtitle": null,
  "authors": ["Pramoedya Ananta Toer"],
  "publisher": "Lentera Dipantara",
  "year": 2005,
  "isbn13": "9789799731234",
  "pages": 535,
  "language": "id",
  "categories": ["Sastra Klasik", "Novel", "Sejarah"],
  "reviewed": true,
  "needsCheck": ["pages"],
  "sources": ["open-library"],
  "openLibrary": {"work": "OL307247W", "edition": "OL37283586M", "coverId": 14840998},
  "isbn10": "9799731232",
  "coverUrl": "https://covers.openlibrary.org/b/id/14840998-M.jpg",
  "openLibraryUrl": "https://openlibrary.org/books/OL37283586M"
}
```

## Downloads

| File | Good for |
|---|---|
| [books.csv](https://khrlanamm.github.io/buku-indonesia/downloads/books.csv) | Spreadsheets and data analysis |
| [books.json](https://khrlanamm.github.io/buku-indonesia/downloads/books.json) | Apps and scripts |
| [books.sqlite](https://khrlanamm.github.io/buku-indonesia/downloads/books.sqlite) | Offline apps. Tables: `books`, `book_authors`, `book_categories` |

```sql
SELECT b.title, b.year
FROM books b
JOIN book_authors a ON a.book_id = b.id
WHERE a.name = 'Tere Liye'
ORDER BY b.year DESC;
```

## About the data

- **`reviewed: true`** means the record is part of the curated catalog of the [Sabu Saku](https://sabusaku.web.app) reading app. About half of the records are.
- **`reviewed: false`** means it came from Open Library and passed automatic filters and a title check, but nobody checked it record by record. Expect more mistakes here.
- **`needsCheck`** lists fields nobody has confirmed. A value may be missing or may belong to another edition. These are the easiest places to help.
- **Categories** are one to three of 15 fixed labels. Some records still say `Lainnya` (other) because their category is not known yet.

Facts come from Open Library, Wikipedia infoboxes, and hand checks. Records whose only source was the Google Books API were left out, because its terms do not allow building a database from it.

There are no synopses and no cover files here. Those belong to their authors and publishers. `coverUrl` points to Open Library, which hosts the image and asks that bulk downloads use [its dumps](https://openlibrary.org/dev/docs/api/covers) instead of that URL.

This is far from complete. Indonesia's National Library [counted more than 728,000 ISBNs by 2023](https://tirto.id/apa-itu-krisis-isbn-dan-benarkah-terjadi-di-indonesia-gSNM). Coverage is best for popular reading and weak for textbooks and small presses.

## Contribute

You can help with no code at all: [suggest a book](https://github.com/khrlanamm/buku-indonesia/issues/new?template=tambah-buku.yml) or [report a mistake](https://github.com/khrlanamm/buku-indonesia/issues/new?template=koreksi-data.yml).

Each book is one small YAML file, so a first pull request is easy:

```sh
npm ci
npm run add -- 978XXXXXXXXXX
npm run validate
```

Issues labeled [`good first issue`](https://github.com/khrlanamm/buku-indonesia/labels/good%20first%20issue) are ready to pick up. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Host your own copy

1. Fork this repo.
2. On your fork, open the Actions tab and enable workflows.
3. In Settings, Pages, set the source to GitHub Actions.
4. Run the `Pages` workflow from the Actions tab.

Your copy appears at `https://<your-name>.github.io/buku-indonesia/`. Every URL on the site is relative, so it works under any path.

To build locally, you need Node 22.18 or newer:

```sh
npm ci
npm run build
npm run serve
```

## License and credits

The data in `data/` is dedicated to the public domain under [CC0 1.0](data/LICENSE). The code is under the [MIT license](LICENSE). A link back is welcome but not required.

Most of the data comes from [Open Library](https://openlibrary.org), a project of the Internet Archive. Cover images stay the property of their owners.

Started from the catalog of [Sabu Saku](https://sabusaku.web.app) by [Khoirul Anam](https://anamcode.space).

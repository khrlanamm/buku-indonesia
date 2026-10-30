# Contributing

Thank you for helping. Panduan singkat berbahasa Indonesia ada di [README.id.md](README.id.md#bantu-lengkapi).

No coding needed? Use the forms: [suggest a book](https://github.com/khrlanamm/buku-indonesia/issues/new?template=tambah-buku.yml) or [report a mistake](https://github.com/khrlanamm/buku-indonesia/issues/new?template=koreksi-data.yml). Those issues are labeled `good first issue`, so anyone can turn them into a pull request.

## The one rule

Facts only. A title, author, publisher, year, ISBN, and page count are facts. A synopsis, a back-cover blurb, and a cover image belong to their authors and publishers, so they do not go in this repo, even with a credit.

Good sources are the book in your hands, the publisher's page, a library catalogue, and Open Library. Do not script against the Google Books API or scrape stores: their terms do not allow it.

## Add a book

You need Node 22.18 or newer.

```sh
git clone https://github.com/<your-name>/buku-indonesia.git
cd buku-indonesia
npm ci
npm run add -- 978XXXXXXXXXX
```

`npm run add` fills what Open Library knows and writes one file. If Open Library has no record, pass the facts yourself:

```sh
npm run add -- 978XXXXXXXXXX --title "Judul" --author "Nama Penulis" --publisher "Penerbit" --year 2021 --pages 320 --category Novel --source physical-book
```

Then open the file, check it against the book, and run:

```sh
npm run validate
```

Open a pull request. CI runs the same check and marks any problem on the exact line.

## Fix a book

Find the book on the [site](https://khrlanamm.github.io/buku-indonesia/), open its JSON to get its `id`, and edit the file whose name ends with that id. Change the facts, add your source to `sources`, and remove what you checked from `needsCheck`.

Keep the `id` as it is. The rest of the file name may go out of date, and that is fine.

## Fields

| Field | Meaning |
|---|---|
| `id` | Permanent ID. `npm run add` writes it. Never change it |
| `title`, `subtitle` | As printed on this edition |
| `authors` | One to five writers. Translators and editors do not count |
| `publisher` | Official name. CI tells you when a spelling has a preferred form |
| `year` | Year this edition was published, not the first edition |
| `isbn13` | 13 digits in quotes, or `null` when the book has none |
| `pages` | Page count of this edition, or `null` when unknown |
| `language` | Language code, `"id"` for Indonesian |
| `categories` | One to three of: Novel, Sastra Klasik, Remaja, Puisi, Kumpulan Cerpen, Sejarah, Biografi, Agama, Pengembangan Diri, Sains, Bisnis, Komik, Anak, Nonfiksi Umum, Lainnya |
| `reviewed` | Leave `false`. A maintainer sets it after a check |
| `needsCheck` | Fields nobody has confirmed yet. Good places to help |
| `sources` | Where the facts come from: a URL, `"open-library"`, `"physical-book"`, or `"hand-checked"` |
| `openLibrary` | Open Library keys and cover ID, or `null` |

One file per edition: two editions of a book with different ISBNs get two files. Two different books can share a title and an author, so CI only warns about that.

## Common errors

| Message | What to do |
|---|---|
| Found a YAML comment | A `#` in unquoted text cuts the value. Put the text in double quotes |
| Must be text | The value was read as a number or a boolean. Put it in double quotes |
| Its check digit does not match | The ISBN has a typo. Compare it with the book |
| The file name must end with | The file name and `id` differ. Fix the file name, not the `id` |
| Must not contain < or > | Remove them from the text |

## Changing the code

```sh
npm run typecheck
npm test
npm run build
npm run serve
```

`scripts/` runs directly on Node with no build step. Keep dependencies few, and keep every URL on the site relative, so forks work under any path.

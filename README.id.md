# Buku Indonesia

Data terbuka buku Indonesia: lebih dari 3.000 buku dengan judul, penulis, penerbit, tahun, ISBN, dan jumlah halaman. Bisa dipakai sebagai API JSON statis, atau diunduh sebagai CSV, JSON, dan SQLite. Tanpa API key, tanpa server, gratis.

**[Cari buku](https://khrlanamm.github.io/buku-indonesia/)** | [API](#api) | [Unduh](#unduh) | [Bantu lengkapi](#bantu-lengkapi) | [English](README.md)

Data buku berbahasa Inggris mudah dicari, tapi data edisi Indonesia tidak. Repo ini mengumpulkannya secara terbuka sebagai file biasa yang bisa dibaca, diperbaiki, dan dipakai ulang oleh siapa saja: untuk aplikasi baca, tugas kuliah, skripsi, atau perpustakaan sekolah.

## Coba langsung

```sh
curl https://khrlanamm.github.io/buku-indonesia/api/v1/isbn/9789799731234.json
```

```js
const response = await fetch("https://khrlanamm.github.io/buku-indonesia/api/v1/authors/tere-liye.json");
const {name, books} = await response.json();
console.log(`${name} punya ${books.length} buku di sini`);
```

## API

Alamat dasar: `https://khrlanamm.github.io/buku-indonesia/api/v1/`

| Endpoint | Isi |
|---|---|
| `isbn/{isbn}.json` | Satu buku, dari ISBN-13 atau ISBN-10, angka saja |
| `books/{id}.json` | Satu buku, dari ID |
| `authors.json` | Semua penulis dan jumlah bukunya |
| `authors/{slug}.json` | Satu penulis dan buku-bukunya |
| `categories.json` | Semua kategori dan jumlah bukunya |
| `categories/{slug}.json` | Satu kategori dan buku-bukunya |
| `search-index.json` | Ringkasan semua buku, untuk pencarian di browser |
| `stats.json` | Angka ringkas katalog |

Semua berupa file statis di GitHub Pages, jadi bisa langsung dipanggil dari website mana pun. Buku yang belum ada menghasilkan HTTP 404. Contoh isi datanya ada di [README bahasa Inggris](README.md#api).

## Unduh

| File | Cocok untuk |
|---|---|
| [books.csv](https://khrlanamm.github.io/buku-indonesia/downloads/books.csv) | Spreadsheet dan analisis data |
| [books.json](https://khrlanamm.github.io/buku-indonesia/downloads/books.json) | Aplikasi dan skrip |
| [books.sqlite](https://khrlanamm.github.io/buku-indonesia/downloads/books.sqlite) | Aplikasi offline |

## Tentang datanya

- **`reviewed: true`** berarti buku ini bagian dari katalog aplikasi [Sabu Saku](https://sabusaku.web.app) yang sudah dikurasi. Sekitar separuh data termasuk di sini.
- **`reviewed: false`** berarti buku ini dari Open Library dan lolos filter otomatis serta pengecekan judul, tapi belum dicek satu per satu. Kemungkinan salahnya lebih besar.
- **`needsCheck`** berisi field yang belum dipastikan. Nilainya bisa kosong atau milik edisi lain. Di sinilah bantuan paling mudah diberikan.

Tidak ada sinopsis dan file sampul di repo ini, karena itu milik penulis dan penerbitnya. Data ini juga jauh dari lengkap: Perpusnas [mencatat lebih dari 728 ribu ISBN sampai 2023](https://tirto.id/apa-itu-krisis-isbn-dan-benarkah-terjadi-di-indonesia-gSNM).

## Bantu lengkapi

**Tidak bisa coding?** Isi formulir [usulkan buku](https://github.com/khrlanamm/buku-indonesia/issues/new?template=tambah-buku.yml) atau [koreksi data](https://github.com/khrlanamm/buku-indonesia/issues/new?template=koreksi-data.yml). Tidak perlu memasang apa pun, cukup punya akun GitHub.

**Developer?** Satu buku adalah satu file YAML kecil, jadi cocok untuk pull request pertama:

1. Fork repo ini, lalu clone. Butuh Node 22.18 atau lebih baru.
2. Jalankan `npm ci`.
3. Jalankan `npm run add -- 978XXXXXXXXXX` dengan ISBN bukunya. Data awal diambil dari Open Library.
4. Buka file yang dibuat, cocokkan dengan bukunya, lalu isi `categories` dan `sources`.
5. Jalankan `npm run validate`, lalu buka pull request.

Satu aturan penting: **isi fakta saja**. Judul, penulis, penerbit, tahun, ISBN, dan jumlah halaman adalah fakta. Sinopsis, teks sampul belakang, dan gambar sampul milik penulis dan penerbit, jadi jangan disalin ke sini walau mencantumkan sumber.

Cari tugas yang siap dikerjakan di label [`good first issue`](https://github.com/khrlanamm/buku-indonesia/labels/good%20first%20issue). Penjelasan semua field ada di [CONTRIBUTING.md](CONTRIBUTING.md).

## Pasang salinan sendiri

1. Fork repo ini.
2. Di fork kamu, buka tab Actions dan aktifkan workflow.
3. Di Settings, Pages, pilih GitHub Actions sebagai sumber.
4. Jalankan workflow `Pages` dari tab Actions.

Hasilnya muncul di `https://<nama-kamu>.github.io/buku-indonesia/`.

## Lisensi dan kredit

Data di `data/` dilepas ke domain publik dengan [CC0 1.0](data/LICENSE). Kode memakai [lisensi MIT](LICENSE). Tautan balik sangat dihargai, tapi tidak wajib.

Sebagian besar data berasal dari [Open Library](https://openlibrary.org), proyek Internet Archive. Hak cipta gambar sampul tetap milik pemiliknya.

Dimulai dari katalog [Sabu Saku](https://sabusaku.web.app) oleh [Khoirul Anam](https://anamcode.space).

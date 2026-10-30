// Search and browse over api/v1/search-index.json. Text from the data only ever
// reaches the page through textContent, so a book file cannot inject markup.
// URLs are relative, so a fork works under any path.

const PAGE = 48;
const REPO = "https://github.com/khrlanamm/buku-indonesia";

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

const number = (value) => value.toLocaleString("id-ID");

/** Same rule as scripts/text.ts. */
const normalize = (raw) =>
  raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const state = {books: [], query: "", category: "", reviewedOnly: false, shown: PAGE, results: []};

/** A stable shuffle, so the first screen is varied and does not change between visits. */
function mixKey(id) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return hash;
}

function rank(book, terms, query) {
  const title = normalize(book.t);
  if (title === query) return 0;
  if (title.startsWith(query)) return 1;
  if (terms.every((term) => title.includes(term))) return 2;
  if (book.a.some((author) => normalize(author).includes(query))) return 3;
  return 4;
}

function runSearch() {
  const query = normalize(state.query);
  const terms = query ? query.split(" ") : [];
  const digits = state.query.replace(/[^0-9Xx]/g, "");

  let list = state.books.filter((book) => {
    if (state.category && !book.c.includes(state.category)) return false;
    if (state.reviewedOnly && !book.r) return false;
    if (digits.length >= 10 && book.b === digits) return true;
    return terms.every((term) => book.haystack.includes(term));
  });

  if (query) {
    list = list
      .map((book) => [rank(book, terms, query), book])
      .sort((a, b) => a[0] - b[0] || Number(b[1].r) - Number(a[1].r) || a[1].t.localeCompare(b[1].t, "id"))
      .map(([, book]) => book);
  } else {
    // Without a query: checked books with a cover first.
    list = [...list].sort(
      (a, b) => Number(b.r) - Number(a.r) || Number(!!b.v) - Number(!!a.v) || a.mix - b.mix,
    );
  }

  state.results = list;
  state.shown = PAGE;
  render();
  syncUrl();
}

const COVER_TINTS = 6;

function placeholder(book) {
  const tint = Math.abs(book.mix) % COVER_TINTS;
  return el(
    "div",
    {className: `cover blank tint-${tint}`, ariaHidden: "true"},
    el("span", {className: "blank-title", textContent: book.t}),
    el("span", {className: "blank-author", textContent: book.a[0] ?? ""}),
  );
}

function cover(book, size = "M") {
  if (!book.v) return placeholder(book);
  const image = el("img", {
    className: "cover",
    src: `https://covers.openlibrary.org/b/id/${Number(book.v)}-${size}.jpg?default=false`,
    alt: "",
    loading: "lazy",
    decoding: "async",
    referrerPolicy: "no-referrer",
  });
  image.addEventListener("error", () => image.replaceWith(placeholder(book)), {once: true});
  return image;
}

function card(book) {
  const button = el(
    "button",
    {type: "button", className: "card"},
    cover(book),
    el("span", {className: "card-title", textContent: book.t}),
    el("span", {className: "card-meta", textContent: [book.a.join(", "), book.y].filter(Boolean).join(" · ")}),
  );
  if (!book.r) button.append(el("span", {className: "badge", textContent: "Belum ditinjau"}));
  button.addEventListener("click", () => openDetail(book));
  return button;
}

function render() {
  const {results, shown} = state;
  $("hasil").replaceChildren(...results.slice(0, shown).map(card));
  $("ringkasan").textContent = results.length
    ? `${number(results.length)} buku`
    : "Belum ada di katalog. Bantu usulkan lewat tombol di bawah.";
  $("lagi").hidden = results.length <= shown;
}

function renderChips(categories) {
  const chip = (label, value) => {
    const button = el("button", {type: "button", className: "chip", textContent: label});
    button.setAttribute("aria-pressed", String(state.category === value));
    button.addEventListener("click", () => {
      state.category = state.category === value ? "" : value;
      for (const other of $("kategori").children) other.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-pressed", String(state.category === value));
      if (!state.category) $("kategori").firstElementChild.setAttribute("aria-pressed", "true");
      runSearch();
    });
    return button;
  };
  $("kategori").replaceChildren(chip("Semua", ""), ...categories.map((c) => chip(c.name, c.name)));
}

const FIELD_LABELS = {
  title: "judul",
  subtitle: "subjudul",
  authors: "penulis",
  publisher: "penerbit",
  year: "tahun",
  isbn13: "ISBN",
  pages: "halaman",
  categories: "kategori",
};

async function openDetail(book) {
  history.replaceState(null, "", `#${book.i}`);
  const facts = el("dl", {className: "facts"});
  const addFact = (label, value) => {
    if (value == null || value === "") return;
    facts.append(el("dt", {textContent: label}), el("dd", {textContent: String(value)}));
  };
  addFact("Penulis", book.a.join(", "));
  addFact("Penerbit", book.p);
  addFact("Tahun", book.y);
  addFact("ISBN", book.b);
  addFact("Kategori", book.c.join(", "));

  const links = el("p", {className: "actions"});
  const issue = new URL(`${REPO}/issues/new`);
  issue.searchParams.set("template", "koreksi-data.yml");
  issue.searchParams.set("title", `Koreksi: ${book.t}`);
  issue.searchParams.set("buku", book.b ?? book.i);

  const body = el(
    "div",
    {className: "detail-body"},
    cover(book, "L"),
    el(
      "div",
      {},
      el("h2", {id: "detail-judul", textContent: book.t}),
      book.s ? el("p", {className: "subtitle", textContent: book.s}) : "",
      facts,
      links,
    ),
  );
  $("detail-isi").replaceChildren(body);
  links.append(
    el("a", {className: "button quiet", href: `api/v1/books/${book.i}.json`, textContent: "Lihat JSON"}),
    el("a", {className: "button quiet", href: issue.href, textContent: "Laporkan kesalahan"}),
  );
  $("detail").showModal();

  // The full record has what the index leaves out.
  try {
    const response = await fetch(`api/v1/books/${book.i}.json`);
    if (!response.ok) return;
    const full = await response.json();
    if (full.pages) {
      facts.append(el("dt", {textContent: "Halaman"}), el("dd", {textContent: number(full.pages)}));
    }
    if (full.openLibraryUrl) {
      links.prepend(el("a", {className: "button quiet", href: full.openLibraryUrl, textContent: "Open Library"}));
    }
    if (full.needsCheck.length) {
      const fields = full.needsCheck.map((field) => FIELD_LABELS[field] ?? field).join(", ");
      $("detail-isi").querySelector(".detail-body > div").append(
        el("p", {className: "note", textContent: `Masih perlu dicek: ${fields}. Bantu lewat tombol Laporkan kesalahan.`}),
      );
    }
  } catch {
    // The dialog is still useful without the extra facts.
  }
}

function syncUrl() {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.category) params.set("kategori", state.category);
  if (state.reviewedOnly) params.set("tertinjau", "1");
  const search = params.toString();
  history.replaceState(null, "", `${location.pathname}${search ? `?${search}` : ""}${location.hash}`);
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  state.query = params.get("q") ?? "";
  state.category = params.get("kategori") ?? "";
  state.reviewedOnly = params.get("tertinjau") === "1";
  $("cari").value = state.query;
  $("tertinjau").checked = state.reviewedOnly;
}

async function init() {
  readUrl();
  const [index, stats, categories] = await Promise.all(
    ["search-index", "stats", "categories"].map(async (name) => {
      const response = await fetch(`api/v1/${name}.json`);
      if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
      return response.json();
    }),
  );
  state.books = index.map((book) => ({
    ...book,
    mix: mixKey(book.i),
    haystack: normalize([book.t, book.s, ...book.a, book.p, book.b].filter(Boolean).join(" ")),
  }));
  $("jumlah").textContent = number(stats.books);
  renderChips(categories);
  runSearch();

  const shared = state.books.find((book) => `#${book.i}` === location.hash);
  if (shared) openDetail(shared);
}

let typing;
$("cari").addEventListener("input", (event) => {
  clearTimeout(typing);
  typing = setTimeout(() => {
    state.query = event.target.value;
    runSearch();
  }, 120);
});
$("tertinjau").addEventListener("change", (event) => {
  state.reviewedOnly = event.target.checked;
  runSearch();
});
$("lagi").addEventListener("click", () => {
  state.shown += PAGE;
  render();
});
$("detail").querySelector(".close").addEventListener("click", () => $("detail").close());
$("detail").addEventListener("click", (event) => {
  if (event.target === $("detail")) $("detail").close();
});
$("detail").addEventListener("close", () => {
  history.replaceState(null, "", `${location.pathname}${location.search}`);
});

init().catch((error) => {
  console.error(error);
  $("ringkasan").textContent = "Katalog gagal dimuat. Muat ulang halaman, atau unduh datanya di bawah.";
});

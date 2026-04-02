# 🛒 Shopee Scraper With Apify — Web App

Aplikasi web scraping produk **Shopee Indonesia** berdasarkan keyword, menampilkan **3 produk dengan harga terendah**.
Dibangun dengan Node.js + Express, menggunakan **Apify Client SDK** untuk memanggil Actor scraper-with-apify Shopee di cloud.

---

![alt text](image.png)

---

## 🛠️ Tech Stack

| Komponen  | Teknologi                                               |
| --------- | ------------------------------------------------------- |
| Backend   | Node.js + Express                                       |
| Frontend  | HTML, CSS, Vanilla JavaScript                           |
| Apify SDK | `apify-client` (npm package resmi Apify)                |
| Actor     | `fmKWN5uByUCIy2Sam` (gio21/shopee-scraper)              |
| Deploy    | Render / Railway (free tier)                            |

---

## 📦 Instalasi Lokal

```bash
git clone https://github.com/username/shopee-scraper-with-apify.git
cd shopee-scraper-with-apify
npm install
npm start
# Buka http://localhost:3000
```

---

## 🔑 Cara Mendapatkan Apify API Key

1. Daftar akun gratis di **https://apify.com**
2. Setelah login, buka **Console → Settings → Integrations**
3. Salin **Personal API Token**

```
Format: apify_api_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

> Akun gratis Apify mendapat **$5 free credits per bulan - gio21/shopee-scraper/ - $1.00 / 1,000 product scrapeds** — cukup untuk puluhan pencarian.

---

## 🔄 Cara Kerja — Apify Client SDK

Aplikasi ini menggunakan library resmi `apify-client` dari npm. Berikut pola penggunaannya
persis seperti dokumentasi resmi Apify:

### Pola dari Dokumentasi Resmi Apify Actor gio21/shopee-scraper-with-apify

```javascript
import { ApifyClient } from "apify-client";

// Initialize the ApifyClient with API token
const client = new ApifyClient({
  token: "<YOUR_API_TOKEN>",
});

// Prepare Actor input
const input = {
  location: "tênis",
  country: "BR",
  maxItems: 50,
  shopeeEmail: "",
  shopeePassword: "",
  cookieHeader: SHOPEE_COOKIE_STRING,
};

(async () => {
  // Run the Actor and wait for it to finish
  const run = await client.actor("fmKWN5uByUCIy2Sam").call(input);

  // Fetch and print Actor results from the run's dataset (if any)
  console.log("Results from dataset");
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  items.forEach((item) => {
    console.dir(item);
  });
})();
```

### Implementasi di `server.js`

```javascript
const { ApifyClient } = require("apify-client");

// Step 1: Inisialisasi ApifyClient dengan token dari user
const client = new ApifyClient({ token: apiKey });

// Step 2: Input Actor — keyword, cookie (array), limit, proxy
const input = {
  location: keyword,
  country: "ID",
  maxItems: 50,
  shopeeEmail: "",
  shopeePassword: "",
  cookieHeader: SHOPEE_COOKIE_STRING,
};

// Step 3: Jalankan Actor dan tunggu selesai (sinkron)
const run = await client.actor("fmKWN5uByUCIy2Sam").call(input);

// Step 4: Ambil hasil dari dataset run
const { items } = await client.dataset(run.defaultDatasetId).listItems();
```

---

## 🍪 Cara Mengambil Cookie Shopee dari Browser

Cookie **wajib** dalam format **STRING**. pada implementasi ini, Actor menggunakan field cookie string untuk mendeteksi marketplace target secara otomatis
(shopee.co.id, shopee.vn, shopee.sg, dll).

### Langkah-langkah Export Cookie sebagai JSON:

1. Buka **shopee.co.id** di browser dan **login** ke akun kamu
2. Tekan **F12** / **Ctrl+Shift+I** → buka tab **Network** (Chrome) atau **Storage** (Firefox)
3. filter **search_item → Request Cookies →**
4. Export/copy cookies dalam format **STRING**
5. Pastikan setiap object memiliki field `cookieHeader` atau bisa juga menggunakan `shopeeEmail` + `shopeePassword` untuk login otomatis (opsional, tapi lebih stabil)

### Format Cookie yang Benar ✅

```json
[
  { "name": "SPC_F", "value": "abc123...", "domain": ".shopee.co.id" },
  { "name": "SPC_U", "value": "456def...", "domain": ".shopee.co.id" },
  { "name": "SPC_T", "value": "xyz789...", "domain": ".shopee.co.id" }
]
```

### Format Cookie yang SALAH ❌

```
SPC_F=abc123; SPC_U=456def; SPC_T=xyz789
```

### Cara set cookie di environment variable:

```bash
# .env
SHOPEE_COOKIE="paste_cookie_string_here"
```

### Cara set di Render:

```
Dashboard Render → pilih service → Environment → Add Environment Variable
Key  : SHOPEE_COOKIE
Value: "paste_cookie_string_here"
```

> ⚠️ Cookie Shopee dapat kadaluarsa. Jika scraping tiba-tiba gagal setelah sebelumnya berhasil,
> ambil ulang cookie dari browser dan update environment variable.

---

## 🗂️ Format Data Output Apify (per item)

Sesuai dokumentasi resmi Actor `gio21/shopee-scraper-with-apify - fmKWN5uByUCIy2Sam`, setiap item di dataset berisi:

```json
{
  "itemId": 123456789,
  "shopId": 987654321,
  "name": "Tênis Nike Air Max",
  "price": 299.90,
  "currency": "BRL",
  "sold": 1523,
  "rating": 4.85,
  "ratingCount": 312,
  "shopName": "Nike Official Store",
  "location": "São Paulo",
  "images": ["https://cf.shopee.com.br/file/..."],
  "url": "https://shopee.com.br/-i.987654321.123456789"
}
```

### ✅ Format Harga (sudah dalam Rupiah)

Sesuai dokumentasi resmi, field `price` **sudah dalam satuan Rupiah (IDR)** — tidak perlu konversi:

```
item.price = 85000  →  Rp 85.000  ✅
```

> ⚠️ Berbeda dengan API internal Shopee yang mengalikan harga × 100.000.
> Actor ini sudah melakukan konversi — kode tinggal pakai langsung.

---

## 🌐 Deploy ke Render (Gratis)

### Step 1 — Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/shopee-scraper-with-apify.git
git push -u origin main
```

### Step 2 — Buat Web Service di Render

1. Buka **https://render.com** → Sign Up gratis
2. Klik **New → Web Service** → hubungkan repo GitHub
3. Isi pengaturan:

| Setting       | Value         |
| ------------- | ------------- |
| Environment   | Node          |
| Build Command | `npm install` |
| Start Command | `npm start`   |
| Instance Type | Free          |

4. Klik **Create Web Service** → tunggu beberapa menit → dapat Public URL

### Alternatif: Railway

```
railway.app → New Project → Deploy from GitHub → auto-detect Node.js
```

---

## 📡 API Endpoint

### `POST /api/scrape`

**Request Body:**

```json
{
  "keyword": "Compressor",
  "apiKey": "apify_api_XXXXXXXXXXXX"
}
```

**Response sukses:**

```json
{
  "itemId": 123456789,
  "shopId": 987654321,
  "name": "Tênis Nike Air Max",
  "price": 299.9,
  "currency": "BRL",
  "sold": 1523,
  "rating": 4.85,
  "ratingCount": 312,
  "shopName": "Nike Official Store",
  "location": "São Paulo",
  "images": ["https://cf.shopee.com.br/file/..."],
  "url": "https://shopee.com.br/-i.987654321.123456789"
}
```

**Response error:**

```json
{ "error": "API Key tidak valid. Periksa kembali Apify API Key Anda." }
```

---

## ⚠️ Kenapa Menggunakan Apify dan Bukan Selenium/Puppeteer?

Shopee memiliki proteksi anti-bot yang sangat ketat:

- **Cloudflare** — memblokir request yang mencurigakan
- **CAPTCHA dinamis** — muncul otomatis saat terdeteksi bot
- **Headless browser detection** — mendeteksi Selenium/Puppeteer via fingerprinting
- **Rate limiting agresif** — membatasi jumlah request per IP

Actor Apify mengatasi ini menggunakan:

- **Residential proxy** (IP asli dari pengguna nyata, bukan datacenter)
- **Anti-detect browser** (fingerprint yang tidak terdeteksi sebagai bot)
- **Cookie session** (simulasi pengguna yang sudah login)
- **Auto-retry & session rotation** (retry otomatis saat anti-bot terdeteksi)

---

## 📁 Struktur Proyek

```
shopee-scraper-with-apify/
├── server.js       ← Backend: Express server + Apify client logic
├── package.json    ← Dependencies: express, cors, apify-client
├── .env.example    ← Contoh environment variables
├── .gitignore
├── README.md
└── public/
    └── index.html  ← Frontend UI (HTML + CSS + JS)
```

---

## 📝 Rangkuman

**Pendekatan scraping:** Aplikasi menggunakan `apify-client` (SDK resmi Node.js dari Apify) untuk memanggil Actor `vMcUcOamGKIfdfn5K` (ponayap/shopee-scraper-with-apify) di cloud Apify. Backend Express menerima keyword + Apify API Key dari user, menginisialisasi `ApifyClient`, memanggil `.actor().call(input)` untuk menjalankan dan menunggu Actor selesai, lalu mengambil data dengan `.dataset().listItems()`.

**Input Actor:** `keyword` (string), `cookie` (nilainya berupa string agar Actor bisa mendeteksi marketplace target), `limit` (number), `proxy` (object dengan Residential proxy).

**Output Actor:** Setiap item berisi field `name`, `price` (sudah dalam IDR), `url` (URL lengkap produk), `image`, `rating`, `sold`, `shop_name`, `shop_location`, dll.

**Tools/Libraries:** Node.js, Express, `apify-client` npm SDK, Apify Actor `gio21/shopee-scraper-with-apify - fmKWN5uByUCIy2Sam`, HTML/CSS/JS (frontend), Render (hosting).

**Tantangan:** (1) Shopee punya anti-bot sangat ketat (Cloudflare + CAPTCHA + headless detection) — diselesaikan dengan mendelegasikan scraping ke Apify yang menggunakan residential proxy dan session rotation. (2) Format cookie Actor harus berupa JSON array of objects (bukan string header biasa) — perlu parsing dan validasi di backend. (3) harga sudah dalam Rupiah di field `price` (tidak perlu dibagi 100.000).

---

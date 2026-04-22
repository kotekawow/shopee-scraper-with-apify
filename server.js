require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { ApifyClient } = require("apify-client");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────────────────────────────────────────
// Shopee Scraper — menggunakan Apify Actor gio21/shopee-scraper
const SHOPEE_COOKIE_STRING = process.env.SHOPEE_COOKIE_STRING || "";
console.log("[Debug] cookies string: ", SHOPEE_COOKIE_STRING);

function convertCookies(cookieString, domain = ".shopee.co.id", path = "/") {
  return SHOPEE_COOKIE_STRING.split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.length > 0)
    .map((cookie) => {
      const separatorIndex = cookie.indexOf("=");
      const name = cookie.substring(0, separatorIndex).trim();
      const value = cookie.substring(separatorIndex + 1).trim();
      return { name, value, domain, path };
    });
}

app.post("/api/scrape", async (req, res) => {
  const { keyword, apiKey } = req.body;

  if (!keyword || !apiKey) {
    return res.status(400).json({ error: "Keyword dan API Key wajib diisi." });
  }

  try {
    // ── Step 1: Inisialisasi ApifyClient dengan API token ────────────────────
    // Dapatkan API token di: https://console.apify.com → Settings → Integrations
    //
    //   const client = new ApifyClient({ token: '<YOUR_API_TOKEN>' });
    //
    const client = new ApifyClient({ token: apiKey });
    
    // ── Step 2: Siapkan input Actor ──────────────────────────────────────────
    // Input sesuai dokumentasi resmi Actor gio21/shopee-scraper:
    // Prepare Actor input, pilih shopeeEmail & shopeePassword atau alternatif menggunakan cookieHeader saja
    const result = convertCookies(SHOPEE_COOKIE_STRING, ".shopee.co.id", "/");
    const shopeeCookiesStr = JSON.stringify(result);
    console.log("[Debug] result func convertCookies: ", shopeeCookiesStr);

    console.log("[Debug] shopeeCookies length:", shopeeCookiesStr.length);
    console.log("[Debug] shopeeCookies preview:", shopeeCookiesStr.substring(0, 200));
    console.log("[Debug] SHOPEE_COOKIE_STRING length:", SHOPEE_COOKIE_STRING.length);

    const input = {
      searchKeywords: [keyword],
      country: "ID",
      scrapeMode: "fast",
      maxProductsPerSearch: 20,
      sortBy: "relevancy",
      cookieHeader: SHOPEE_COOKIE_STRING,
      shopeeCookies: shopeeCookiesStr,
    };

    console.log("[Debug] Full input:", JSON.stringify(input, null, 2));

    // ── Step 3: Jalankan Actor dan tunggu selesai ────────────────────────────
    // .call(input) menjalankan Actor secara async — menunggu hingga status
    // SUCCEEDED sebelum melanjutkan. Return value adalah objek run Apify.
    //
    //   example: const run = await client.actor("ActorId").call(input);
    //
    const run = await client.actor("vlSIMF6GxwbFAIQ77").call(input);

    // ── Step 4: Ambil hasil dari dataset run ─────────────────────────────────
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Log untuk debugging — lihat struktur data asli dari Actor
    if (items.length > 0) {
      // console.log("[Apify] Sample item:", JSON.stringify(items[0], null, 2));
      console.log("[Apify] Count items:", items.length);
      console.log("[Apify] Detail items:", items);
    }

    if (!items || items.length === 0) {
      return res.status(404).json({
        error: "Tidak ada produk ditemukan. Coba keyword yang berbeda.",
      });
    }

    // ── Step 5: Parse, filter valid, urutkan harga, ambil 3 termurah ─────────
    const products = items
      .filter((item) => {
        return item && item.name && item.price != null && item.url;
      })
      .map((item) => {
        return {
          name: item.name,
          price: item.price,
          priceFormatted: formatRupiah(item.price),
          link: item.url, // field "url" sesuai output docs resmi
          image: buildImageUrl(item.image),
          rating: item.rating ?? null,
          sold: item.sold ?? null,
          shopName: item.shop_name ?? null,
          shopLocation: item.shop_location ?? null,
        };
      })
      .filter((p) => p.price > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);

    if (products.length === 0) {
      return res.status(404).json({
        error: "Tidak ada produk dengan harga valid. Coba keyword lain.",
      });
    }

    return res.json({ success: true, keyword, products });
  } catch (err) {
    console.error("[Scrape Error]", err.message);

    if (err.message?.includes("Unauthorized") || err.message?.includes("401")) {
      return res.status(401).json({
        error: "API Key tidak valid. Periksa kembali Apify API Key Anda.",
      });
    }

    return res.status(500).json({ error: err.message || "Terjadi kesalahan server." });
  }
});

// ── Helper Functions ──────────────────────────────────────────────────────────
function formatRupiah(amount) {
  if (amount == null || isNaN(amount)) return "Rp -";
  return "Rp " + Number(amount).toLocaleString("id-ID");
}

function buildImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  // Jika berupa hash gambar, bangun URL CDN Shopee
  return `https://cf.shopee.co.id/file/${image}_tn`;
}

// ── Catch-all ─────────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});

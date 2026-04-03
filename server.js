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
// Shopee Scraper — menggunakan Apify Actor ...
const SHOPEE_COOKIE_STRING = process.env.SHOPEE_COOKIE_STRING || "";

app.post("/api/scrape", async (req, res) => {
  const { keyword, apiKey } = req.body;

  if (!keyword || !apiKey) {
    return res.status(400).json({ error: "Keyword dan API Key wajib diisi." });
  }

  try {
    // ── Step 1: Inisialisasi ApifyClient dengan API token ────────────────────
    const client = new ApifyClient({ token: apiKey });

    // ── Step 2: Siapkan input Actor ──────────────────────────────────────────
    const input = {
      location: keyword,
      country: "ID",
      maxItems: 50,
      shopeeEmail: "",
      shopeePassword: "",
      cookieHeader: SHOPEE_COOKIE_STRING,
    };

    // ── Step 3: Jalankan Actor dan tunggu selesai ────────────────────────────
    const run = await client.actor("fmKWN5uByUCIy2Sam").call(input);

    // ── Step 4: Ambil hasil dari dataset run ─────────────────────────────────
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Log untuk debugging — lihat struktur data asli dari Actor
    console.log("[Apify] Total items:", items.length);
    if (items.length > 0) {
      console.log("[Apify] Sample item:", JSON.stringify(items[0], null, 2));
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
          link: item.url,
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

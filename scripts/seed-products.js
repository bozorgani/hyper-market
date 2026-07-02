#!/usr/bin/env node
/*
 * Seed a set of sample Persian products + categories into MongoDB.
 *
 * Usage: npm run seed:products   (requires a running MongoDB at DATABASE_URL)
 *
 * This is a dev/test convenience script. It writes directly to Mongo (bypassing
 * the API) and attempts a best-effort Meilisearch index so products are
 * searchable immediately. Re-running it is safe: it only inserts products whose
 * slug does not already exist.
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Meilisearch } = require("meilisearch");

const ROOT = path.resolve(__dirname, "..");
const BACKEND_ENV_FILES = [
  path.join(ROOT, "apps", "backend-api", ".env"),
  path.join(ROOT, "apps", "backend-api", ".env.local"),
  path.join(ROOT, "apps", "backend-api", ".env.development"),
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
for (const envFile of BACKEND_ENV_FILES) loadEnvFile(envFile);

const CategorySchema = new mongoose.Schema(
  { name: String, slug: String },
  { collection: "categories", timestamps: true, versionKey: false },
);
const ProductSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    price: Number,
    discountPrice: { type: Number, default: null },
    stock: Number,
    images: [String],
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { collection: "products", timestamps: true, versionKey: false },
);

const slugify = (value) =>
  value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\-]/g, "");

const image = (label, color) =>
  `https://placehold.co/600x600/${color}/ffffff?text=${encodeURIComponent(label)}`;

const categoriesSeed = [
  "لبنیات و تخم‌مرغ",
  "نان و غلات",
  "میوه و سبزیجات",
  "گوشت و پروتئین",
  "نوشیدنی",
  "خشکبار و تنقلات",
  "بهدا‍شتی و آرایشی",
  "لوازم خانه‌‍داری",
];

const productsSeed = [
  // لبنیات
  { name: "شیر پاستوریزه کم‌چرب ۱ لیتری", price: 32000, category: "لبنیات و تخم‌مرغ", stock: 120, discount: 29000, color: "3B82F6", unit: "پاکت" },
  { name: "ماست کم‌چرب ۹۰۰ گرمی", price: 28000, category: "لبنیات و تخم‌مرغ", stock: 90, color: "0EA5E9", unit: "ظروف" },
  { name: "پنیر تبریزی ۵۰۰ گرمی", price: 65000, category: "لبنیات و تخم‌مرغ", stock: 60, discount: 59000, color: "6366F1", unit: "بسته" },
  // نان و غلات
  { name: "نان باگت تست ۵۰۰ گرمی", price: 22000, category: "نان و غلات", stock: 200, color: "F59E0B", unit: "بسته" },
  { name: "برنج هاشمی درجه یک ۵ کیلویی", price: 420000, category: "نان و غلات", stock: 40, discount: 399000, color: "D97706", unit: "کیسه" },
  // میوه و سبزیجات
  { name: "پرتقال خونی ۱ کیلویی", price: 38000, category: "میوه و سبزیجات", stock: 150, color: "F97316", unit: "کیلو" },
  { name: "سیب قرمز ۱ کیلویی", price: 45000, category: "میوه و سبزیجات", stock: 130, discount: 39900, color: "DC2626", unit: "کیلو" },
  { name: "خیارشور خورد ۷۰۰ گرمی", price: 31000, category: "میوه و سبزیجات", stock: 80, color: "16A34A", unit: "شیشه" },
  // گوشت و پروتئین
  { name: "فیله مرغ بدون استخوان ۱ کیلویی", price: 185000, category: "گوشت و پروتئین", stock: 50, discount: 175000, color: "EAB308", unit: "بسته" },
  { name: "گوشت چرخ‌کرده مخلوط ۱ کیلویی", price: 320000, category: "گوشت و پروتئین", stock: 35, color: "B45309", unit: "بسته" },
  // نوشیدنی
  { name: "دوغ کم‌نمک ۱/۵ لیتری", price: 26000, category: "نوشیدنی", stock: 160, color: "14B8A6", unit: "بطری" },
  { name: "آب معدنی ۱/۵ لیتری (۶ عدد)", price: 54000, category: "نوشیدنی", stock: 110, discount: 48000, color: "0891B2", unit: "بسته" },
  { name: "نوشابه گازدار ۲/۵ لیتری", price: 34000, category: "نوشیدنی", stock: 140, color: "0284C7", unit: "بطری" },
  // خشکبار و تنقلات
  { name: "مغز تخمه آفتابگردان بو داده ۵۰۰ گرمی", price: 95000, category: "خشکبار و تنقلات", stock: 70, color: "CA8A04", unit: "بسته" },
  { name: "کشمش پلویی ۵۰۰ گرمی", price: 72000, category: "خشکبار و تنقلات", stock: 85, discount: 65000, color: "A16207", unit: "بسته" },
  // بهداشتی
  { name: "مایع دستشویی گیاهی ۵۰۰ میلی‌لیتر", price: 49000, category: "بهدا‍شتی و آرایشی", stock: 100, color: "22C55E", unit: "عدد" },
  { name: "پد بهداشتی هفتگی ۱۰ عددی", price: 88000, category: "بهدا‍شتی و آرایشی", stock: 64, discount: 79000, color: "10B981", unit: "بسته" },
  // لوازم خانه‌داری
  { name: "پودر لباسشویی ۵۰۰ گرمی", price: 57000, category: "لوازم خانه‌‍داری", stock: 120, color: "0D9488", unit: "بسته" },
  { name: "اسپری پاک‌کننده همه‌کاره ۵۰۰ میلی‌لیتر", price: 63000, category: "لوازم خانه‌‍داری", stock: 90, discount: 55000, color: "0F766E", unit: "عدد" },
];

const Category = mongoose.model("Category", CategorySchema);
const Product = mongoose.model("Product", ProductSchema);

async function indexToMeili(products) {
  const host = process.env.MEILI_HOST;
  if (!host) {
    console.log("MEILI_HOST not set — skipping Meilisearch indexing (run `npm run search:reindex` later).");
    return;
  }
  try {
    const client = new Meilisearch({ host, apiKey: process.env.MEILI_API_KEY });
    const index = client.index("products");
    await index.updateSettings({
      searchableAttributes: ["title", "description", "categoryName"],
      filterableAttributes: ["categoryId", "categoryName", "stock", "price", "discountPrice", "effectivePrice", "isActive"],
      sortableAttributes: ["price", "discountPrice", "effectivePrice", "stock", "createdAt"],
    }).catch(() => undefined);

    const categories = await Category.find().lean();
    const categoryNameById = new Map(categories.map((c) => [String(c._id), c.name]));

    const documents = products.map((p) => ({
      id: String(p._id),
      title: p.name,
      description: p.description,
      price: p.price,
      discountPrice: p.discountPrice ?? null,
      effectivePrice: p.discountPrice ?? p.price,
      stock: p.stock,
      categoryName: categoryNameById.get(String(p.categoryId)) ?? "",
      categoryId: String(p.categoryId),
      image: Array.isArray(p.images) && p.images.length ? p.images[0] : null,
      isActive: p.isActive,
      createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
    }));
    await index.addDocuments(documents, { primaryKey: "id" });
    console.log(`Indexed ${documents.length} products into Meilisearch.`);
  } catch (error) {
    console.warn("Meilisearch indexing failed (ignored):", error.message);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Configure apps/backend-api/.env");
  }

  await mongoose.connect(databaseUrl);
  console.log("Connected to MongoDB.");

  const categoryByName = new Map();
  for (const name of categoriesSeed) {
    const slug = slugify(name);
    const category =
      (await Category.findOne({ slug })) ||
      (await Category.create({ name, slug }));
    categoryByName.set(name, category);
  }
  console.log(`Categories ready: ${categoryByName.size}`);

  const created = [];
  for (const item of productsSeed) {
    const category = categoryByName.get(item.category);
    const slug = slugify(`${item.name}-${item.unit ?? ""}`);
    const existing = await Product.findOne({ slug });
    if (existing) {
      console.log(`Skipped (exists): ${item.name}`);
      continue;
    }
    const product = await Product.create({
      name: item.name,
      description: `${item.name} — ${item.unit ?? ""}`,
      price: item.price,
      discountPrice: item.discount ?? null,
      stock: item.stock,
      images: [image(item.name, item.color)],
      categoryId: category._id,
      isActive: true,
      deletedAt: null,
    });
    created.push(product);
    console.log(`Created: ${item.name}`);
  }

  console.log(`\nDone. ${created.length} new product(s) inserted.`);

  if (created.length) {
    await indexToMeili(created);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("Seed failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

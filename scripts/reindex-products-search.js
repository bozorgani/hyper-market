#!/usr/bin/env node
/*
 * Reindex all non-deleted products from MongoDB into Meilisearch.
 * MongoDB remains the source of truth; this script rebuilds the search index.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Meilisearch } = require('meilisearch');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_ENV_FILES = [
  path.join(ROOT, 'apps', 'backend-api', '.env'),
  path.join(ROOT, 'apps', 'backend-api', '.env.local'),
  path.join(ROOT, 'apps', 'backend-api', '.env.development'),
];
const INDEX_NAME = 'products';
const BATCH_SIZE = 500;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

for (const envFile of BACKEND_ENV_FILES) {
  loadEnvFile(envFile);
}

const ProductSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    price: Number,
    discountPrice: Number,
    stock: Number,
    images: [String],
    categoryId: mongoose.Schema.Types.ObjectId,
    isActive: Boolean,
    deletedAt: Date,
  },
  { collection: 'products', timestamps: true, versionKey: false },
);

const CategorySchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    deletedAt: Date,
  },
  { collection: 'categories', timestamps: true, versionKey: false },
);

function toId(value) {
  if (!value) return '';
  return typeof value.toHexString === 'function' ? value.toHexString() : String(value);
}

async function ensureProductIndex(client) {
  const index = client.index(INDEX_NAME);
  await index.updateSettings({
    searchableAttributes: ['title', 'description', 'categoryName'],
    displayedAttributes: [
      'id',
      'title',
      'description',
      'price',
      'discountPrice',
      'effectivePrice',
      'stock',
      'categoryName',
      'categoryId',
      'image',
      'isActive',
      'createdAt',
    ],
    filterableAttributes: ['categoryId', 'categoryName', 'stock', 'price', 'discountPrice', 'effectivePrice', 'isActive'],
    sortableAttributes: ['price', 'discountPrice', 'effectivePrice', 'stock', 'createdAt'],
    typoTolerance: {
      enabled: true,
    },
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const meiliHost = process.env.MEILI_HOST ?? 'http://localhost:7700';
  const meiliApiKey = process.env.MEILI_API_KEY;
  const client = new Meilisearch({ host: meiliHost, apiKey: meiliApiKey });

  await mongoose.connect(databaseUrl);

  const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
  const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

  await ensureProductIndex(client);

  const categories = await Category.find({ deletedAt: null }).lean().exec();
  const categoryMap = new Map(categories.map((category) => [toId(category._id), category.name ?? '']));

  const cursor = Product.find({ deletedAt: null }).lean().cursor();
  let batch = [];
  let indexedCount = 0;

  for await (const product of cursor) {
    const categoryId = toId(product.categoryId);
    batch.push({
      id: toId(product._id),
      title: product.name ?? '',
      description: product.description ?? '',
      price: product.price ?? 0,
      discountPrice: product.discountPrice ?? null,
      effectivePrice: product.discountPrice ?? product.price ?? 0,
      stock: product.stock ?? 0,
      categoryName: categoryMap.get(categoryId) ?? '',
      categoryId,
      image: product.images?.[0] ?? null,
      isActive: Boolean(product.isActive),
      createdAt: product.createdAt?.toISOString?.() ?? new Date().toISOString(),
    });

    if (batch.length >= BATCH_SIZE) {
      await client.index(INDEX_NAME).addDocuments(batch, { primaryKey: 'id' });
      indexedCount += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await client.index(INDEX_NAME).addDocuments(batch, { primaryKey: 'id' });
    indexedCount += batch.length;
  }

  await mongoose.disconnect();
  console.log(`Reindexed ${indexedCount} products into Meilisearch index "${INDEX_NAME}".`);
}

main().catch(async (error) => {
  await mongoose.disconnect().catch(() => undefined);
  console.error(error);
  process.exit(1);
});

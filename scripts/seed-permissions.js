#!/usr/bin/env node
/*
 * Seed RBAC permissions into MongoDB.
 *
 * Reads the static ROLE_PERMISSIONS map from the backend source
 * (duplicated here for standalone Node execution) and upserts
 * each permission into the `permissions` collection.
 *
 * This makes the DB permissions collection match the code-level
 * PermissionsGuard, eliminating the "orphaned collection" issue.
 *
 * Usage: npm run seed:permissions
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_ENV_FILES = [
  path.join(ROOT, 'apps', 'backend-api', '.env'),
  path.join(ROOT, 'apps', 'backend-api', '.env.local'),
  path.join(ROOT, 'apps', 'backend-api', '.env.development'),
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf('=');
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    const value = trimmed.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}
for (const f of BACKEND_ENV_FILES) loadEnvFile(f);

// Keep in sync with apps/backend-api/src/modules/permissions/role-permissions.constant.ts
const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  admin: [
    'products.create',
    'products.update',
    'products.delete',
    'categories.create',
    'categories.update',
    'categories.delete',
    'orders.cancel',
    'orders.read',
    'orders.update',
    'users.read',
    'users.ban',
    'payments.read',
    'analytics.read',
  ],
  vendor: [],
  delivery: [],
  customer: [],
};

const PermissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    resource: { type: String, required: true },
    action: { type: String, required: true },
  },
  { collection: 'permissions', timestamps: true, versionKey: false }
);

const Permission = mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);

function parsePermission(name) {
  if (name === '*') return { resource: '*', action: '*' };
  const parts = name.split('.');
  if (parts.length >= 2) {
    const action = parts.pop();
    const resource = parts.join('.');
    return { resource, action };
  }
  return { resource: name, action: '*' };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  await mongoose.connect(databaseUrl);
  console.log('Connected to MongoDB.');

  // Collect unique permissions across all roles
  const allPermissions = new Set();
  for (const perms of Object.values(ROLE_PERMISSIONS)) {
    for (const p of perms) allPermissions.add(p);
  }

  let inserted = 0;
  let updated = 0;
  for (const name of allPermissions) {
    const { resource, action } = parsePermission(name);
    const existing = await Permission.findOne({ name });
    if (existing) {
      // Update resource/action in case they changed
      if (existing.resource !== resource || existing.action !== action) {
        existing.resource = resource;
        existing.action = action;
        await existing.save();
        updated++;
        console.log(`Updated: ${name} → ${resource}/${action}`);
      } else {
        console.log(`Exists: ${name}`);
      }
      continue;
    }
    await Permission.create({ name, resource, action });
    inserted++;
    console.log(`Inserted: ${name}`);
  }

  console.log(`\nDone. Inserted ${inserted}, updated ${updated}, total ${allPermissions.size} unique permissions.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

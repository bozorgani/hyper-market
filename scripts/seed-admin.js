#!/usr/bin/env node
/*
 * Seed initial SUPER_ADMIN user.
 *
 * Creates a bootstrap admin account if none exists.
 * Default credentials (change immediately in production!):
 *   Email: admin@hypermarket.local
 *   Phone: 09120000000
 *   Password: Admin@123456
 *
 * You can override via env:
 *   ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD
 *
 * Usage: npm run seed:admin
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

const UserSchema = new mongoose.Schema({}, { collection: 'users', strict: false });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function hashPassword(password) {
  const pepper = process.env.PASSWORD_PEPPER || '';
  const saltRounds = 12;
  return bcrypt.hash(password + pepper, saltRounds);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  await mongoose.connect(databaseUrl);
  console.log('Connected to MongoDB.');

  const email = process.env.ADMIN_EMAIL || 'admin@hypermarket.local';
  const phoneNumber = process.env.ADMIN_PHONE || '09120000000';
  const plainPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  // Check if any super_admin already exists
  const existingAdmin = await User.findOne({ role: { $in: ['super_admin', 'admin'] } }).lean();
  if (existingAdmin) {
    console.log(`Admin user already exists: ${existingAdmin.email || existingAdmin.phoneNumber} (role=${existingAdmin.role})`);
    console.log('Skipping bootstrap admin creation. Delete existing admin to re-seed.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Check if email/phone already taken
  const existingByEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingByEmail) {
    console.error(`Email ${email} already registered with role ${existingByEmail.role}. Aborting.`);
    process.exit(1);
  }
  const existingByPhone = await User.findOne({ phoneNumber });
  if (existingByPhone) {
    console.error(`Phone ${phoneNumber} already registered. Aborting.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(plainPassword);

  const admin = await User.create({
    email: email.toLowerCase(),
    phoneNumber,
    passwordHash,
    role: 'super_admin',
    accountStatus: 'active',
    isEmailVerified: true,
    isPhoneVerified: true,
    twoFactorEnabled: false,
    twoFactorMethod: 'none',
    failedLoginAttempts: 0,
    tokenVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('\n✅ Super admin created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Email   : ${email}`);
  console.log(`  Phone   : ${phoneNumber}`);
  console.log(`  Password: ${plainPassword}`);
  console.log(`  Role    : super_admin`);
  console.log(`  ID      : ${admin._id}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

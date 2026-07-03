#!/usr/bin/env node
/*
 * Master seeder – runs permissions → admin → products
 */

const { spawn } = require('child_process');
const path = require('path');

const scripts = [
  'seed-permissions.js',
  'seed-admin.js',
  'seed-products.js',
];

async function runScript(file) {
  return new Promise((resolve, reject) => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n▶ Running ${file}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    const proc = spawn('node', [path.join(__dirname, file)], { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${file} exited with code ${code}`));
    });
  });
}

(async () => {
  try {
    for (const script of scripts) {
      await runScript(script);
    }
    console.log('\n✅ All seeders completed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    process.exit(1);
  }
})();

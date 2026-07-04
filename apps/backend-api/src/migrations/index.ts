import { Migration } from './migration-runner';

/**
 * Migration registry.
 *
 * Add new migrations to this array. They will run in order of `id`
 * on the next application startup (if not already applied).
 *
 * Migration files follow the naming convention:
 *   `NNNN-description.ts`  (e.g. `0001-seed-permissions.ts`)
 */
export const migrations: Migration[] = [
  // ── 0001: Seed default role-permissions into the DB ────────────────
  {
    id: '0001',
    description: 'Seed default role-permissions from static constant',
    up: async (connection) => {
      const collection = connection.collection('permissions');

      // Only seed if the collection is empty
      const count = await collection.countDocuments();
      if (count > 0) {
        console.log('[MIGRATION 0001] Permissions collection already has data — skipping seed.');
        return;
      }

      const { ROLE_PERMISSIONS } = await import('../modules/permissions/role-permissions.constant');

      const docs: Array<{ role: string; name: string; resource: string; action: string }> = [];
      for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
        for (const perm of permissions) {
          if (perm === '*') {
            docs.push({ role, name: perm, resource: '*', action: '*' });
          } else {
            const [resource, action] = perm.split('.');
            docs.push({ role, name: perm, resource: resource ?? perm, action: action ?? '*' });
          }
        }
      }

      if (docs.length > 0) {
        await collection.insertMany(docs, { ordered: false });
      }

      console.log(`[MIGRATION 0001] Seeded ${docs.length} permission entries for ${Object.keys(ROLE_PERMISSIONS).length} roles.`);
    },
  },

  // ── 0002: Add brand, sku, unit, weight, tags fields to products ────
  {
    id: '0002',
    description: 'Add brand, sku, unit, weight, tags fields to existing products',
    up: async (connection) => {
      const collection = connection.collection('products');

      // Set default values for all existing documents that lack the new fields.
      // Using $set with defaults — idempotent (won't overwrite existing values).
      const result = await collection.updateMany(
        {},
        {
          $set: {
            brand: null,
            sku: null,
            unit: null,
            weight: null,
            tags: [],
          },
        },
        { upsert: false },
      );

      console.log(
        `[MIGRATION 0002] Updated ${result.modifiedCount} product(s) with new fields (brand, sku, unit, weight, tags).`,
      );

      // Create sparse unique index on sku
      await collection.createIndex({ sku: 1 }, { unique: true, sparse: true });
      await collection.createIndex({ brand: 1 });
      await collection.createIndex({ tags: 1 });

      console.log('[MIGRATION 0002] Indexes created: sku (sparse unique), brand, tags.');
    },
  },

  // ── 0003: Enrich Category schema ────────────────────────────────────
  {
    id: '0003',
    description: 'Add description, icon, image, parentId, sortOrder, isActive to categories',
    up: async (connection) => {
      const collection = connection.collection('categories');

      // Set default values for all existing documents that lack the new fields.
      const result = await collection.updateMany(
        {},
        {
          $set: {
            description: null,
            icon: null,
            image: null,
            parentId: null,
            sortOrder: 0,
            isActive: true,
          },
        },
        { upsert: false },
      );

      console.log(
        `[MIGRATION 0003] Updated ${result.modifiedCount} categor(ies) with new fields (description, icon, image, parentId, sortOrder, isActive).`,
      );

      // Create indexes for the new fields
      await collection.createIndex({ parentId: 1, sortOrder: 1 });
      await collection.createIndex({ isActive: 1, deletedAt: 1 });

      console.log('[MIGRATION 0003] Indexes created: parentId+sortOrder, isActive+deletedAt.');
    },
  },

  // ── 0004: Add explicit read permissions used by protected admin read routes ─
  {
    id: '0004',
    description: 'Add explicit products.read and categories.read permissions for admin role',
    up: async (connection) => {
      const collection = connection.collection('permissions');
      const docs = [
        { role: 'admin', name: 'products.read', resource: 'products', action: 'read' },
        { role: 'admin', name: 'categories.read', resource: 'categories', action: 'read' },
      ];

      for (const doc of docs) {
        await collection.updateOne(
          { role: doc.role, name: doc.name },
          { $setOnInsert: doc },
          { upsert: true },
        );
      }

      console.log('[MIGRATION 0004] Added admin read permissions for products and categories.');
    },
  },
];

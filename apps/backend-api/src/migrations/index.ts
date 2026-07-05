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

      // Set defaults only for missing fields. Never overwrite existing values.
      // Note: sku is intentionally not backfilled with null so the sparse unique
      // index remains sparse for legacy documents that do not have an SKU yet.
      const updates = await Promise.all([
        collection.updateMany(
          { brand: { $exists: false } },
          { $set: { brand: null } },
          { upsert: false },
        ),
        collection.updateMany(
          { unit: { $exists: false } },
          { $set: { unit: null } },
          { upsert: false },
        ),
        collection.updateMany(
          { weight: { $exists: false } },
          { $set: { weight: null } },
          { upsert: false },
        ),
        collection.updateMany(
          { tags: { $exists: false } },
          { $set: { tags: [] } },
          { upsert: false },
        ),
      ]);
      const modifiedCount = updates.reduce(
        (sum, result) => sum + result.modifiedCount,
        0,
      );

      console.log(
        `[MIGRATION 0002] Backfilled ${modifiedCount} missing product field(s) without overwriting existing values.`,
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

      // Set defaults only for missing fields. Never overwrite existing values.
      const updates = await Promise.all([
        collection.updateMany(
          { description: { $exists: false } },
          { $set: { description: null } },
          { upsert: false },
        ),
        collection.updateMany(
          { icon: { $exists: false } },
          { $set: { icon: null } },
          { upsert: false },
        ),
        collection.updateMany(
          { image: { $exists: false } },
          { $set: { image: null } },
          { upsert: false },
        ),
        collection.updateMany(
          { parentId: { $exists: false } },
          { $set: { parentId: null } },
          { upsert: false },
        ),
        collection.updateMany(
          { sortOrder: { $exists: false } },
          { $set: { sortOrder: 0 } },
          { upsert: false },
        ),
        collection.updateMany(
          { isActive: { $exists: false } },
          { $set: { isActive: true } },
          { upsert: false },
        ),
      ]);
      const modifiedCount = updates.reduce(
        (sum, result) => sum + result.modifiedCount,
        0,
      );

      console.log(
        `[MIGRATION 0003] Backfilled ${modifiedCount} missing category field(s) without overwriting existing values.`,
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

  // ── 0005: Normalize permissions indexes for role-based assignments ────────
  {
    id: '0005',
    description: 'Normalize permissions indexes for role-based permission assignments',
    up: async (connection) => {
      const collection = connection.collection('permissions');

      const indexes = await collection.indexes();
      const indexNames = new Set(indexes.map((index) => index.name));

      for (const indexName of ['name_1', 'resource_1_action_1']) {
        if (indexNames.has(indexName)) {
          await collection.dropIndex(indexName);
        }
      }

      await collection.createIndex({ name: 1 });
      await collection.createIndex({ resource: 1, action: 1 });
      await collection.createIndex(
        { role: 1, name: 1 },
        { unique: true, sparse: true },
      );

      console.log('[MIGRATION 0005] Permissions indexes normalized for role-based assignments.');
    },
  },

  // ── 0006: Backfill order pricing fields for coupon-aware orders ───────────
  {
    id: '0006',
    description: 'Backfill subtotalPrice, discountAmount and couponCode on legacy orders',
    up: async (connection) => {
      const collection = connection.collection('orders');

      const subtotalResult = await collection.updateMany(
        { subtotalPrice: { $exists: false } },
        [{ $set: { subtotalPrice: '$totalPrice' } }],
      );
      const discountResult = await collection.updateMany(
        { discountAmount: { $exists: false } },
        { $set: { discountAmount: 0 } },
        { upsert: false },
      );
      const couponResult = await collection.updateMany(
        { couponCode: { $exists: false } },
        { $set: { couponCode: null } },
        { upsert: false },
      );

      console.log(
        `[MIGRATION 0006] Backfilled order pricing fields (subtotal=${subtotalResult.modifiedCount}, discount=${discountResult.modifiedCount}, coupon=${couponResult.modifiedCount}).`,
      );
    },
  },

  // ── 0007: Backfill shipping fields for legacy orders ─────────────────────
  {
    id: '0007',
    description: 'Backfill shipping method and delivery fee on legacy orders',
    up: async (connection) => {
      const collection = connection.collection('orders');
      const methodResult = await collection.updateMany(
        { shippingMethod: { $exists: false } },
        { $set: { shippingMethod: 'standard' } },
        { upsert: false },
      );
      const feeResult = await collection.updateMany(
        { deliveryFee: { $exists: false } },
        { $set: { deliveryFee: 0 } },
        { upsert: false },
      );
      const freeShippingResult = await collection.updateMany(
        { freeShippingApplied: { $exists: false } },
        { $set: { freeShippingApplied: false } },
        { upsert: false },
      );

      console.log(
        `[MIGRATION 0007] Backfilled shipping fields (method=${methodResult.modifiedCount}, fee=${feeResult.modifiedCount}, free=${freeShippingResult.modifiedCount}).`,
      );
    },
  },

  // ── 0008: Address book indexes ────────────────────────────────────────────
  {
    id: '0008',
    description: 'Create indexes for customer address book',
    up: async (connection) => {
      const collection = connection.collection('addresses');
      await collection.createIndex({ userId: 1, isDefault: 1, deletedAt: 1 });
      await collection.createIndex({ userId: 1, createdAt: -1 });
      await collection.createIndex({ province: 1, city: 1 });
      console.log('[MIGRATION 0008] Address book indexes created.');
    },
  },

  // ── 0009: Add extended audit-log indexes ─────────────────────────────────
  {
    id: '0009',
    description: 'Add resource and correlation indexes to audit logs',
    up: async (connection) => {
      const collection = connection.collection('audit_logs');
      await collection.createIndex({ resource: 1, resourceId: 1, createdAt: -1 });
      await collection.createIndex({ requestId: 1 });
      await collection.createIndex({ traceId: 1 });
      console.log('[MIGRATION 0009] Extended audit-log indexes created.');
    },
  },

  // ── 0010: Coupon management collections and admin permissions ─────────────
  {
    id: '0010',
    description: 'Create coupon indexes and seed coupon admin permissions',
    up: async (connection) => {
      const coupons = connection.collection('coupons');
      const usages = connection.collection('coupon_usages');
      const permissions = connection.collection('permissions');

      await coupons.createIndex({ code: 1 }, { unique: true, name: 'coupon_code_unique' });
      await coupons.createIndex({ code: 1, deletedAt: 1 }, { name: 'coupon_code_deletedAt' });
      await coupons.createIndex(
        { active: 1, startsAt: 1, endsAt: 1, deletedAt: 1 },
        { name: 'coupon_active_window_deletedAt' },
      );
      await usages.createIndex(
        { couponId: 1, userId: 1, createdAt: -1 },
        { name: 'coupon_usage_coupon_user_createdAt' },
      );

      const usageIndexes = await usages.indexes();
      const existingOrderIdIndex = usageIndexes.find((index) => index.name === 'orderId_1');
      if (existingOrderIdIndex && !existingOrderIdIndex.unique) {
        await usages.dropIndex('orderId_1');
      }
      await usages.createIndex(
        { orderId: 1 },
        { unique: true, name: 'coupon_usage_order_unique' },
      );

      for (const permission of ['coupons.read', 'coupons.create', 'coupons.update', 'coupons.delete']) {
        const [resource, action] = permission.split('.');
        await permissions.updateOne(
          { role: 'admin', name: permission },
          { $setOnInsert: { role: 'admin', name: permission, resource, action } },
          { upsert: true },
        );
      }

      console.log('[MIGRATION 0010] Coupon indexes and admin permissions created.');
    },
  },
];

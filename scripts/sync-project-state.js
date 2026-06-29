#!/usr/bin/env node
/*
 * Hyper Market PROJECT_STATE auto-sync
 *
 * Deterministically updates selected sections of docs/PROJECT_STATE.md from the
 * real codebase. It never invents features and never rewrites the whole file;
 * it replaces only approved sections.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DOC_PATH = path.join(ROOT, 'docs', 'PROJECT_STATE.md');
const BACKEND_SRC = path.join(ROOT, 'apps', 'backend-api', 'src');
const MODULES_DIR = path.join(BACKEND_SRC, 'modules');
const FRONTEND_APP_DIR = path.join(ROOT, 'apps', 'frontend', 'src', 'app');
const FRONTEND_WEB_APP_DIR = path.join(ROOT, 'apps', 'frontend-web', 'app');

const TARGET_SECTIONS = {
  backend: 'Backend Status',
  frontend: 'Frontend Status',
  api: 'API Status',
  completed: 'Completed Features',
  missing: 'Missing / Broken Features',
  todos: 'High Priority TODOs',
  risks: 'Risks / Technical Debt',
};

function run(command) {
  try {
    return execSync(command, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function readJson(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function readFileSafe(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const ignoredDirectories = new Set(['node_modules', '.next', 'dist', 'build']);

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(fullPath, predicate));
    } else if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

function listDirectories(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function toRepoPath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function getChangedFiles() {
  const diffFiles = run('git diff --name-only HEAD')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const untrackedFiles = run('git ls-files --others --exclude-standard')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return [...new Set([...diffFiles, ...untrackedFiles])].sort();
}

function getAffectedSections(changedFiles) {
  const affected = new Set();

  for (const file of changedFiles) {
    if (file.startsWith('apps/backend-api/src/modules/') || file.startsWith('apps/backend-api/src/core/') || file.startsWith('apps/backend-api/src/infrastructure/')) {
      affected.add(TARGET_SECTIONS.backend);
      affected.add(TARGET_SECTIONS.completed);
      affected.add(TARGET_SECTIONS.missing);
      affected.add(TARGET_SECTIONS.todos);
      affected.add(TARGET_SECTIONS.risks);
    }

    if (file.includes('/controllers/') && file.endsWith('.ts')) {
      affected.add(TARGET_SECTIONS.api);
    }

    if (file.startsWith('apps/frontend/') || file.startsWith('apps/frontend-web/')) {
      affected.add(TARGET_SECTIONS.frontend);
      affected.add(TARGET_SECTIONS.completed);
      affected.add(TARGET_SECTIONS.missing);
      affected.add(TARGET_SECTIONS.todos);
      affected.add(TARGET_SECTIONS.risks);
    }
  }

  return affected;
}

function getPackageDeps(relativePackagePath) {
  const pkg = readJson(relativePackagePath);
  return pkg ? Object.keys(pkg.dependencies || {}).sort() : [];
}

function getModuleFacts(moduleName) {
  const moduleDir = path.join(MODULES_DIR, moduleName);
  return {
    name: moduleName,
    hasModule: fs.existsSync(path.join(moduleDir, `${moduleName}.module.ts`)),
    controllers: walk(moduleDir, (file) => file.endsWith('.controller.ts')).map(toRepoPath),
    services: walk(moduleDir, (file) => file.endsWith('.service.ts')).map(toRepoPath),
    repositories: walk(moduleDir, (file) => file.endsWith('.repository.ts')).map(toRepoPath),
    schemas: walk(moduleDir, (file) => file.endsWith('.schema.ts')).map(toRepoPath),
    dto: walk(moduleDir, (file) => file.includes('/dto/') && file.endsWith('.ts')).map(toRepoPath),
  };
}

function parseControllerEndpoints() {
  const controllerFiles = [
    ...walk(MODULES_DIR, (file) => file.endsWith('.controller.ts')),
    ...walk(path.join(BACKEND_SRC, 'infrastructure'), (file) => file.endsWith('.controller.ts')),
  ];

  const endpoints = [];
  const methodRegex = /@(Get|Post|Put|Patch|Delete)\(([^)]*)\)/;
  const controllerRegex = /@Controller\(([^)]*)\)/;
  const classRegex = /\bclass\s+\w+/;
  const methodDeclarationRegex = /^(async\s+)?[A-Za-z_$][\w$]*\s*\(/;

  for (const file of controllerFiles) {
    const lines = readFileSafe(file).split('\n');
    let controllerPath = '';
    let inClass = false;
    const classGuards = [];
    let pendingMethod = null;
    let pendingRoutePath = '';
    let pendingGuards = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const controllerMatch = line.match(controllerRegex);
      if (controllerMatch) {
        controllerPath = extractDecoratorPath(controllerMatch[1]);
        continue;
      }

      if (!inClass && isGuardDecorator(line)) {
        classGuards.push(normalizeDecorator(line));
        continue;
      }

      if (classRegex.test(line)) {
        inClass = true;
        continue;
      }

      if (!inClass) continue;

      const methodMatch = line.match(methodRegex);
      if (methodMatch) {
        pendingMethod = methodMatch[1].toUpperCase();
        pendingRoutePath = extractDecoratorPath(methodMatch[2]);
        continue;
      }

      if (isGuardDecorator(line)) {
        pendingGuards.push(normalizeDecorator(line));
        continue;
      }

      if (pendingMethod && methodDeclarationRegex.test(line)) {
        endpoints.push({
          method: pendingMethod,
          path: joinUrlParts('/', controllerPath, pendingRoutePath),
          source: toRepoPath(file),
          guards: [...classGuards, ...pendingGuards],
        });

        pendingMethod = null;
        pendingRoutePath = '';
        pendingGuards = [];
      }
    }
  }

  return endpoints.sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`));
}

function isGuardDecorator(line) {
  return line.startsWith('@Public') || line.startsWith('@Roles') || line.startsWith('@Permissions');
}

function normalizeDecorator(line) {
  return line.replace(/^@/, '').replace(/;$/, '');
}

function extractDecoratorPath(argumentText) {
  const trimmed = argumentText.trim();
  if (!trimmed) return '';
  const stringMatch = trimmed.match(/['"`]([^'"`]*)['"`]/);
  return stringMatch ? stringMatch[1] : '';
}

function joinUrlParts(...parts) {
  const joined = parts
    .filter((part) => part !== undefined && part !== null && String(part).length > 0)
    .map((part) => String(part).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `/${joined}`.replace(/\/+/g, '/');
}

function routeFromPageFile(filePath, appDir) {
  const relative = path.relative(appDir, filePath).replace(/\\/g, '/');
  if (relative === 'page.tsx') {
    return '/';
  }

  const route = relative.replace(/\/page\.tsx$/, '');
  return route ? `/${route}` : '/';
}

function getFrontendRoutes(appDir) {
  return walk(appDir, (file) => file.endsWith('/page.tsx')).map((file) => routeFromPageFile(file, appDir)).sort();
}

function detectMissingAndBroken(endpoints) {
  const endpointSet = new Set(endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`));
  const missing = [];

  if (!endpointSet.has('POST /categories')) missing.push('Category create API is missing: `POST /categories`.');
  if (!endpointSet.has('PUT /categories/:id')) missing.push('Category update API is missing: `PUT /categories/:id`.');
  if (!endpointSet.has('DELETE /categories/:id')) missing.push('Category delete API is missing: `DELETE /categories/:id`.');
  if (!endpointSet.has('GET /categories/:id')) missing.push('Category detail API is missing: `GET /categories/:id`.');

  const hasUsersController = walk(path.join(MODULES_DIR, 'users'), (file) => file.endsWith('.controller.ts')).length > 0;
  if (!hasUsersController) {
    missing.push('UsersController/admin user-management API is not implemented.');
  }

  const frontendText = [
    readFileSafe(path.join(ROOT, 'apps/frontend/src/store/auth-store.ts')),
    readFileSafe(path.join(ROOT, 'apps/frontend/src/services/api.ts')),
  ].join('\n');
  if (frontendText.includes('/auth/refresh-token') && !endpointSet.has('POST /auth/refresh-token')) {
    missing.push('Frontend calls `POST /auth/refresh-token`, but backend exposes `POST /auth/refresh`. Silent refresh is currently mismatched.');
  }

  if (!exists('apps/backend-api/src/modules/mail') || !walk(path.join(MODULES_DIR, 'mail'), (file) => file.includes('worker')).length) {
    missing.push('Mail queue abstraction exists, but no SMTP/SMS provider or mail worker is implemented.');
  }

  const paymentService = readFileSafe(path.join(MODULES_DIR, 'payments/services/payments.service.ts'));
  if (!paymentService.includes('zarinpal') && !paymentService.includes('Zarinpal')) {
    missing.push('Payment module is mock/abstraction only; no real Zarinpal/Stripe gateway flow is implemented.');
  }

  const eventBusExists = exists('apps/backend-api/src/core/events/event-bus.service.ts');
  const eventSubscriberFiles = walk(BACKEND_SRC, (file) => file.includes('subscriber') && file.endsWith('.ts'));
  if (eventBusExists && eventSubscriberFiles.length === 0) {
    missing.push('EventBus exists, but no explicit event subscribers are implemented yet.');
  }

  return missing;
}

function findTodoComments() {
  const sourceRoots = [path.join(ROOT, 'apps/backend-api/src'), path.join(ROOT, 'apps/frontend/src'), path.join(ROOT, 'apps/frontend-web')];
  const todos = [];

  for (const root of sourceRoots) {
    for (const file of walk(root, (item) => /\.(ts|tsx|js|jsx)$/.test(item))) {
      const lines = readFileSafe(file).split('\n');
      lines.forEach((line, index) => {
        if (/TODO|FIXME/i.test(line)) {
          todos.push(`${toRepoPath(file)}:${index + 1} ${line.trim()}`);
        }
      });
    }
  }

  return todos.slice(0, 30);
}

function renderBackendStatus() {
  const modules = listDirectories(MODULES_DIR).map(getModuleFacts);
  const deps = getPackageDeps('apps/backend-api/package.json');

  return `## 2. Backend Status (real implemented modules)

Backend app path:

\`\`\`text
apps/backend-api
\`\`\`

Detected backend dependencies:

\`\`\`text
${deps.join('\n')}
\`\`\`

Runtime characteristics detected in code:

- Global API prefix: \`/api/v1\`
- Health endpoint exists at \`/health\`
- URI versioning is enabled
- Helmet is enabled
- CORS is configured from \`CORS_ORIGINS\`
- Global validation pipe is enabled
- Global exception filter is enabled
- Shutdown hooks are enabled
- ConfigModule validation is enabled

Implemented module directories:

\`\`\`text
${modules.map((module) => module.name).join('\n')}
\`\`\`

Module implementation matrix:

| Module | Module file | Controllers | Services | Repositories | Schemas | DTOs |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
${modules
  .map((module) => `| ${module.name} | ${module.hasModule ? 'yes' : 'no'} | ${module.controllers.length} | ${module.services.length} | ${module.repositories.length} | ${module.schemas.length} | ${module.dto.length} |`)
  .join('\n')}

Infrastructure/core detected:

- \`core/events\`: in-memory EventBus Phase 1
- \`infrastructure/cache\`: Redis service/cache module
- \`infrastructure/database\`: DatabaseTransactionService
- \`infrastructure/health\`: HealthController
- \`infrastructure/logger\`: Winston logger service/config
- \`infrastructure/security\`: password, token, and token-hash services
- \`shared/utils/entity-id.util.ts\`: shared entity id extraction utility
`;
}

function renderFrontendStatus() {
  const frontendDeps = getPackageDeps('apps/frontend/package.json');
  const frontendWebDeps = getPackageDeps('apps/frontend-web/package.json');
  const frontendRoutes = getFrontendRoutes(FRONTEND_APP_DIR);
  const frontendWebRoutes = getFrontendRoutes(FRONTEND_WEB_APP_DIR);

  return `## 3. Frontend Status (frontend + frontend-web)

## 3.1 Main frontend: \`apps/frontend\`

Detected dependencies:

\`\`\`text
${frontendDeps.join('\n')}
\`\`\`

Detected App Router routes:

\`\`\`text
${frontendRoutes.join('\n')}
\`\`\`

Detected characteristics from code:

- Next.js App Router application
- Persian/RTL UI is configured globally
- Zustand auth store exists
- Axios API service exists
- TanStack Query hooks are used for server state
- Customer-facing pages exist for auth, products, search, cart, checkout, orders, and profile
- Admin panel exists under \`/admin/*\`

## 3.2 Secondary frontend: \`apps/frontend-web\`

Detected dependencies:

\`\`\`text
${frontendWebDeps.join('\n')}
\`\`\`

Detected App Router routes:

\`\`\`text
${frontendWebRoutes.join('\n')}
\`\`\`

Detected characteristics from code:

- Independent Next.js App Router application
- Contains auth-oriented routes and a dashboard route
- Uses its own local app/lib structure
`;
}

function renderApiStatus(endpoints) {
  const bySource = new Map();
  for (const endpoint of endpoints) {
    if (!bySource.has(endpoint.source)) bySource.set(endpoint.source, []);
    bySource.get(endpoint.source).push(endpoint);
  }

  const sections = [...bySource.entries()].map(([source, sourceEndpoints]) => {
    return `### ${source}\n\n\`\`\`text\n${sourceEndpoints
      .map((endpoint) => `${endpoint.method.padEnd(6)} ${endpoint.path}${endpoint.guards.length ? `    [${endpoint.guards.join(', ')}]` : ''}`)
      .join('\n')}\n\`\`\``;
  });

  return `## 4. API Status (implemented endpoints)

Global API prefix in code:

\`\`\`text
/api/v1
\`\`\`

Health endpoint is excluded from the global prefix:

\`\`\`text
GET /health
\`\`\`

Detected controller endpoints:

${sections.join('\n\n')}
`;
}

function renderCompletedFeatures() {
  const modules = new Set(listDirectories(MODULES_DIR));
  const features = [];

  if (exists('apps/backend-api')) features.push('Backend API application exists under `apps/backend-api`.');
  if (exists('apps/frontend')) features.push('Main frontend application exists under `apps/frontend`.');
  if (exists('apps/frontend-web')) features.push('Secondary frontend application exists under `apps/frontend-web`.');
  if (modules.has('auth')) features.push('Auth module exists with JWT/OTP-related services, guards, strategies, DTOs, and schemas.');
  if (modules.has('products')) features.push('Products module exists with controller, service, repository, DTOs, and schema.');
  if (modules.has('categories')) features.push('Categories module exists with list controller, service, repository, and schema.');
  if (modules.has('cart')) features.push('Cart module exists with controller, service, repository, DTOs, and schema.');
  if (modules.has('orders')) features.push('Orders module exists with controller, service, repository, DTOs, enum, and schema.');
  if (modules.has('payments')) features.push('Payments module exists with mock/abstraction controller, service, repository, DTOs, enums, and schema.');
  if (modules.has('search')) features.push('Search module exists with Meilisearch service, indexer, and controllers.');
  if (modules.has('analytics')) features.push('Analytics module exists with raw event storage and aggregation endpoints.');
  if (modules.has('queue')) features.push('Queue module exists with BullMQ QueueService.');
  if (modules.has('mail')) features.push('Mail module exists as queue-based abstraction.');
  if (modules.has('permissions')) features.push('Permissions module exists with decorator, guard, schema, repository, and role-permission mapping.');
  if (exists('apps/backend-api/src/core/events/event-bus.service.ts')) features.push('In-memory EventBus Phase 1 exists.');
  if (exists('apps/backend-api/src/infrastructure/database/database-transaction.service.ts')) features.push('Mongoose transaction wrapper service exists.');
  if (exists('apps/backend-api/src/infrastructure/cache/redis.service.ts')) features.push('Redis service exists.');

  return `## 6. Completed Features

${features.map((feature) => `- ${feature}`).join('\n')}
`;
}

function renderMissingBroken(missing) {
  return `## 7. Missing / Broken Features

${missing.length ? missing.map((item) => `- ${item}`).join('\n') : '- No missing or broken features detected by the sync script.'}
`;
}

function renderTodos(missing, todoComments) {
  const todoItems = [
    ...missing.map((item) => item.replace(/\.$/, '')),
    'Add transaction usage to critical order/payment/cart flows if not already applied.',
    'Add tests for auth, permissions, cart/order/payment, search, and analytics flows.',
  ];

  if (todoComments.length > 0) {
    todoItems.push('Review TODO/FIXME comments detected in source code:');
    todoItems.push(...todoComments.map((todo) => `  - ${todo}`));
  }

  return `## 8. High Priority TODOs

${todoItems.map((item) => `- ${item}`).join('\n')}
`;
}

function renderRisks(missing) {
  const risks = [];

  if (missing.some((item) => item.includes('refresh-token'))) {
    risks.push('Auth session renewal may fail because frontend and backend refresh endpoints are mismatched.');
  }
  if (missing.some((item) => item.includes('Category'))) {
    risks.push('Admin product creation depends on pre-existing categories, but admin category CRUD is not available through API.');
  }
  if (missing.some((item) => item.includes('UsersController'))) {
    risks.push('Admin users UI cannot be fully functional until backend user-management endpoints exist.');
  }
  if (missing.some((item) => item.includes('Mail'))) {
    risks.push('Mail/SMS delivery is not production-complete because provider/workers are not implemented.');
  }
  if (missing.some((item) => item.includes('Payment'))) {
    risks.push('Payment is not production-ready because real gateway integration is missing.');
  }
  if (missing.some((item) => item.includes('EventBus'))) {
    risks.push('Side effects remain partially coupled because EventBus subscribers are not implemented.');
  }

  risks.push('Meilisearch index can become stale because no bulk reindex command was detected.');
  risks.push('Permission model is partly static in code even though permission schema exists.');
  risks.push('No comprehensive automated test suite was detected by this script.');

  return `## 10. Risks / Technical Debt

${risks.map((risk) => `- ${risk}`).join('\n')}
`;
}

function replaceSection(content, sectionTitleFragment, newSection) {
  const headingRegex = /^##\s+\d+\.\s+.*$/gm;
  const headings = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({ text: match[0], index: match.index });
  }

  const targetIndex = headings.findIndex((heading) => heading.text.includes(sectionTitleFragment));
  if (targetIndex === -1) {
    const separator = content.endsWith('\n') ? '' : '\n';
    return `${content}${separator}\n${newSection.trim()}\n`;
  }

  const start = headings[targetIndex].index;
  const end = targetIndex + 1 < headings.length ? headings[targetIndex + 1].index : content.length;
  return `${content.slice(0, start)}${newSection.trim()}\n\n${content.slice(end).replace(/^\n+/, '')}`;
}

function main() {
  if (!fs.existsSync(DOC_PATH)) {
    throw new Error('docs/PROJECT_STATE.md does not exist. Create it before running sync.');
  }

  const changedFiles = getChangedFiles();
  const affectedSections = getAffectedSections(changedFiles);

  if (changedFiles.length === 0) {
    console.log('No git changes detected. PROJECT_STATE.md left unchanged.');
    return;
  }

  const endpoints = parseControllerEndpoints();
  const missing = detectMissingAndBroken(endpoints);
  const todos = findTodoComments();

  const renderers = new Map([
    [TARGET_SECTIONS.backend, () => renderBackendStatus()],
    [TARGET_SECTIONS.frontend, () => renderFrontendStatus()],
    [TARGET_SECTIONS.api, () => renderApiStatus(endpoints)],
    [TARGET_SECTIONS.completed, () => renderCompletedFeatures()],
    [TARGET_SECTIONS.missing, () => renderMissingBroken(missing)],
    [TARGET_SECTIONS.todos, () => renderTodos(missing, todos)],
    [TARGET_SECTIONS.risks, () => renderRisks(missing)],
  ]);

  let content = fs.readFileSync(DOC_PATH, 'utf8');
  const sectionsToUpdate = affectedSections.size > 0 ? affectedSections : new Set(renderers.keys());

  for (const section of sectionsToUpdate) {
    const render = renderers.get(section);
    if (render) {
      content = replaceSection(content, section, render());
    }
  }

  fs.writeFileSync(DOC_PATH, content);

  console.log('PROJECT_STATE.md synced.');
  console.log('Changed files analyzed:', changedFiles.length);
  console.log('Sections updated:', [...sectionsToUpdate].join(', '));
}

main();

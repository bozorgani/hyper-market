# Hyper Market Web

Frontend application for Hyper Market, built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, TanStack Query, Zustand, Axios, and a Persian RTL UI.

## Requirements

- Node.js `>=20`
- npm `>=10`
- Backend API available on the configured API URL
- For browser E2E: Playwright Chromium (`npx playwright install --with-deps chromium`)

## Environment setup

Copy the frontend environment example:

```bash
cp apps/web/.env.example apps/web/.env.local
```

For local development with the backend on port `3001`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SERVER_API_BASE_URL=http://localhost:3001/api/v1
PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
CSP_MODE=report-only
CSP_REPORT_ENDPOINT=/api/csp-report
ALLOWED_REDIRECT_DOMAINS=
PLAYWRIGHT_MOCK_ACTIONS=0
```

Run the web app from the repository root:

```bash
npm run dev --workspace=apps/web
```

Open `http://localhost:3000`.

## Environment contract

| Variable | Used by | Required | Description |
|---|---|---:|---|
| `NEXT_PUBLIC_API_BASE_URL` | Browser Axios, image URL helper, CSP | Yes | Browser-reachable API origin including `/api/v1`. This value is public and is embedded into the browser bundle at build time. |
| `NEXT_PUBLIC_SITE_URL` | Metadata, canonical URLs, robots, sitemap, Open Graph, JSON-LD, CSP | Yes in deployed environments | Public canonical frontend origin, for example `https://shop.example.com`. |
| `SERVER_API_BASE_URL` | Server Components and Server Actions | Recommended | Server-only API URL. In Docker use the internal backend service URL such as `http://backend:3001/api/v1`. Do not expose an internal hostname to the browser. |
| `PUBLIC_API_BASE_URL` | Server-side fallback | Optional | Server-side fallback API URL. Prefer `SERVER_API_BASE_URL` when both are available. |
| `CSP_MODE` | `src/middleware.ts` | Yes in production policy | `report-only` during a controlled CSP rollout; `enforce` in production after violations have been reviewed. The application defaults to `enforce` in production and `report-only` in development. |
| `CSP_REPORT_ENDPOINT` | `src/middleware.ts` | Optional | CSP `report-uri` destination. Recommended value: `/api/csp-report`. |
| `ALLOWED_REDIRECT_DOMAINS` | `src/middleware.ts` | Optional | Comma-separated external host allowlist for production redirects. Same-origin relative redirects do not require this value. |
| `PLAYWRIGHT_MOCK_ACTIONS` | Checkout Server Actions | Test only | Set to `1` only for the Playwright mock-action test environment. Keep `0` or unset in development/production. |

### Build-time versus runtime

- `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SITE_URL` are `NEXT_PUBLIC_*` variables. Next.js embeds their values into the client build. Changing them after `next build` requires a new build.
- `SERVER_API_BASE_URL`, `PUBLIC_API_BASE_URL`, `CSP_MODE`, `CSP_REPORT_ENDPOINT`, and `ALLOWED_REDIRECT_DOMAINS` are server-side configuration and must be present in the runtime environment used by the Next server/middleware.
- Do not put secrets in this application’s environment example. The frontend must not receive JWT secrets, database credentials, Redis credentials, SMTP passwords, Meilisearch keys, or private signing keys.

## Docker configuration

For the standard Docker Compose setup, browser traffic must be able to reach the public API URL while Server Components/Actions may use the internal backend hostname:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SERVER_API_BASE_URL=http://backend:3001/api/v1
```

For a deployed HTTPS environment:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
NEXT_PUBLIC_SITE_URL=https://shop.example.com
SERVER_API_BASE_URL=http://backend:3001/api/v1
PUBLIC_API_BASE_URL=http://backend:3001/api/v1
CSP_MODE=enforce
CSP_REPORT_ENDPOINT=/api/csp-report
ALLOWED_REDIRECT_DOMAINS=
```

`NEXT_PUBLIC_API_BASE_URL` must never be set to `http://backend:3001/...` for a browser-facing deployment because `backend` is an internal container hostname. Conversely, `SERVER_API_BASE_URL` may use the internal hostname when the web container shares the Compose network.

## Authentication and CSRF contract

Authentication is cookie-based. The browser Axios client uses `withCredentials: true`.

The backend issues these cookies:

- `hyper_market_access_token` — HttpOnly access-token cookie.
- `hyper_market_refresh_token` — HttpOnly refresh-token cookie.
- `hyper_market_csrf_token` — readable CSRF double-submit cookie.

The CSRF cookie is created by the backend during login and authenticated `/auth/me` responses. Mutating browser requests send its value in the `x-csrf-token` header. Server Actions also require the CSRF cookie before forwarding a request to the backend.

Production prerequisites:

1. Serve both frontend and API over HTTPS so secure auth cookies are accepted.
2. Configure the backend `CORS_ORIGINS` with the exact frontend origin.
3. Keep frontend and backend cookie `SameSite`, domain, path, and reverse-proxy behavior consistent.
4. Do not return access/refresh tokens in the response body in production.
5. Do not store access or refresh tokens in `localStorage` or `sessionStorage`.
6. Treat the browser-readable CSRF token as non-secret; its security comes from the double-submit comparison with the cookie.

## CSP rollout

The current CSP is generated by `src/middleware.ts` with a per-request nonce. It defaults to `enforce` in production and `report-only` in development.

Recommended production rollout:

1. Set `CSP_MODE=report-only` for a controlled observation period.
2. Review `/api/csp-report` reports and remove unnecessary external resources.
3. Resolve inline-script/style violations and validate nonce propagation.
4. Set `CSP_MODE=enforce` before high-traffic production use.
5. Keep `CSP_REPORT_ENDPOINT=/api/csp-report` or use an approved same-origin reporting path.

## Validation checklist

Before local development:

- [ ] `NEXT_PUBLIC_API_BASE_URL` is reachable from the browser.
- [ ] `NEXT_PUBLIC_SITE_URL` is a valid absolute URL.
- [ ] `SERVER_API_BASE_URL` is reachable from the Next server process.
- [ ] Backend CORS includes the frontend origin.
- [ ] Backend is configured to issue the CSRF cookie.
- [ ] `PLAYWRIGHT_MOCK_ACTIONS` is not enabled accidentally.

Before production:

- [ ] `NEXT_PUBLIC_*` values were set before the production build.
- [ ] Public API and site URLs use HTTPS and the correct canonical domains.
- [ ] `SERVER_API_BASE_URL` uses an internal/private API URL where appropriate.
- [ ] No secret appears in any `NEXT_PUBLIC_*` variable or `.env.example`.
- [ ] `CSP_MODE` is explicitly set and its rollout decision is documented.
- [ ] `ALLOWED_REDIRECT_DOMAINS` is minimal or empty when external redirects are not required.
- [ ] Auth cookies are secure and the reverse proxy forwards `Origin`, `Referer`, and `Set-Cookie` correctly.
- [ ] Sitemap, robots, Open Graph, and JSON-LD resolve against the production site URL.

## Commands

```bash
# Development
npm run dev --workspace=apps/web

# Lint
npm run lint --workspace=apps/web

# Production build
npm run build --workspace=apps/web

# Production server
npm run start --workspace=apps/web

# Frontend E2E (requires Chromium)
npx playwright install --with-deps chromium
npm run web:e2e
```

## Learn more

- Root project setup: `README.md`
- Docker setup: `docs/docker.md`
- CSP details: `docs/csp.md`
- Secrets policy: `docs/secrets.md`
- E2E setup: `docs/e2e.md`

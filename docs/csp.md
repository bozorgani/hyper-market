# CSP / Security headers

Frontend security headers are configured in:

```text
apps/web/next.config.ts
```

## Current mode

By default CSP runs in report-only mode:

```env
CSP_MODE=report-only
```

This sends:

```http
Content-Security-Policy-Report-Only: ...
```

Reports are received by:

```http
POST /api/csp-report
```

The in-app endpoint logs reports with the `[CSP_REPORT]` prefix. In production, route logs should be shipped to the central log pipeline.

## Enforcing CSP

After reviewing report-only violations, switch to enforce mode:

```env
CSP_MODE=enforce
```

This sends:

```http
Content-Security-Policy: ...
```

## External resources currently allowed

The policy explicitly accounts for the current external resources used by the frontend:

- `https://unpkg.com` — Leaflet CSS loaded by the map picker
- `https://*.tile.openstreetmap.org` — map tile images
- `https://nominatim.openstreetmap.org` — reverse geocoding requests
- `NEXT_PUBLIC_API_BASE_URL` origin — backend API/images
- `NEXT_PUBLIC_SITE_URL` origin — deployed frontend origin

## Nonce/hash strategy

The policy is intentionally report-only first because some current UI code still uses inline style attributes and Next.js injects runtime scripts/styles. Before switching high-traffic production to strict enforcement:

1. Review `/api/csp-report` output for at least one full release cycle.
2. Remove or isolate inline style attributes where possible.
3. Introduce request-scoped script nonces through Next middleware/proxy and pass the nonce via `x-nonce`.
4. Replace remaining stable inline snippets with SHA-256 hashes when a nonce is not practical.
5. Remove `unsafe-inline` from `script-src` first, then consider tightening `style-src`.

## Other security headers

The frontend also sends:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-site`
- `Strict-Transport-Security` in production

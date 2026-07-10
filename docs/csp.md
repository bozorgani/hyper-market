# CSP / Security headers

Frontend security headers are configured in:

```text
apps/web/next.config.ts
apps/web/src/middleware.ts
```

## Current mode

CSP is generated per request with a cryptographic nonce. The default is:

- **Production:** `enforce`
- **Development:** `report-only`

The mode can be overridden explicitly:

```env
CSP_MODE=enforce
# or
CSP_MODE=report-only
```

Production should use `enforce`. `report-only` is intended for controlled rollout/debugging only.

Reports are received by:

```http
POST /api/csp-report
```

The in-app endpoint logs reports with the `[CSP_REPORT]` prefix. In production, route logs should be shipped to the central log pipeline.

## Policy hardening

The current policy:

- Uses a per-request nonce for scripts.
- Uses `strict-dynamic` for scripts.
- Does not include `script-src 'unsafe-inline'`.
- Does not include a broad `https:` script source.
- Does not allow third-party Leaflet CSS.
- Uses `frame-src 'none'`, `object-src 'none'`, `base-uri 'self'`, and `frame-ancestors 'none'`.
- Allows `unsafe-inline` for styles temporarily because the current Next/Tailwind/UI layer still emits inline styles and style attributes.

The Leaflet stylesheet is bundled locally at:

```text
apps/web/src/app/leaflet.css
```

The map still uses the following external resources:

- `https://*.tile.openstreetmap.org` — map tile images
- `https://nominatim.openstreetmap.org` — reverse geocoding requests
- `NEXT_PUBLIC_API_BASE_URL` origin — backend API and images
- `NEXT_PUBLIC_SITE_URL` origin — deployed frontend origin

## Nonce rollout and style follow-up

Before tightening `style-src` further:

1. Review `/api/csp-report` output for a complete release cycle.
2. Remove remaining inline style attributes where possible.
3. Introduce request-scoped style nonces or stable hashes for unavoidable inline styles.
4. Replace `style-src 'unsafe-inline'` with a nonce/hash-based policy after validation.
5. Keep the production default as `CSP_MODE=enforce`.

## Environment

```env
CSP_MODE=enforce
CSP_REPORT_ENDPOINT=/api/csp-report
```

`CSP_REPORT_ENDPOINT` should normally remain a same-origin relative path. Do not put secrets in CSP configuration.

## Other security headers

The frontend also sends:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-site`
- `Strict-Transport-Security` in production

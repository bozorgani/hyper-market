# CSP / Security headers

Frontend security headers are configured in:

```text
apps/web/next.config.ts
apps/web/src/proxy.ts
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
- Removes `unsafe-inline` from style policies; static styling is served from same-origin stylesheets and nonce-bearing style elements.
- Blocks style attributes explicitly with `style-src-attr 'none'`.

The Leaflet stylesheet is bundled locally at:

```text
apps/web/src/app/leaflet.css
```

The map still uses the following external resources:

- `https://*.tile.openstreetmap.org` — map tile images
- `https://nominatim.openstreetmap.org` — reverse geocoding requests
- `NEXT_PUBLIC_API_BASE_URL` origin — backend API and images
- `NEXT_PUBLIC_SITE_URL` origin — deployed frontend origin

## Style policy validation

The style policy is now enforced without `unsafe-inline`:

1. `style-src` allows same-origin stylesheets and the request-scoped nonce.
2. `style-src-elem` allows same-origin stylesheets and nonce-bearing style elements.
3. `style-src-attr 'none'` blocks inline style attributes.
4. Static component styles live in CSS classes or same-origin stylesheets.
5. Keep the production default as `CSP_MODE=enforce` and review CSP reports after deployment.

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

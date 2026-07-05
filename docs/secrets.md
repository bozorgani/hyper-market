# Secrets management

This project must not store production secrets in Git. Use environment-specific secret stores and inject secrets at runtime.

## Immediate action: revoke exposed token

A GitHub personal access token was pasted into the conversation during maintenance. Treat it as compromised.

Required action:

1. Open GitHub → Settings → Developer settings → Personal access tokens.
2. Revoke the exposed token immediately.
3. Create a new fine-grained token only if needed.
4. Scope it to the minimum repository permissions and shortest expiry.
5. Never paste tokens into chat, commits, logs or tickets.

## Required production secrets

Backend/API:

- `DATABASE_URL`
- `REDIS_URL`
- `REDIS_PASSWORD` when Redis auth is enabled
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `PASSWORD_PEPPER`
- `OTP_HASH_SECRET`
- `MEILI_API_KEY`
- `SMTP_PASS`
- `SMS_IR_API_KEY`
- `S3_SECRET_ACCESS_KEY` when S3 storage is enabled
- `ERROR_TRACKING_WEBHOOK_URL` when using external error tracking
- `COUPON_CODES_JSON` until coupon DB management replaces config-based coupons
- `SHIPPING_CONFIG_JSON` until shipping DB/admin management replaces config-based shipping

Frontend build/runtime:

- `NEXT_PUBLIC_API_BASE_URL` is public and not secret
- `NEXT_PUBLIC_SITE_URL` is public and not secret
- `CSP_MODE` is not secret
- `CSP_REPORT_ENDPOINT` is not secret

## GitHub Actions secrets

CI currently uses only test-only placeholder values for build/test/E2E jobs. Production deployment workflows must use GitHub Environments and GitHub Secrets.

Recommended GitHub Environment secrets for a future deploy job:

- `PROD_DATABASE_URL`
- `PROD_REDIS_URL`
- `PROD_REDIS_PASSWORD`
- `PROD_JWT_ACCESS_SECRET`
- `PROD_JWT_REFRESH_SECRET`
- `PROD_PASSWORD_PEPPER`
- `PROD_OTP_HASH_SECRET`
- `PROD_MEILI_API_KEY`
- `PROD_SMTP_PASS`
- `PROD_SMS_IR_API_KEY`
- `PROD_S3_SECRET_ACCESS_KEY`
- `PROD_ERROR_TRACKING_WEBHOOK_URL`
- `PROD_COUPON_CODES_JSON`
- `PROD_SHIPPING_CONFIG_JSON`

Rules:

- Use protected GitHub Environments for production.
- Require manual approval for deploy jobs.
- Never echo secrets in CI logs.
- Prefer OIDC to cloud providers over long-lived cloud access keys.

## Secret scanning

CI includes a Gitleaks secret-scan job using:

```text
.gitleaks.toml
```

The allowlist only permits test placeholders and local examples. If the scanner flags a real value, rotate the secret and remove it from Git history before continuing.

## Docker secrets

The backend supports Docker/Kubernetes-style file secrets through `KEY_FILE` variables. If both `KEY` and `KEY_FILE` are provided, `KEY` wins.

Supported file secret variables include:

```env
DATABASE_URL_FILE=/run/secrets/database_url
REDIS_URL_FILE=/run/secrets/redis_url
REDIS_PASSWORD_FILE=/run/secrets/redis_password
JWT_ACCESS_SECRET_FILE=/run/secrets/jwt_access_secret
JWT_REFRESH_SECRET_FILE=/run/secrets/jwt_refresh_secret
PASSWORD_PEPPER_FILE=/run/secrets/password_pepper
OTP_HASH_SECRET_FILE=/run/secrets/otp_hash_secret
MEILI_API_KEY_FILE=/run/secrets/meili_api_key
SMTP_PASS_FILE=/run/secrets/smtp_pass
SMS_IR_API_KEY_FILE=/run/secrets/sms_ir_api_key
S3_SECRET_ACCESS_KEY_FILE=/run/secrets/s3_secret_access_key
ERROR_TRACKING_WEBHOOK_URL_FILE=/run/secrets/error_tracking_webhook_url
COUPON_CODES_JSON_FILE=/run/secrets/coupon_codes_json
SHIPPING_CONFIG_JSON_FILE=/run/secrets/shipping_config_json
```

A production-oriented Compose override is provided:

```text
docker-compose.prod.yml
```

Example:

```bash
mkdir -p secrets
openssl rand -base64 48 > secrets/jwt_access_secret.txt
openssl rand -base64 48 > secrets/jwt_refresh_secret.txt
openssl rand -base64 48 > secrets/password_pepper.txt
openssl rand -base64 48 > secrets/otp_hash_secret.txt
printf '%s' 'your-meili-key' > secrets/meili_master_key.txt
printf '%s' 'your-smtp-password' > secrets/smtp_pass.txt

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

The `secrets/` directory is ignored by Git.

## Vault / SOPS / 1Password guidance

Preferred production options:

1. Cloud secret manager with OIDC-based access from CI/CD.
2. HashiCorp Vault for dynamic credentials and rotation.
3. SOPS-encrypted env files for GitOps repositories.
4. 1Password Secrets Automation for smaller deployments.

Never commit decrypted secret files. If SOPS is used, commit only encrypted files and keep decryption keys outside the repository.

## Rotation policy

Recommended rotation cadence:

- JWT secrets: rotate immediately on suspected exposure; otherwise every 90-180 days with a planned session invalidation window.
- Password pepper: rotate only with a planned password rehash/migration strategy.
- OTP hash secret: rotate on exposure; existing unexpired OTPs become invalid.
- SMTP/SMS/API keys: rotate every 90 days or per provider policy.
- Database/Redis credentials: rotate every 90 days with rolling deployment support.

Emergency rotation checklist:

1. Revoke exposed credential at the provider.
2. Generate a replacement in the secret manager.
3. Deploy API/worker with new secret.
4. Invalidate sessions/tokens if auth secrets were affected.
5. Review audit logs for suspicious activity.
6. Run Gitleaks and remove any accidental committed secrets.

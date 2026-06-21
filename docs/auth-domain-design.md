# Auth Domain Design — User & Authentication Architecture

> **Scope:** Design-only document for the `users` domain and supporting authentication collections. No implementation, schema, or API code is included here.

---

## 1. Design Goals

- Support **email login**, **phone login**, and **password authentication**.
- Allow **multi-device login** with per-device session tracking.
- Provide a **role system** for customers, vendors, admins, delivery staff, and super-admins.
- Enable **refresh token rotation** with token-family detection.
- Support an **account verification system** (email and phone).
- Manage **account status** (active, pending, suspended, etc.).
- Support **two-factor authentication** (TOTP) for future hardening.
- Provide **failed-login protection** and **password history** enforcement.
- Remain compatible with **future OTP login** and **future social login** without changing the core user shape.

This design aligns with:

- `docs/phase-2-database-design.md` (existing `users`, `otp_codes`, `refresh_tokens` collections)
- `docs/phase-4-api-contract.md` (standard response envelope and `/api/v1` base)
- `docs/final-stack-decision.md` (OTP + JWT + Refresh Token, MongoDB, Redis, BullMQ)

---

## 2. Authentication Collections

The following collections are explicitly defined for the authentication domain:

| Collection | Responsibility |
|---|---|
| `users` | Core identity, credentials, verification state, security state, role/status. |
| `user_sessions` | Per-device login sessions and activity metadata. |
| `refresh_tokens` | Refresh token lifecycle, rotation chain, and revocation. **Never stored inside the user document.** |
| `otp_codes` | One-time password codes for phone/email verification and future OTP login. |
| `social_accounts` | (Future) third-party identity provider links. |
| `password_history` | Historical password hashes to prevent password reuse. |

---

## 3. User Entity Fields

### 3.1 Identity & Credentials

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | Primary key. |
| `email` | `string` | Lowercase, validated. Unique **sparse** index (supports phone-only users). |
| `phone` | `string` | E.164 normalized. Unique **sparse** index (supports email-only users). |
| `passwordHash` | `string` | Nullable. Argon2/bcrypt hash. Null for social or pure-OTP users. |
| `role` | `Role` | Enum. See §4. |
| `status` | `AccountStatus` | Enum. See §5. |

### 3.2 Profile

| Field | Type | Notes |
|---|---|---|
| `profile.firstName` | `string` | Optional. |
| `profile.lastName` | `string` | Optional. |
| `profile.displayName` | `string` | Auto-generated or user-defined. |
| `profile.avatarUrl` | `string` | MinIO/ CDN URL. |
| `profile.birthDate` | `Date` | Optional. |
| `profile.gender` | `string` | Optional. |
| `profile.language` | `string` | Default `fa`. |
| `profile.timezone` | `string` | Default `Asia/Tehran`. |

### 3.3 Verification Fields

| Field | Type | Notes |
|---|---|---|
| `verification.emailVerified` | `boolean` | `false` until email is confirmed. |
| `verification.phoneVerified` | `boolean` | `false` until phone is confirmed. |
| `verification.emailVerifiedAt` | `Date` | Timestamp of successful email verification. |
| `verification.phoneVerifiedAt` | `Date` | Timestamp of successful phone verification. |
| `verification.identityVerified` | `boolean` | For vendors, delivery, and admins. |
| `verification.identityVerifiedAt` | `Date` | Timestamp of KYC/admin verification. |
| `verification.verificationToken` | `string` | Latest email verification token hash. |
| `verification.verificationTokenExpiresAt` | `Date` | Expiration for the above token. |

### 3.4 Security Fields

| Field | Type | Notes |
|---|---|---|
| `security.failedLoginAttempts` | `number` | Counter for brute-force protection. |
| `security.lastFailedLoginAt` | `Date` | Timestamp of the most recent failed login attempt. |
| `security.lockedUntil` | `Date` | Account lockout expiration. Null when not locked. |
| `security.lastPasswordChangeAt` | `Date` | Used for password age policy. |
| `security.twoFactorEnabled` | `boolean` | `false` by default. |
| `security.twoFactorMethod` | `string` | `TOTP`, `SMS`, `EMAIL`, or `NONE`. Default `NONE`. |
| `security.authenticatorSecret` | `string` | Encrypted TOTP secret. Null when 2FA is disabled. |
| `security.passwordResetToken` | `string` | Hashed token for password reset. |
| `security.passwordResetTokenExpiresAt` | `Date` | Expiration for password reset token. |

### 3.5 Login & Activity

| Field | Type | Notes |
|---|---|---|
| `loginPreferences.preferredMethod` | `string` | `EMAIL`, `PHONE`, or `OTP` (future). |
| `loginPreferences.lastLoginAt` | `Date` | Last successful login. |
| `loginPreferences.lastLoginIp` | `string` | IP of last login. |
| `metadata.createdAt` | `Date` | Auto-generated. |
| `metadata.updatedAt` | `Date` | Auto-updated. |
| `metadata.createdBy` | `ObjectId` | System or admin reference. |
| `metadata.updatedBy` | `ObjectId` | System or admin reference. |

---

## 4. Role Enum

```
Role
├── SUPER_ADMIN   // Platform owner, full access
├── ADMIN         // Back-office admin with scoped permissions
├── VENDOR        // Seller / store owner
├── DELIVERY      // Courier / delivery staff
└── CUSTOMER      // End-user buyer
```

**Notes:**

- Roles are stored on the user document for fast authorization checks.
- For fine-grained access, a future `permissions` array can be added to admin/delivery/vendor profiles.
- A user can have only one primary role. If multi-role support is needed later, a `roles: string[]` field can be introduced without breaking existing logic.

---

## 5. Account Status Enum

```
AccountStatus
├── PENDING       // Registered but not verified
├── ACTIVE        // Fully functional account
├── SUSPENDED     // Temporary restriction (e.g., fraud review)
├── DEACTIVATED   // User-initiated deactivation
└── BANNED        // Permanent ban
```

**Status rules:**

- `PENDING` users cannot place orders or access wallet features.
- `SUSPENDED` users can log in but cannot perform transactions.
- `DEACTIVATED` users cannot log in but can reactivate within a grace period.
- `BANNED` users cannot authenticate at all.

---

## 6. Device Session Architecture (`user_sessions`)

A dedicated `user_sessions` collection enables **multi-device login** and gives users control over active devices.

### 6.1 Session Document

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | Session identifier. |
| `userId` | `ObjectId` | Reference to `users`. |
| `deviceId` | `string` | Stable device fingerprint. |
| `deviceType` | `string` | `MOBILE`, `DESKTOP`, `TABLET`, `WEB`, `OTHER`. |
| `deviceName` | `string` | e.g., "iPhone 15". |
| `ipAddress` | `string` | Last known IP address. |
| `userAgent` | `string` | Raw user agent string. |
| `loginAt` | `Date` | Session creation time. |
| `lastActivityAt` | `Date` | Updated on every authenticated request. |
| `expiresAt` | `Date` | TTL index for automatic cleanup. |
| `revokedAt` | `Date` | Set when the user logs out or revokes the device. |
| `isActive` | `boolean` | Computed as `revokedAt == null && expiresAt > now`. |

### 6.2 Behavior

- A new login creates a new `user_sessions` record and a new `refresh_tokens` record linked to that session.
- The access token (JWT) carries `sessionId` and `userId` claims.
- Users can list and revoke sessions (e.g., "Log out of all other devices").
- Hot sessions can be cached in Redis for fast revocation checks.

---

## 7. Refresh Token Architecture (`refresh_tokens`)

Refresh tokens are stored in a **separate collection** and are **never embedded inside the `users` document**. This supports rotation, per-device revocation, and family detection.

### 7.1 Refresh Token Document

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | Token identifier. |
| `userId` | `ObjectId` | Reference to `users`. |
| `tokenHash` | `string` | Hash of the opaque refresh token (or JWT jti). |
| `expiresAt` | `Date` | TTL index for automatic cleanup. |
| `deviceId` | `string` | Device identifier from the originating `user_sessions` record. |
| `isRevoked` | `boolean` | `true` after logout, rotation, or breach. |
| `createdAt` | `Date` | Issue time. |
| `sessionId` | `ObjectId` | Reference to `user_sessions`. |
| `replacedByTokenId` | `ObjectId` | Points to the next token in the rotation chain. |
| `revokedAt` | `Date` | Set when the token is invalidated. |
| `ipAddress` | `string` | IP that requested the token. |

### 7.2 Rotation Rules

1. Client sends a valid refresh token.
2. Server verifies the token hash and checks `isRevoked == false` and `expiresAt > now`.
3. Server issues a new access token and a **new** refresh token.
4. The old refresh token is marked as `isRevoked = true`, `revokedAt = now`, and `replacedByTokenId = newToken._id`.
5. Client receives the new refresh token and must discard the old one.

### 7.3 Family Detection (Replay Detection)

- If a client presents a **revoked** refresh token, the server inspects `replacedByTokenId`.
- If the presented token was already rotated, the entire token family for that `sessionId` is revoked.
- This prevents attackers from replaying stolen refresh tokens.

---

## 8. Password History Architecture (`password_history`)

Password history is stored in a dedicated collection to prevent users from reusing recent passwords.

### 8.1 Password History Document

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | Record identifier. |
| `userId` | `ObjectId` | Reference to `users`. |
| `passwordHash` | `string` | Historical password hash. |
| `createdAt` | `Date` | When this password was active. |

### 8.2 Behavior

- On every successful password change, the previous `passwordHash` is moved to `password_history`.
- The system keeps the last N hashes (e.g., 5) and deletes older records.
- Before accepting a new password, the server hashes the candidate and compares it against the user's recent history.

---

## 9. Failed Login Protection

The `users.security` block contains the fields needed for brute-force and account-lockout protection.

### 9.1 Fields

| Field | Type | Purpose |
|---|---|---|
| `security.failedLoginAttempts` | `number` | Incremented on every failed login. Reset on success. |
| `security.lastFailedLoginAt` | `Date` | Timestamp of the most recent failed attempt. |
| `security.lockedUntil` | `Date` | If set, authentication is blocked until this time. |

### 9.2 Behavior

- After a configured number of failed attempts (e.g., 5), `lockedUntil` is set to a future time.
- While `lockedUntil` is in the future, login attempts are rejected regardless of credential validity.
- A successful login resets `failedLoginAttempts` to `0` and clears `lockedUntil`.
- Background jobs can alert admins or send security notifications on repeated failures.

---

## 10. Two-Factor Authentication (2FA) Support

The user document reserves fields for future 2FA/TOTP support without requiring schema migration.

### 10.1 Fields

| Field | Type | Notes |
|---|---|---|
| `security.twoFactorEnabled` | `boolean` | `false` by default. |
| `security.twoFactorMethod` | `string` | `NONE`, `TOTP`, `SMS`, or `EMAIL`. |
| `security.authenticatorSecret` | `string` | Encrypted TOTP secret. Null when TOTP is disabled. |

### 10.2 Behavior

- When `twoFactorMethod == TOTP` and `twoFactorEnabled == true`, the login flow requires a TOTP code after valid password/OTP verification.
- The secret is encrypted at rest and only decrypted during 2FA setup/verification.
- Backup codes can be stored in a future `two_factor_backup_codes` collection.

---

## 11. OTP Compatibility

The existing `otp_codes` collection (from `phase-2-database-design.md`) supports both account verification and future OTP login.

### 11.1 OTP Document

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | OTP identifier. |
| `userId` | `ObjectId` | Nullable for pre-registration OTP. |
| `target` | `string` | Email or phone number. |
| `targetType` | `string` | `EMAIL` or `PHONE`. |
| `codeHash` | `string` | Hashed OTP code. |
| `purpose` | `string` | `VERIFY_EMAIL`, `VERIFY_PHONE`, `LOGIN`, `RESET_PASSWORD`. |
| `attempts` | `number` | Failed verification attempts. |
| `expiresAt` | `Date` | TTL index. |
| `usedAt` | `Date` | Set when consumed. |

### 11.2 Future OTP Login Flow

- A user with `passwordHash == null` and `phoneVerified == true` can authenticate via OTP.
- A successful OTP login creates a `user_sessions` record and a `refresh_tokens` record just like password login.

---

## 12. Social Login Compatibility (Future)

A separate `social_accounts` collection keeps the `users` collection clean and avoids migration when adding new providers.

### 12.1 Social Account Document

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | Social account identifier. |
| `userId` | `ObjectId` | Reference to `users`. |
| `provider` | `string` | `GOOGLE`, `APPLE`, `META`, etc. |
| `providerUserId` | `string` | Provider-specific user ID. |
| `email` | `string` | Email returned by provider. |
| `profile` | `object` | Provider profile snapshot. |
| `linkedAt` | `Date` | Link timestamp. |

### 12.2 Linking Flow

- A new social login with no matching `users.email` creates a `users` document with `passwordHash == null` and a linked `social_accounts` record.
- A future linking UI can attach a `social_accounts` record to an existing user.

---

## 13. Indexes Recommendation

### `users` collection

| Index | Type | Purpose |
|---|---|---|
| `{ email: 1 }` | unique, sparse | Fast email login and uniqueness. |
| `{ phone: 1 }` | unique, sparse | Fast phone login and uniqueness. |
| `{ role: 1, status: 1 }` | compound | Admin dashboards and filtered queries. |
| `{ createdAt: -1 }` | descending | Recent user lists. |
| `{ "verification.emailVerified": 1 }` | - | Marketing and compliance queries. |
| `{ "verification.phoneVerified": 1 }` | - | Same as above. |
| `{ "security.lockedUntil": 1 }` | - | Find locked accounts. |

### `user_sessions` collection

| Index | Type | Purpose |
|---|---|---|
| `{ userId: 1, isActive: 1 }` | compound | List active sessions. |
| `{ deviceId: 1, userId: 1 }` | unique, partial | One active session per device/user. |
| `{ expiresAt: 1 }` | TTL | Automatic cleanup. |
| `{ userId: 1, lastActivityAt: -1 }` | compound | Recent activity lookup. |

### `refresh_tokens` collection

| Index | Type | Purpose |
|---|---|---|
| `{ tokenHash: 1 }` | unique | Lookup during refresh. |
| `{ userId: 1, isRevoked: 1 }` | compound | List active tokens for a user. |
| `{ expiresAt: 1 }` | TTL | Automatic cleanup. |
| `{ sessionId: 1 }` | - | Revoke all tokens for a session. |
| `{ deviceId: 1, userId: 1 }` | - | Device-specific token lookup. |

### `otp_codes` collection

| Index | Type | Purpose |
|---|---|---|
| `{ target: 1, purpose: 1, createdAt: -1 }` | compound | Latest OTP lookup. |
| `{ expiresAt: 1 }` | TTL | Automatic cleanup. |

### `password_history` collection

| Index | Type | Purpose |
|---|---|---|
| `{ userId: 1, createdAt: -1 }` | compound | Latest passwords for reuse checks. |
| `{ userId: 1, passwordHash: 1 }` | compound | Exact hash lookup during password change. |

### `social_accounts` collection (future)

| Index | Type | Purpose |
|---|---|---|
| `{ provider: 1, providerUserId: 1 }` | unique | Provider user lookup. |
| `{ userId: 1 }` | - | List social accounts for a user. |

---

## 14. Relationships Recommendation

```text
users
├── 1:N  addresses
├── 1:N  cart
├── 1:N  orders
├── 1:N  user_sessions
├── 1:N  refresh_tokens
├── 1:N  otp_codes
├── 1:N  password_history
├── 1:N  social_accounts   (future)
├── 1:1  wallet            (future)
├── 1:1  vendor_profile    (future, optional)
├── 1:1  delivery_profile  (future, optional)
└── 1:1  admin_profile     (future, optional)
```

**Guidelines:**

- Keep `users` focused on authentication, identity, and status.
- Put role-specific business data (store info, vehicle info, admin permissions) in dedicated collections to keep the user document small and avoid sparse fields.
- Use `userId` as the foreign key in all related collections.
- Avoid embedding arrays that grow indefinitely (e.g., login history, refresh tokens, password history) inside the `users` document; use dedicated collections instead.

---

## 15. Future Scalability Notes

1. **Redis for hot auth data:** Store active session IDs, refresh-token blocklists, and rate-limit counters in Redis for fast lookups.
2. **BullMQ for background jobs:** Use queues for sending verification emails/SMS, cleaning expired sessions, and processing account deactivation.
3. **RBAC extension:** Add a `permissions: string[]` field to admin/vendor profiles if fine-grained access control is needed beyond roles.
4. **Audit logging:** Add an `audit_logs` collection for security events (login, password change, token revocation, role change).
5. **Multi-role support:** If needed later, replace `role: string` with `roles: string[]` and migrate existing users.
6. **Social providers:** Add new providers by inserting into `social_accounts`; no user schema change required.
7. **Passwordless/OTP:** Add `passwordHash == null` users and implement an OTP login path using the existing `otp_codes` collection.
8. **Device trust:** Introduce a `trustedDevices` list and step-up authentication for sensitive actions.

---

## 16. What Is NOT Defined Here

- No Mongoose schemas, interfaces, or DTOs.
- No API endpoints or route definitions.
- No service, repository, or controller code.
- No JWT signing secrets or runtime configuration.
- No implementation details for password hashing, OTP generation, or SMS/email providers.

This document is intended as the reference for the implementation phase that follows.

# Auth Service

A production-minded Node.js + Express + MongoDB authentication REST API with email verification, password reset, short-lived access tokens, rotating refresh tokens, account lockout, and role-based authorization.

## Features

- User registration with strict input validation
- Password hashing with bcrypt
- Email verification with expiring, hashed one-time tokens
- Login with short-lived JWT access tokens
- Rotating refresh tokens stored as SHA-256 hashes
- Logout that revokes the refresh session
- Password reset with expiring, hashed one-time tokens
- Password reset revokes existing refresh sessions
- Account lockout after repeated failed logins
- Protected Bearer-token routes
- Role-based access control (`user` / `admin`)
- Rate limiting for authentication and email flows
- Helmet security headers and hardened Express settings
- Production-safe error responses
- Environment validation at startup
- Graceful MongoDB/server shutdown
- Docker and Docker Compose support
- GitHub Actions CI

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express |
| Database | MongoDB + Mongoose |
| Authentication | JWT + rotating refresh tokens |
| Password hashing | bcryptjs |
| Email | Nodemailer |
| Validation | express-validator |
| Security | Helmet, CORS, rate limiting |
| Tests | Jest + Supertest |
| Containers | Docker Compose |

## Quick start

### Install

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env
```

Generate a strong `JWT_SECRET` (at least 32 characters) and provide your MongoDB and SMTP credentials.

### Start MongoDB

With Docker:

```bash
docker compose up -d mongo
```

Or use MongoDB Atlas and put its connection string in `MONGO_URI`.

### Run

```bash
npm run dev
# production
npm start
# tests
npm test
```

## Docker

Run the complete local stack:

```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`. Before exposing the Compose setup publicly, replace the example JWT and SMTP values and use a proper secrets manager.

## API

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| GET | `/api/auth/verify-email/:token` | No | Verify email |
| POST | `/api/auth/resend-verification` | No | Resend verification |
| POST | `/api/auth/login` | No | Login and issue access/refresh tokens |
| POST | `/api/auth/refresh` | No | Rotate refresh token |
| POST | `/api/auth/logout` | Bearer | Revoke refresh session |
| GET | `/api/auth/me` | Bearer | Current user |
| GET | `/api/auth/admin` | Admin | Example RBAC-protected endpoint |
| POST | `/api/auth/forgot-password` | No | Send reset email |
| POST | `/api/auth/reset-password/:token` | No | Set a new password |
| GET | `/health` | No | Service health |

## Authentication flow

1. Register.
2. Verify the email using the one-time link.
3. Login to receive a short-lived access token and refresh token.
4. Send the access token as `Authorization: Bearer <token>`.
5. When the access token expires, call `/api/auth/refresh` with the refresh token.
6. Store the newly returned refresh token and discard the old one.
7. Call `/api/auth/logout` to revoke the refresh session.
8. A password reset also revokes the refresh session.

Refresh tokens are returned in JSON in this API. For a browser application, consider moving refresh tokens to secure, `HttpOnly`, `SameSite` cookies and adding the corresponding CSRF protections.

## CI

Every push to `main` and every pull request targeting `main` runs the Jest test suite through GitHub Actions with MongoDB available as a service.

## Security notes

- Verification, reset, and refresh tokens are stored as hashes rather than plaintext.
- Access tokens expire quickly by default.
- Refresh tokens rotate on every refresh.
- Password reset revokes the current refresh session.
- Login attempts are throttled and temporarily locked after repeated failures.
- Production errors do not expose internal exception messages.
- CORS accepts only configured origins.
- `x-powered-by` is disabled.
- Never put credentials, API keys, SMTP passwords, or JWT secrets in source control.

## Future enhancements

Possible next steps are OAuth/OIDC, TOTP-based MFA, Redis-backed distributed rate limiting, refresh-token families for multi-device sessions, audit logging, OpenAPI/Swagger documentation, and deployment-specific secret management.

# Auth Service

A beginner-friendly Node.js + Express + MongoDB authentication REST API.

## Features

- ✅ User registration with input validation
- ✅ Email verification (24-hour expiry)
- ✅ Login with JWT
- ✅ Account lockout after 5 failed attempts
- ✅ Forgot / reset password via email
- ✅ Protected routes via Bearer token
- ✅ Rate limiting on all auth endpoints
- ✅ Security headers via Helmet

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Database | MongoDB via Mongoose |
| Auth | JWT (jsonwebtoken) |
| Password | bcryptjs |
| Email | Nodemailer |
| Validation | express-validator |
| Rate limiting | express-rate-limit |

## Project structure

```
auth-service/
├── src/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   └── authController.js  # All auth logic
│   ├── middleware/
│   │   ├── auth.js            # JWT protect middleware
│   │   └── errorHandler.js    # Central error handler
│   ├── models/
│   │   └── User.js            # User schema
│   ├── routes/
│   │   └── auth.js            # Route definitions + validators
│   ├── utils/
│   │   ├── email.js           # Nodemailer helpers
│   │   └── jwt.js             # Token helpers
│   ├── app.js                 # Express app setup
│   └── index.js               # Entry point
├── tests/
│   └── auth.test.js
├── .env.example
└── package.json
```

## Quick start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Set up email (choose one)

**Option A — Mailtrap (recommended for development)**
1. Sign up at https://mailtrap.io (free)
2. Go to Email Testing → Inboxes → SMTP Settings
3. Copy the credentials into `.env`

**Option B — Gmail**
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password  # Use App Password, not real password
```

### 4. Start MongoDB
```bash
# With Docker:
docker run -d -p 27017:27017 --name mongo mongo:7

# Or use MongoDB Atlas (cloud) — paste the connection string in MONGO_URI
```

### 5. Run
```bash
npm run dev   # development with auto-reload
npm start     # production
npm test      # run tests
```

## API endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| GET | `/api/auth/verify-email/:token` | No | Verify email |
| POST | `/api/auth/resend-verification` | No | Resend verify email |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Bearer | Get current user |
| POST | `/api/auth/forgot-password` | No | Send reset email |
| POST | `/api/auth/reset-password/:token` | No | Set new password |
| GET | `/health` | No | Health check |

## Example requests

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ali","email":"ali@example.com","password":"SecurePass1"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@example.com","password":"SecurePass1"}'
```

### Access protected route
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## What's next (Phase 2)

- Refresh tokens (long-lived, rotating)
- Google / GitHub OAuth login
- Role-based access control (admin vs user)
- Two-factor authentication (TOTP)
- Docker + Docker Compose setup

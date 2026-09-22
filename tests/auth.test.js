const request = require('supertest');

process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

const app = require('../src/app');

jest.mock('../src/utils/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/models/User', () => {
  const users = {};
  const makeUser = (data) => {
    const user = {
      ...data,
      _id: data._id || 'test-id-123',
      role: data.role || 'user',
      isVerified: data.isVerified ?? false,
      loginAttempts: data.loginAttempts || 0,
      save: jest.fn().mockResolvedValue(true),
      isLocked: jest.fn(() => false),
      comparePassword: jest.fn().mockResolvedValue(true),
      incrementLoginAttempts: jest.fn().mockResolvedValue(true),
    };
    return user;
  };

  return {
    findOne: jest.fn((query) => {
      const email = query?.email;
      const tokenHash = query?.refreshTokenHash || query?.emailVerifyToken || query?.passwordResetToken;
      const user = email ? users[email] : Object.values(users).find((item) =>
        (query.refreshTokenHash && item.refreshTokenHash === tokenHash) ||
        (query.emailVerifyToken && item.emailVerifyToken === tokenHash) ||
        (query.passwordResetToken && item.passwordResetToken === tokenHash)
      );

      const result = user || null;
      if (result) {
        result.select = jest.fn(() => Promise.resolve(result));
      }
      return Promise.resolve(result);
    }),
    findById: jest.fn((id) => Promise.resolve(Object.values(users).find((u) => String(u._id) === String(id)) || null)),
    create: jest.fn((data) => {
      const user = makeUser(data);
      users[data.email] = user;
      return Promise.resolve(user);
    }),
  };
});

describe('Auth API', () => {
  it('GET /health returns service status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'auth-service' });
  });

  it('rejects registration with missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.statusCode).toBe(400);
  });

  it('rejects weak passwords', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'weak@example.com',
      password: 'weak',
    });
    expect(res.statusCode).toBe(400);
  });

  it('registers a valid user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'newuser@example.com',
      password: 'SecurePass1',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('rejects invalid login email format', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'not-an-email',
      password: 'SecurePass1',
    });
    expect(res.statusCode).toBe(400);
  });

  it('requires a refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.statusCode).toBe(400);
  });

  it('requires authentication for /me', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.statusCode).toBe(404);
  });
});

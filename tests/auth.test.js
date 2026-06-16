const request = require('supertest');
const app = require('../src/app');

// Mock mongoose & email so tests don't need a real DB or SMTP
jest.mock('../src/config/db', () => jest.fn());
jest.mock('../src/utils/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/models/User', () => {
  const users = {};
  return {
    findOne: jest.fn(({ email }) =>
      Promise.resolve(users[email] || null)
    ),
    create: jest.fn((data) => {
      const user = {
        ...data,
        _id: 'test-id-123',
        save: jest.fn().mockResolvedValue(true),
      };
      users[data.email] = user;
      return Promise.resolve(user);
    }),
  };
});

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('returns 400 when fields are missing', async () => {
      const res = await request(app).post('/api/auth/register').send({});
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for weak password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'weak',
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 201 for valid registration', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'newuser@example.com',
        password: 'SecurePass1',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when fields are missing', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'not-an-email',
        password: 'SecurePass1',
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /health', () => {
    it('returns 200 and status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs up a new user and returns an access token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'new-user@example.com', password: 'password1234' })
      .expect(201);

    expect(response.body).toMatchObject({ user: { email: 'new-user@example.com' } });
    expect(typeof response.body.accessToken).toBe('string');
    expect(typeof response.body.refreshToken).toBe('string');
  });

  it('rejects signup with an already registered email', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'duplicate@example.com', password: 'password1234' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'duplicate@example.com', password: 'another-password' })
      .expect(409);

    expect(response.body.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('rejects signup with an invalid email or a too-short password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password: 'password1234' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'short@example.com', password: 'short' })
      .expect(400);
  });

  it('logs in with correct credentials, case-insensitively on email', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'login-user@example.com', password: 'password1234' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'Login-User@Example.com', password: 'password1234' })
      .expect(200);

    expect(response.body).toMatchObject({ user: { email: 'login-user@example.com' } });
  });

  it('rejects login with an incorrect password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'wrong-pw@example.com', password: 'password1234' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'wrong-pw@example.com', password: 'not-the-password' })
      .expect(401);

    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects login for a non-existent user', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'password1234' })
      .expect(401);
  });

  it('returns the current user for a valid token via /auth/me', async () => {
    const signup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'me-user@example.com', password: 'password1234' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signup.body.accessToken as string}`)
      .expect(200);

    expect(response.body).toEqual({ id: signup.body.user.id, email: 'me-user@example.com' });
  });

  it('rejects /auth/me without a token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('rejects /auth/me with a malformed token', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('rotates a valid refresh token for a new token pair', async () => {
    const signup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'refresh-user@example.com', password: 'password1234' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: signup.body.refreshToken })
      .expect(200);

    expect(typeof response.body.accessToken).toBe('string');
    expect(typeof response.body.refreshToken).toBe('string');
    // Note: the access token is a deterministic JWT (same payload + same
    // second-resolution `iat`), so it can legitimately coincide with the
    // one from signup if both happen within the same second — only the
    // opaque, randomly generated refresh token is guaranteed to differ.
    expect(response.body.refreshToken).not.toBe(signup.body.refreshToken);
    expect(response.body.user).toEqual(signup.body.user);
  });

  it('rejects an unknown refresh token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-real-refresh-token' })
      .expect(401);

    expect(response.body.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('detects reuse of an already-rotated refresh token and revokes every active session', async () => {
    const signup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'reuse-user@example.com', password: 'password1234' })
      .expect(201);

    const firstRotation = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: signup.body.refreshToken })
      .expect(200);

    const reuseResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: signup.body.refreshToken })
      .expect(401);
    expect(reuseResponse.body.code).toBe('REFRESH_TOKEN_REUSED');

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: firstRotation.body.refreshToken })
      .expect(401);
  });

  it('revokes a refresh token on logout', async () => {
    const signup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'logout-user@example.com', password: 'password1234' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: signup.body.refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: signup.body.refreshToken })
      .expect(401);
  });
});

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
});

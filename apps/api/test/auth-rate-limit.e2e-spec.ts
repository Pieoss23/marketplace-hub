import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth rate limiting (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 after exceeding the login limit, before touching credentials', async () => {
    // ThrottlerGuard runs pre-handler, so a fixed (nonexistent-user) body is
    // enough: early responses are 401 from the real credential check, the
    // one past the configured limit (10/60s, see AuthController) is 429
    // without ever reaching AuthService.
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password1234' });

    for (let i = 0; i < 10; i += 1) {
      await attempt().expect(401);
    }

    const blocked = await attempt().expect(429);
    expect(typeof blocked.body.message).toBe('string');
  });
});

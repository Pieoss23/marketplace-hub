import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Listings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const validPayload = {
    title: 'Mechanical keyboard',
    description: 'Used mechanical keyboard in good condition.',
    price: { amountMinor: 7500, currency: 'EUR' },
    images: [{ url: 'https://example.test/keyboard.jpg', position: 0 }],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.listingImage.deleteMany();
    await prisma.listing.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, reads, updates and deletes a listing', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/listings')
      .send(validPayload)
      .expect(201);

    expect(createResponse.body).toMatchObject({
      title: validPayload.title,
      price: validPayload.price,
    });
    const id = createResponse.body.id as string;

    const getResponse = await request(app.getHttpServer()).get(`/api/listings/${id}`).expect(200);
    expect(getResponse.body.id).toBe(id);

    const listResponse = await request(app.getHttpServer()).get('/api/listings').expect(200);
    expect(listResponse.body).toHaveLength(1);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/listings/${id}`)
      .send({ title: 'Mechanical keyboard, RGB' })
      .expect(200);
    expect(updateResponse.body.title).toBe('Mechanical keyboard, RGB');

    await request(app.getHttpServer()).delete(`/api/listings/${id}`).expect(204);
    await request(app.getHttpServer()).get(`/api/listings/${id}`).expect(404);
  });

  it('returns structured validation errors for an invalid listing', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/listings')
      .send({ ...validPayload, title: '   ' })
      .expect(400);

    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors[0]).toMatchObject({ field: 'title' });
  });
});

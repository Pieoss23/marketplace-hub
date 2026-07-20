import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Publications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.publication.deleteMany();
    await prisma.marketplaceConfiguration.deleteMany();
    await prisma.listingImage.deleteMany();
    await prisma.listing.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('publishes a listing with mock and reads its independent state', async () => {
    const listingResponse = await request(app.getHttpServer())
      .post('/api/listings')
      .send({
        title: 'Mechanical keyboard',
        description: 'Used mechanical keyboard in good condition.',
        price: { amountMinor: 7500, currency: 'EUR' },
        images: [{ url: 'https://example.test/keyboard.jpg', position: 0 }],
      })
      .expect(201);
    const listingId = listingResponse.body.id as string;

    const publicationResponse = await request(app.getHttpServer())
      .post(`/api/listings/${listingId}/publications/mock`)
      .send({ category: 'electronics' })
      .expect(201);

    expect(publicationResponse.body).toMatchObject({
      success: true,
      publication: {
        listingId,
        marketplaceId: 'mock',
        status: 'published',
      },
      errors: [],
    });

    const listResponse = await request(app.getHttpServer())
      .get(`/api/listings/${listingId}/publications`)
      .expect(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0]).toMatchObject({
      id: publicationResponse.body.publication.id,
      status: 'published',
    });
  });
});

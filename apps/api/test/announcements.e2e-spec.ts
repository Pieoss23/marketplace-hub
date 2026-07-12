import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Announcements (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const validPayload = {
    title: 'Tastiera meccanica vintage',
    description: 'Bellissima tastiera meccanica IBM Model M del 1989.',
    priceAmount: 15000,
    currency: 'EUR',
    categoryCode: 'electronics',
    condition: 'USED_GOOD',
    quantity: 1,
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
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.announcementPublication.deleteMany();
    await prisma.announcementChannel.deleteMany();
    await prisma.announcement.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a valid draft as READY', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/announcements')
      .send(validPayload)
      .expect(201);

    expect(response.body).toMatchObject({
      title: validPayload.title,
      status: 'READY',
      channels: [],
    });
  });

  it('retrieves an announcement by id', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/announcements')
      .send(validPayload)
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/announcements/${created.body.id}`)
      .expect(200);

    expect(response.body.id).toBe(created.body.id);
  });

  it('returns 404 for a missing announcement', async () => {
    await request(app.getHttpServer()).get('/api/announcements/does-not-exist').expect(404);
  });

  it('updates an announcement in place', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/announcements')
      .send(validPayload)
      .expect(201);

    const response = await request(app.getHttpServer())
      .put(`/api/announcements/${created.body.id}`)
      .send({ ...validPayload, title: 'Tastiera meccanica vintage, edizione limitata' })
      .expect(200);

    expect(response.body.title).toBe('Tastiera meccanica vintage, edizione limitata');
  });

  it('reports a connector-specific validation failure for a too-long title', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/announcements')
      .send({ ...validPayload, title: 'a'.repeat(81) })
      .expect(201);
    const id = created.body.id as string;

    await request(app.getHttpServer())
      .put(`/api/announcements/${id}/channels/mock`)
      .send({
        connectorCode: 'mock',
        enabled: true,
        configuration: { category: 'vintage_keyboards' },
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .post(`/api/announcements/${id}/channels/mock/validate`)
      .expect(200);

    expect(response.body.valid).toBe(false);
    expect(response.body.issues).toEqual([
      expect.objectContaining({ code: 'mock.title.too_long', connectorCode: 'mock' }),
    ]);
  });

  it('validates a channel successfully for a compliant announcement', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/announcements')
      .send(validPayload)
      .expect(201);
    const id = created.body.id as string;

    await request(app.getHttpServer())
      .put(`/api/announcements/${id}/channels/mock`)
      .send({
        connectorCode: 'mock',
        enabled: true,
        configuration: { category: 'vintage_keyboards' },
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .post(`/api/announcements/${id}/channels/mock/validate`)
      .expect(200);

    expect(response.body).toMatchObject({ valid: true, issues: [] });
  });

  it('publishes successfully through the mock connector', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/announcements')
      .send(validPayload)
      .expect(201);
    const id = created.body.id as string;

    await request(app.getHttpServer())
      .put(`/api/announcements/${id}/channels/mock`)
      .send({
        connectorCode: 'mock',
        enabled: true,
        configuration: { category: 'vintage_keyboards' },
      })
      .expect(200);

    const publishResponse = await request(app.getHttpServer())
      .post(`/api/announcements/${id}/channels/mock/publish`)
      .expect(200);

    expect(publishResponse.body).toMatchObject({ status: 'PUBLISHED', connectorCode: 'mock' });
    expect(publishResponse.body.externalListingId).toMatch(/^mock_/);

    const announcement = await request(app.getHttpServer())
      .get(`/api/announcements/${id}`)
      .expect(200);
    expect(announcement.body.status).toBe('PUBLISHED');
  });

  it('blocks publishing when the announcement fails general validation', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/announcements')
      .send({ ...validPayload, currency: 'USD' })
      .expect(201);
    const id = created.body.id as string;
    expect(created.body.status).toBe('DRAFT');

    await request(app.getHttpServer())
      .put(`/api/announcements/${id}/channels/mock`)
      .send({
        connectorCode: 'mock',
        enabled: true,
        configuration: { category: 'vintage_keyboards' },
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .post(`/api/announcements/${id}/channels/mock/publish`)
      .expect(422);

    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('blocks publishing when the channel is not enabled', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/announcements')
      .send(validPayload)
      .expect(201);
    const id = created.body.id as string;

    await request(app.getHttpServer())
      .put(`/api/announcements/${id}/channels/mock`)
      .send({
        connectorCode: 'mock',
        enabled: false,
        configuration: { category: 'vintage_keyboards' },
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .post(`/api/announcements/${id}/channels/mock/publish`)
      .expect(409);

    expect(response.body.code).toBe('CHANNEL_NOT_ENABLED');
  });

  it('lists publication attempts for an announcement, most recent first', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/announcements')
      .send(validPayload)
      .expect(201);
    const id = created.body.id as string;

    await request(app.getHttpServer())
      .put(`/api/announcements/${id}/channels/mock`)
      .send({
        connectorCode: 'mock',
        enabled: true,
        configuration: { category: 'vintage_keyboards' },
      })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/announcements/${id}/channels/mock/publish`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/api/announcements/${id}/publications`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ status: 'PUBLISHED', connectorCode: 'mock' });
  });
});

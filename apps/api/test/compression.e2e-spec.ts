import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Compression (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(compression());

    const swaggerConfig = new DocumentBuilder().setTitle('Marketplace Hub API').build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('compresses a response body over the default threshold', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    expect(response.headers['content-encoding']).toBe('gzip');
  });
});

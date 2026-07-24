import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>('app');

  // Without this, lifecycle destroy hooks (PrismaService.onModuleDestroy ->
  // $disconnect) only run on an explicit app.close(), never on a real
  // SIGTERM/SIGINT from a process manager or container runtime.
  app.enableShutdownHooks();

  app.setGlobalPrefix(appConfig.globalPrefix);
  app.enableCors({ origin: appConfig.corsOrigin });
  // CSP is disabled: it targets server-rendered HTML, and would otherwise
  // block the inline scripts/styles the Swagger UI page below depends on.
  // Every other helmet protection (nosniff, frame options, HSTS, etc.) stays on.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Marketplace Hub API')
    .setDescription('Backend API for Marketplace Hub')
    .setVersion('0.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${appConfig.globalPrefix}/docs`, app, swaggerDocument);

  await app.listen(appConfig.port);
}

void bootstrap();

import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let queryRaw: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } as unknown as PrismaService },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('delegates to HealthService and returns its result', () => {
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('marketplace-hub-api');
  });

  it('returns a ready body and a 200 status when the database is up', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const res = { status: jest.fn() } as unknown as Response;

    const result = await controller.ready(res);

    expect(result.status).toBe('ready');
    expect(result.database).toBe('up');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns a not_ready body and a 503 status when the database is down', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));
    const res = { status: jest.fn() } as unknown as Response;

    const result = await controller.ready(res);

    expect(result.status).toBe('not_ready');
    expect(result.database).toBe('down');
    expect(res.status).toHaveBeenCalledWith(503);
  });
});

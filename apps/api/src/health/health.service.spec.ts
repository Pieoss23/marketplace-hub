import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

function buildPrisma(queryRaw: jest.Mock) {
  return { $queryRaw: queryRaw } as unknown as PrismaService;
}

async function buildService(prisma: PrismaService): Promise<HealthService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [HealthService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return module.get(HealthService);
}

describe('HealthService', () => {
  it('reports status ok with service name and an ISO timestamp', async () => {
    const service = await buildService(buildPrisma(jest.fn()));

    const result = service.check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('marketplace-hub-api');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('reports ready when the database responds', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const service = await buildService(buildPrisma(queryRaw));

    const result = await service.checkReadiness();

    expect(queryRaw).toHaveBeenCalled();
    expect(result.status).toBe('ready');
    expect(result.database).toBe('up');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('reports not_ready and swallows the error when the database is unreachable', async () => {
    const queryRaw = jest.fn().mockRejectedValue(new Error('connection refused'));
    const service = await buildService(buildPrisma(queryRaw));

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'not_ready',
      database: 'down',
      timestamp: expect.any(String),
    });
  });
});

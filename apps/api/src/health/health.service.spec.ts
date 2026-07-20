import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get(HealthService);
  });

  it('reports status ok with service name and an ISO timestamp', () => {
    const result = service.check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('marketplace-hub-api');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});

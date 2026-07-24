export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

/**
 * Readiness (as opposed to liveness): reflects whether the API can actually
 * serve traffic, i.e. reach its database. `not_ready` is returned with HTTP
 * 503 so an orchestrator stops routing traffic to this instance.
 */
export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  database: 'up' | 'down';
  timestamp: string;
}

export interface AppConfig {
  port: number;
  globalPrefix: string;
  corsOrigin: string;
}

export interface AuthConfig {
  jwtSecret: string;
  /** Access token lifetime in seconds. */
  jwtExpiresInSeconds: number;
}

const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

export default (): { app: AppConfig; auth: AuthConfig } => ({
  app: {
    port: Number(process.env.API_PORT) || 3000,
    globalPrefix: process.env.API_GLOBAL_PREFIX || 'api',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  },
  auth: {
    // Dev-only fallback: set JWT_SECRET before deploying anywhere real.
    jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
    jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS) || SEVEN_DAYS_IN_SECONDS,
  },
});

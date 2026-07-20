export interface AppConfig {
  port: number;
  globalPrefix: string;
  corsOrigin: string;
}

export default (): { app: AppConfig } => ({
  app: {
    port: Number(process.env.API_PORT) || 3000,
    globalPrefix: process.env.API_GLOBAL_PREFIX || 'api',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  },
});

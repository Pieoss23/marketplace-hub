import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT?: number;

  @IsOptional()
  @IsString()
  API_GLOBAL_PREFIX?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsString()
  @MinLength(16)
  JWT_SECRET?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  JWT_EXPIRES_IN_SECONDS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  REFRESH_TOKEN_EXPIRES_IN_SECONDS?: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.toString()}`);
  }
  return validated;
}

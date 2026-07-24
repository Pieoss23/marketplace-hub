import { IsString } from 'class-validator';
import type { LogoutRequest } from '@marketplace-hub/contracts';

export class LogoutDto implements LogoutRequest {
  @IsString()
  readonly refreshToken!: string;
}

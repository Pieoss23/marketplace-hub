import { IsString } from 'class-validator';
import type { RefreshRequest } from '@marketplace-hub/contracts';

export class RefreshDto implements RefreshRequest {
  @IsString()
  readonly refreshToken!: string;
}

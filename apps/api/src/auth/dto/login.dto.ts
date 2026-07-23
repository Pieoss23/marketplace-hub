import { IsEmail, IsString } from 'class-validator';
import type { LoginRequest } from '@marketplace-hub/contracts';

export class LoginDto implements LoginRequest {
  @IsEmail()
  readonly email!: string;

  @IsString()
  readonly password!: string;
}

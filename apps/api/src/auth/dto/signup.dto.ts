import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { SignupRequest } from '@marketplace-hub/contracts';

export class SignupDto implements SignupRequest {
  @IsEmail()
  readonly email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  readonly password!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import type { AuthResponse, PublicUserResponse } from '@marketplace-hub/contracts';

export class PublicUserDto implements PublicUserResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: PublicUserDto })
  user!: PublicUserDto;
}

export interface SignupRequest {
  readonly email: string;
  readonly password: string;
}

export type LoginRequest = SignupRequest;

export interface RefreshRequest {
  readonly refreshToken: string;
}

export type LogoutRequest = RefreshRequest;

export interface PublicUserResponse {
  readonly id: string;
  readonly email: string;
}

export interface AuthResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: PublicUserResponse;
}

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
}

export interface JwtPayload {
  readonly sub: string;
  readonly email: string;
}

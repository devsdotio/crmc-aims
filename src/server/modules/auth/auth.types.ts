import type { AppRole, ProfileStatus } from "@/server/shared/roles";

/** Credentials accepted by JSON sign-in. */
export interface SignInInput {
  email: string;
  password: string;
  /** Keep session cookies across browser restarts when true. */
  rememberMe?: boolean;
}

/**
 * OAuth2 resource-owner password fields (Swagger "Authorize" form).
 * @see RFC 6749 §4.3
 */
export interface TokenPasswordInput {
  username: string;
  password: string;
  grant_type?: string;
}

/** Safe profile slice returned after authentication (no secrets). */
export interface AuthProfileDTO {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  status: ProfileStatus;
  department: string | null;
  departmentId: string | null;
}

export interface AuthSessionDTO {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  expiresIn: number | null;
  tokenType: "bearer";
}

/** Envelope from POST /api/auth/sign-in. */
export interface SignInResultDTO {
  user: {
    id: string;
    email: string | null;
  };
  profile: AuthProfileDTO;
  session: AuthSessionDTO;
}

/**
 * OAuth2 token response shape expected by Swagger UI password flow.
 * Field names are snake_case by design (OAuth2, not our JSON camelCase convention).
 */
export interface OAuth2TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in?: number;
  refresh_token?: string;
}

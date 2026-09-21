import { NextResponse } from "next/server";

import {
  requireActor,
} from "@/server/shared/auth";
import {
  handleError,
  ok,
} from "@/server/shared/http";
import { UserService } from "@/server/modules/users/user.service";

import { AuthService } from "./auth.service";

export class AuthController {
  constructor(
    private readonly authService: AuthService = new AuthService(),
    private readonly userService: UserService = new UserService()
  ) {}

  /** JSON email/password sign-in — sets session cookies + returns access token. */
  async signIn(request: Request) {
    try {
      const body = await request.json();
      const data = await this.authService.signIn(body);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * OAuth2 password token endpoint for Swagger UI Authorize dialog.
   * Accepts `application/x-www-form-urlencoded` (standard) or JSON.
   */
  async token(request: Request) {
    try {
      const raw = await this.parseTokenBody(request);
      const token = await this.authService.issuePasswordToken(raw);
      // OAuth2 responses are the token object at the top level (no `{ data }`).
      return NextResponse.json(token);
    } catch (error) {
      return handleError(error);
    }
  }

  async signOut() {
    try {
      await this.authService.signOut();
      return ok({ signedOut: true as const });
    } catch (error) {
      return handleError(error);
    }
  }

  /** Current authenticated profile (same DTO as GET /api/me / user admin list). */
  async me() {
    try {
      const actor = await requireActor();
      const data = await this.userService.getMe(actor);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  private async parseTokenBody(request: Request): Promise<unknown> {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      return {
        username: form.get("username")?.toString() ?? "",
        password: form.get("password")?.toString() ?? "",
        grant_type: form.get("grant_type")?.toString() ?? undefined,
      };
    }

    return request.json();
  }
}

export const authController = new AuthController();

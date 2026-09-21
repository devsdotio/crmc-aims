import type { NextRequest } from "next/server";

import {
  requireActor,
  requireSession,
  requireUserManager,
} from "@/server/shared/auth";
import {
  created,
  handleError,
  ok,
} from "@/server/shared/http";

import { UserService } from "./user.service";

export class UserController {
  constructor(private readonly userService: UserService = new UserService()) {}

  async listUsers(request: NextRequest | Request) {
    try {
      const session = await requireUserManager();
      const url = new URL(request.url);
      const query = {
        role: url.searchParams.get("role") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        search: url.searchParams.get("search") ?? undefined,
        tenantId: url.searchParams.get("tenantId") ?? undefined,
      };
      const data = await this.userService.listUsersForActor(session.actor, query);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async createUser(request: NextRequest | Request) {
    try {
      const session = await requireUserManager();
      const body = await request.json();
      const data = await this.userService.createUser(body, session.actor);
      return created(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async updateUser(request: NextRequest | Request, id: string) {
    try {
      const session = await requireUserManager();
      const body = await request.json();
      const data = await this.userService.updateUser(id, body, session.actor);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async deactivateUser(id: string) {
    try {
      const session = await requireUserManager();
      const data = await this.userService.deactivateUser(id, session.actor);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async reactivateUser(id: string) {
    try {
      const session = await requireUserManager();
      const data = await this.userService.reactivateUser(id, session.actor);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  /** Lightweight session probe for any authenticated profile. */
  async sessionProbe() {
    try {
      const session = await requireSession();
      return ok({
        userId: session.actor.userId,
        email: session.actor.email,
        displayName: session.actor.displayName,
        role: session.actor.role,
      });
    } catch (error) {
      return handleError(error);
    }
  }

  async updateMe(request: NextRequest | Request) {
    try {
      const actor = await requireActor();
      const body = await request.json();
      const data = await this.userService.updateMe(body, actor);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async changePassword(request: NextRequest | Request) {
    try {
      const actor = await requireActor();
      const body = await request.json();
      const data = await this.userService.changePassword(body, actor);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }
}

export const userController = new UserController();

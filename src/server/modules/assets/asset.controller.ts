import type { NextRequest } from "next/server";

import { requireAssetOperator, requireActor } from "@/server/shared/auth";
import {
  created,
  handleError,
  noContent,
  ok,
} from "@/server/shared/http";

import { AssetModelService } from "./asset.model.service";
import { AssetService } from "./asset.service";

export class AssetController {
  constructor(
    private readonly assetService: AssetService = new AssetService(),
    private readonly modelService: AssetModelService = new AssetModelService()
  ) {}

  async listAssets(request: NextRequest | Request) {
    try {
      const session = await requireActor();
      const url = new URL(request.url);
      const { parseIncludeSandbox } = await import("@/server/shared/sandbox");
      const data = await this.assetService.listAssets({
        status: url.searchParams.get("status") ?? undefined,
        modelId: url.searchParams.get("modelId") ?? undefined,
        category: url.searchParams.get("category") ?? undefined,
        search: url.searchParams.get("search") ?? undefined,
        assignmentType: url.searchParams.get("assignmentType") ?? undefined,
        availableOnly:
          url.searchParams.get("availableOnly") ?? undefined,
        includeSandbox: parseIncludeSandbox(
          url.searchParams.get("includeSandbox"),
          session.role
        ),
      });
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async createAsset(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      const data = await this.assetService.createAsset(body, session.actor);
      return created(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async peekNextAssetCode(request: NextRequest | Request) {
    try {
      await requireActor();
      const url = new URL(request.url);
      const category = url.searchParams.get("category")?.trim();
      if (!category) {
        const { BadRequestError } = await import("@/server/shared/errors");
        throw new BadRequestError("category query parameter is required.");
      }
      return ok(await this.assetService.peekNextAssetCode(category));
    } catch (error) {
      return handleError(error);
    }
  }

  async bulkCreate(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      const data = await this.assetService.bulkCreate(body, session.actor);
      return created(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getAsset(id: string) {
    try {
      await requireActor();
      const data = await this.assetService.getAssetById(id);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async getByCode(request: NextRequest | Request) {
    try {
      await requireActor();
      const url = new URL(request.url);
      const code = url.searchParams.get("code") ?? "";
      const data = await this.assetService.getAssetByCode(code);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async resolveScan(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json().catch(() => ({}));
      const code =
        typeof body === "object" &&
        body &&
        "code" in body &&
        typeof (body as { code: unknown }).code === "string"
          ? (body as { code: string }).code
          : new URL(request.url).searchParams.get("code") ?? "";
      const data = await this.assetService.resolveScan(code);
      // session gate keeps resolve limited to authenticated ops-shell users
      void session;
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async updateAsset(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      const data = await this.assetService.updateAsset(id, body, session.actor);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async deleteAsset(id: string) {
    try {
      const session = await requireAssetOperator();
      await this.assetService.deleteAsset(id, session.actor);
      return noContent();
    } catch (error) {
      return handleError(error);
    }
  }

  async releaseAsset(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      let body: unknown = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const data = await this.assetService.releaseAsset(id, body, session.actor);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async scanRelease(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      const data = await this.assetService.scanRelease(body, session.actor);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async returnAsset(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      const data = await this.assetService.returnAsset(id, body, session.actor);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async scanReturn(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      const data = await this.assetService.scanReturn(body, session.actor);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async flagForMaintenance(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      let body: unknown = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const data = await this.assetService.flagForMaintenance(
        id,
        body,
        session.actor
      );
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async reportMissing(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      const data = await this.assetService.reportMissing(id, body, session.actor);
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  async listLifecycle(request: NextRequest | Request, id: string) {
    try {
      await requireActor();
      const url = new URL(request.url);
      const limitRaw = url.searchParams.get("limit");
      const limit = limitRaw ? Number(limitRaw) : undefined;
      const data = await this.assetService.listLifecycle(
        id,
        Number.isFinite(limit) ? limit : undefined
      );
      return ok(data);
    } catch (error) {
      return handleError(error);
    }
  }

  // ── Asset models (product catalog) ───────────────────────────────────

  async listModels(request: NextRequest | Request) {
    try {
      const session = await requireActor();
      const url = new URL(request.url);
      const { parseIncludeSandbox } = await import("@/server/shared/sandbox");
      return ok(
        await this.modelService.list({
          category: url.searchParams.get("category") ?? undefined,
          search: url.searchParams.get("search") ?? undefined,
          includeSandbox: parseIncludeSandbox(
            url.searchParams.get("includeSandbox"),
            session.role
          ),
        })
      );
    } catch (error) {
      return handleError(error);
    }
  }

  async createModel(request: NextRequest | Request) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return created(await this.modelService.create(body, session.actor));
    } catch (error) {
      return handleError(error);
    }
  }

  async getModel(id: string) {
    try {
      await requireActor();
      return ok(await this.modelService.getById(id));
    } catch (error) {
      return handleError(error);
    }
  }

  async updateModel(request: NextRequest | Request, id: string) {
    try {
      await requireAssetOperator();
      const body = await request.json();
      return ok(await this.modelService.update(id, body));
    } catch (error) {
      return handleError(error);
    }
  }

  async deleteModel(id: string) {
    try {
      await requireAssetOperator();
      await this.modelService.delete(id);
      return noContent();
    } catch (error) {
      return handleError(error);
    }
  }

  async listModelUnits(id: string) {
    try {
      await requireActor();
      return ok(await this.assetService.listUnitsForModel(id));
    } catch (error) {
      return handleError(error);
    }
  }

  async registerModelUnits(request: NextRequest | Request, id: string) {
    try {
      const session = await requireAssetOperator();
      const body = await request.json();
      return created(
        await this.assetService.registerUnits(id, body, session.actor)
      );
    } catch (error) {
      return handleError(error);
    }
  }
}

export const assetController = new AssetController();

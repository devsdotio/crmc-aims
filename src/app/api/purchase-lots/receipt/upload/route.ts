import { NextRequest } from "next/server";
import { requireAssetOperator } from "@/server/shared/auth";
import { BadRequestError } from "@/server/shared/errors";
import { handleError, ok } from "@/server/shared/http";
import { uploadReceiptFile } from "@/server/shared/storage";
import { PurchaseLotService } from "@/server/modules/purchase-lots/purchase-lot.service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAssetOperator();
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    if (!file || typeof file === "string") {
      throw new BadRequestError("No receipt file provided.");
    }

    const poNumber = (formData.get("poNumber") as string) || undefined;
    const lotId = (formData.get("lotId") as string) || undefined;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadReceiptFile(
      buffer,
      file.name,
      file.type,
      poNumber,
      session.actor.tenantId
    );

    let updatedLot = null;
    if (lotId) {
      const service = new PurchaseLotService();
      updatedLot = await service.updatePurchaseOrder(
        lotId,
        { receiptUrl: uploadResult.url },
        session.actor
      );
    }

    return ok({
      success: true,
      url: uploadResult.url,
      path: uploadResult.path,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
      originalName: uploadResult.originalName,
      lot: updatedLot,
    });
  } catch (error) {
    return handleError(error);
  }
}

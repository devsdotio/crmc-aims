import { BorrowRequestService } from "@/server/modules/borrow-requests/borrow-request.service";
import { requireActor } from "@/server/shared/auth";
import { handleError, ok } from "@/server/shared/http";

export async function GET(request: Request) {
  try {
    const session = await requireActor();
    const borrowRequestService = new BorrowRequestService();
    const requests = await borrowRequestService.list({ limit: 1000 }, session);
    
    type FlattenedLog = {
      id: string;
      requestId: string;
      requestCode: string;
      department: string;
      action: string;
      actor: string;
      timestamp: string;
      note?: string;
    };
    
    const logs: FlattenedLog[] = [];
    
    for (const req of requests.data) {
      if (!req.history) continue;
      for (const h of req.history) {
        logs.push({
          id: h.id || `${req.id}-${h.timestamp}`,
          requestId: req.id,
          requestCode: req.requestCode,
          department: req.department || "",
          action: h.action,
          actor: h.actor,
          timestamp: h.timestamp,
          note: h.note,
        });
      }
    }
    
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return ok(logs);
  } catch (error) {
    return handleError(error);
  }
}

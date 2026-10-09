import type { NextRequest } from "next/server";

import { pettyCashController } from "@/server/modules/petty-cash";

export async function GET(request: NextRequest) {
  return pettyCashController.nextCode(request);
}

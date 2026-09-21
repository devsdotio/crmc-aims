# API Reference

API endpoints are documented with **Swagger (OpenAPI)**, generated from JSDoc annotations on Next.js route handlers via `next-swagger-doc`, served with `swagger-ui-react`.

## Setup

```bash
npm install next-swagger-doc swagger-ui-react
npm install -D @types/swagger-ui-react
```

`src/lib/swagger.ts`:

```ts
import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = () => {
  return createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "CRMC Property Custodian Inventory API",
        version: "1.0.0",
      },
    },
  });
};
```

`src/app/api/docs/page.tsx` (renders the Swagger UI):

```tsx
import { getApiDocs } from "@/lib/swagger";
import ReactSwagger from "./react-swagger";

export default async function ApiDocPage() {
  const spec = getApiDocs();
  return <ReactSwagger spec={spec} />;
}
```

`src/app/api/docs/react-swagger.tsx` (client component wrapping swagger-ui-react — required since swagger-ui-react is not SSR-safe):

```tsx
"use client";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function ReactSwagger({ spec }: { spec: Record<string, unknown> }) {
  return <SwaggerUI spec={spec} />;
}
```

## Annotating a Route Handler

Add a `@swagger` JSDoc block above each route handler:

```ts
/**
 * @swagger
 * /api/assets:
 *   get:
 *     summary: List all assets
 *     tags: [Assets]
 *     responses:
 *       200:
 *         description: List of assets
 */
export async function GET() {
  // ...
}
```

Once annotated, the spec is available at `/api/docs`.

## Planned Endpoints (draft — expand as built)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/docs` | Swagger UI for interactive API documentation |
| GET | `/api/health` | Health check endpoint |
| GET | `/api/assets` | List assets |
| POST | `/api/assets` | Create a new coded asset |
| GET | `/api/assets/:id` | Get a single asset |
| PATCH | `/api/assets/:id` | Update an existing coded asset |
| DELETE | `/api/assets/:id` | Delete a coded asset |
| POST | `/api/assets/:id/release` | Scan/release an asset to a borrower |
| POST | `/api/assets/:id/return` | Scan an asset back in, log condition |
| GET | `/api/consumables` | List consumables + stock levels |
| POST | `/api/consumables/:id/adjust` | Adjust stock (restock, correction) |
| GET | `/api/requests` | List borrow requests (filter by status) |
| POST | `/api/requests` | Public: submit a new borrow/request |
| POST | `/api/requests/:id/confirm` | Custodian confirms/releases a request |
| GET | `/api/dashboard/summary` | Current stock, active borrows, overdue counts |

Keep this table in sync as routes are added — it doubles as a quick reference for your dev partner without opening Swagger.
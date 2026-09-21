import { createSwaggerSpec } from "next-swagger-doc";

export function getApiDocs() {
  return createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "CRMC-AIMS API",
        version: "1.0.0",
        description: [
          "API for CRMC Asset & Inventory Management System.",
          "",
          "## Authentication",
          "",
          "Most endpoints require an authenticated **staff / admin / borrower** session.",
          "",
          "### In Swagger UI",
          "1. Click **Authorize**.",
          "2. Under **bearerAuth (OAuth2 password)**, enter your account **email** as username and your **password**.",
          "3. Click **Authorize** — Swagger stores the access token and sends `Authorization: Bearer <token>` on Try it out.",
          "",
          "Alternatively call `POST /api/auth/sign-in`, then paste `data.session.accessToken` into **Authorize → bearerJwt (http, Bearer)**.",
          "",
          "Sign-in also sets HTTP-only Supabase cookies (useful when calling from the browser).",
          "",
          "### Roles",
          "- `superadmin` — bootstrap / platform",
          "- `admin` — user management + operations",
          "- `staff` — browse-only in the ops shell (no asset/inventory mutations this phase)",
          "- `borrower` — department portal login (one account per department)",
        ].join("\n"),
      },
      tags: [
        {
          name: "Auth",
          description:
            "Sign-in, sign-out, session profile, and OAuth2 token for Swagger.",
        },
        { name: "System", description: "System and health endpoints" },
        { name: "Assets", description: "Coded assets, bulk models, QR scan custody" },
        { name: "Consumables", description: "Consumable stock + supplier lot QR release" },
        {
          name: "ConsumableRequests",
          description:
            "Multi-product consumable issue queue (request → approve → lot-aware release)",
        },
        {
          name: "BorrowRequests",
          description: "Short-term borrow request queue (borrowable assets)",
        },
        {
          name: "BorrowLog",
          description: "Active borrow custody transactions (release / return / overdue)",
        },
        { name: "Requests", description: "Borrow and release requests (legacy tag)" },
        { name: "Dashboard", description: "Admin dashboard data" },
        { name: "Users", description: "User account administration" },
        { name: "Departments", description: "Department master data and department logins" },
        { name: "Projects", description: "Projects, expenses, and assignments" },
        { name: "Reports", description: "Operational reports, inventory analytics, and CSV exports" },
      ],
      // Default: require JWT (OAuth2 password *or* raw Bearer JWT).
      security: [{ bearerAuth: [] }, { bearerJwt: [] }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "oauth2",
            description:
              "Password flow against POST /api/auth/token. Use your account email as username.",
            flows: {
              password: {
                tokenUrl: "/api/auth/token",
                scopes: {},
              },
            },
          },
          bearerJwt: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
              "Paste `data.session.accessToken` from POST /api/auth/sign-in.",
          },
        },
      },
    },
  });
}

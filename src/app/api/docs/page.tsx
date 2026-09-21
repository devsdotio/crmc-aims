import SwaggerStandalone from "./swagger-standalone";

export const dynamic = "force-dynamic";

export default function ApiDocsPage() {
  return <SwaggerStandalone specUrl="/api/docs/spec" />;
}

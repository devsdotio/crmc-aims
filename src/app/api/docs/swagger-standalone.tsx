"use client";

import { useEffect } from "react";

type SwaggerStandaloneProps = {
  specUrl: string;
};

declare global {
  interface Window {
    SwaggerUIBundle?: (options: Record<string, unknown>) => unknown;
  }
}

/**
 * Swagger UI shell.
 *
 * Root layout uses `overflow-hidden` + `h-full` for the app shell — this page
 * owns a scoped scroll container so the OpenAPI document can scroll independently.
 */
export default function SwaggerStandalone({ specUrl }: SwaggerStandaloneProps) {
  useEffect(() => {
    const styleId = "swagger-ui-style";
    const overrideStyleId = "swagger-ui-overrides";
    const scriptId = "swagger-ui-script";

    const mountSwagger = () => {
      if (!window.SwaggerUIBundle) {
        return;
      }

      window.SwaggerUIBundle({
        dom_id: "#swagger-ui",
        url: specUrl,
        deepLinking: true,
        docExpansion: "list",
        persistAuthorization: true,
        tryItOutEnabled: true,
        // withCredentials: session cookies set by sign-in also work for Try it out
        withCredentials: true,
        // OAuth2 password scheme is sufficient; no external redirect needed
        oauth2RedirectUrl: undefined,
      });
    };

    if (!document.getElementById(styleId)) {
      const link = document.createElement("link");
      link.id = styleId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
      document.head.appendChild(link);
    }

    if (!document.getElementById(overrideStyleId)) {
      const style = document.createElement("style");
      style.id = overrideStyleId;
      style.textContent = `
        /* Live inside the app shell: no extra outer overflow lock. */
        #swagger-ui,
        #swagger-ui .swagger-ui {
          min-height: 0;
        }
        #swagger-ui .swagger-ui .wrapper {
          padding-bottom: 2rem;
        }
        /* Keep long operation panels readable inside the scroll container. */
        #swagger-ui .swagger-ui .scheme-container {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #fafafa;
        }
      `;
      document.head.appendChild(style);
    }

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.SwaggerUIBundle) {
        mountSwagger();
      } else {
        existingScript.addEventListener("load", mountSwagger, { once: true });
      }

      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.async = true;
    script.addEventListener("load", mountSwagger, { once: true });
    document.body.appendChild(script);
  }, [specUrl]);

  return (
    <div className="h-full w-full overflow-y-auto bg-white">
      <div id="swagger-ui" className="w-full" />
    </div>
  );
}

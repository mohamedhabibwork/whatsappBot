import { Hono } from "hono";
import { getOpenApiDocument } from "@repo/trpc/server";

export const swaggerRouter = new Hono();

// Auto-generated OpenAPI document from tRPC router
// Any procedure with .meta({ openapi: {...} }) will be included automatically
// REST endpoints are available at /api/rest/<path> (e.g., /api/rest/auth/login)
// The OpenAPI document includes all tRPC procedures with openapi metadata

// Serve OpenAPI JSON
swaggerRouter.get("/openapi.json", (c) => {
  const openApiDocument = getOpenApiDocument();
  return c.json(openApiDocument);
});

// Serve Swagger UI HTML
swaggerRouter.get("/", (c) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Bot API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
      window.ui = ui;
    };
  </script>
</body>
</html>
  `;
  return c.html(html);
});


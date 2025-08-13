import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';
import path from 'path';
import fs from 'fs';

const specsPath = path.resolve(process.cwd(), 'dist/swagger.json');
const specs = JSON.parse(fs.readFileSync(specsPath, 'utf8'));

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(null, {
    swaggerOptions: {
      url: '/swagger.json',
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    },
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Looper API Documentation",
  }));

  // Serve raw swagger JSON
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}

export default specs;
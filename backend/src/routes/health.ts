import { Router, Request, Response } from 'express';

const router = Router();

interface HealthCheckResponse {
  status: string;
  service: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: string;
    mlService: string;
    satelliteProvider: string;
    llmProvider: string;
  };
}

router.get('/', (req: Request, res: Response) => {
  const healthCheck: HealthCheckResponse = {
    status: 'ok',
    service: 'ecosense-ai-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0-phase1',
    services: {
      database: process.env.DATABASE_URL ? 'configured' : 'not configured',
      mlService: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
      satelliteProvider: process.env.COPERNICUS_CLIENT_ID ? 'configured' : 'not configured',
      llmProvider: process.env.LLM_PROVIDER || 'fallback'
    }
  };

  res.status(200).json(healthCheck);
});

export default router;

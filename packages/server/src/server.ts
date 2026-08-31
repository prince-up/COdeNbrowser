import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sessionRoutes } from './routes/session-routes.js';
import { adminRoutes } from './routes/admin-routes.js';
import { examRoutes } from './routes/exam-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildServer() {
  const fastify = Fastify({
    logger: false,
    trustProxy: true,
  });

  fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Serve static exam room and public assets
  const publicPath = path.join(__dirname, '../public');
  fastify.register(fastifyStatic, {
    root: publicPath,
    prefix: '/',
  });

  // Health check
  fastify.get('/api/v1/health', async () => {
    return {
      status: 'HEALTHY',
      service: 'Secure Exam Browser Server & Examination Suite',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.register(sessionRoutes);
  fastify.register(adminRoutes);
  fastify.register(examRoutes);

  return fastify;
}

// Start standalone server if executed directly
if (process.argv[1]?.endsWith('server.js') || process.argv[1]?.endsWith('server.ts')) {
  const server = buildServer();
  const PORT = Number(process.env.PORT) || 8080;
  const HOST = process.env.HOST || '0.0.0.0';

  server.listen({ port: PORT, host: HOST }, (err, address) => {
    if (err) {
      console.error('Server failed to start:', err);
      process.exit(1);
    }
    console.log(`[Secure Exam Server & Exam Suite] Listening at ${address}`);
    console.log(`[Exam Room] http://localhost:${PORT}/exam-room/index.html?examId=CS-101-DEMO`);
  });
}

import type { FastifyPluginAsync } from 'fastify';
import { AuthService, type HandshakeRequest } from '../services/auth-service.js';
import { SessionService } from '../services/session-service.js';
import type { ClientHeartbeatPayload, SecurityEvent } from '@seb/core';

export const sessionRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService();
  const sessionService = new SessionService();

  // Handshake
  fastify.post<{ Body: HandshakeRequest }>('/api/v1/session/handshake', async (request, reply) => {
    const clientIp = request.ip;
    const result = authService.processHandshake(request.body, clientIp);
    if (!result.success) {
      return reply.code(403).send(result);
    }
    return reply.send(result);
  });

  // Heartbeat
  fastify.post<{ Body: ClientHeartbeatPayload }>('/api/v1/session/heartbeat', async (request, reply) => {
    const result = sessionService.processHeartbeat(request.body);
    return reply.send(result);
  });

  // Security Events Telemetry Ingestion
  fastify.post<{ Body: { events: SecurityEvent[] } }>('/api/v1/session/events', async (request, reply) => {
    if (request.body && Array.isArray(request.body.events)) {
      sessionService.recordSecurityEvents(request.body.events);
    }
    return reply.send({ success: true, count: request.body.events?.length || 0 });
  });
};

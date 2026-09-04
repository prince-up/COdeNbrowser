import type { FastifyPluginAsync } from 'fastify';
import { ExamServerDatabase } from '../store/database.js';
import { SessionService } from '../services/session-service.js';
import type { SignedExamConfigFile } from '@seb/core';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const db = ExamServerDatabase.instance;
  const sessionService = new SessionService();

  // Register / Upload Signed Exam Configuration
  fastify.post<{ Body: { config: SignedExamConfigFile; trustedPublicKeyPem?: string } }>(
    '/api/v1/admin/configs',
    async (request, reply) => {
      const { config, trustedPublicKeyPem } = request.body;
      if (!config || !config.header) {
        return reply.code(400).send({ error: 'Missing or invalid configuration object' });
      }

      if (trustedPublicKeyPem) {
        db.registerTrustedKey(config.header.keyId, trustedPublicKeyPem);
      }

      db.registerConfig(config);
      return reply.send({ success: true, configurationId: config.header.configurationId });
    }
  );

  // List Configurations
  fastify.get('/api/v1/admin/configs', async (_request, reply) => {
    const list = Array.from(db.registeredConfigs.values()).map((c) => ({
      header: c.header,
      format: c.format,
      isRevoked: db.isConfigRevoked(c.header.configurationId),
    }));
    return reply.send(list);
  });

  // Revoke Configuration
  fastify.post<{ Body: { configurationId: string } }>('/api/v1/admin/revoke', async (request, reply) => {
    const { configurationId } = request.body;
    if (!configurationId) {
      return reply.code(400).send({ error: 'configurationId is required' });
    }
    db.revokeConfig(configurationId);
    return reply.send({ success: true, configurationId, isRevoked: true });
  });

  // List Active Sessions
  fastify.get('/api/v1/admin/sessions', async (_request, reply) => {
    const sessions = (await db.getActiveSessions());
    return reply.send(sessions);
  });

  // Terminate a Session
  fastify.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/api/v1/admin/sessions/:id/terminate',
    async (request, reply) => {
      const { id } = request.params;
      const reason = request.body?.reason || 'Terminated by Proctor via Admin Dashboard';
      const success = sessionService.terminateSession(id, reason);
      if (!success) {
        return reply.code(404).send({ error: 'Session not found' });
      }
      return reply.send({ success: true, sessionId: id, status: 'EXAM_TERMINATED' });
    }
  );

  // Query Security Events
  fastify.get<{ Querystring: { sessionId?: string; severity?: string } }>(
    '/api/v1/admin/events',
    async (request, reply) => {
      let events = (await db.getSecurityEvents());
      if (request.query.sessionId) {
        events = events.filter((e) => e.sessionId === request.query.sessionId);
      }
      if (request.query.severity) {
        events = events.filter((e) => e.severity === request.query.severity);
      }
      return reply.send(events);
    }
  );
};

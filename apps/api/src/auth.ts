import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthUser {
  id: string;
  role: 'admin' | 'ward_lead';
  wardSlug?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function rbacMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Simple API key check for now - in production this would be JWT or session based
  const apiKey = request.headers['x-api-key'] as string;

  if (!apiKey) {
    return reply.code(401).send({ error: 'API key required' });
  }

  // Check against admin user IDs and ward leads
  const adminIds = process.env.ADMIN_USER_IDS?.split(',') || [];
  const wardLeads = JSON.parse(process.env.WARD_LEADS || '{}');

  const userId = apiKey; // For now, API key is the user ID

  const isAdmin = adminIds.includes(userId);
  const wardSlug = Object.keys(wardLeads).find(ward => wardLeads[ward].includes(userId));

  if (!isAdmin && !wardSlug) {
    return reply.code(403).send({ error: 'Unauthorized' });
  }

  request.user = {
    id: userId,
    role: isAdmin ? 'admin' : 'ward_lead',
    wardSlug,
  };
}

// Admin only routes
export async function adminOnly(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user || request.user.role !== 'admin') {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

// Ward lead or admin routes
export async function wardLeadOrAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.code(403).send({ error: 'Authentication required' });
  }
}

// Ward-specific access
export async function wardSpecificAccess(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.code(403).send({ error: 'Authentication required' });
  }

  const wardSlug = (request.params as any).wardSlug;
  if (request.user.role === 'ward_lead' && request.user.wardSlug !== wardSlug) {
    return reply.code(403).send({ error: 'Access denied for this ward' });
  }
}
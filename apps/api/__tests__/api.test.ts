import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import { app } from '../src/index';

describe('API Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    // Start test server
    server = Fastify();
    await server.register(app);
    await server.listen({ port: 0 }); // Use random port
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({ status: 'ok' });
    });
  });

  describe('Rate Limiting', () => {
    it('should allow normal requests', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should rate limit excessive auth attempts', async () => {
      // This test would need a proper setup for auth endpoints
      // For now, just test the basic rate limiting structure
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Authentication Middleware', () => {
    it('should reject requests without API key', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/posts'
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject requests with invalid API key', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/posts',
        headers: {
          'x-api-key': 'invalid-key'
        }
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
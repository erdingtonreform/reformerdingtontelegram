import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { authOptions, generate2FASecret, verify2FAToken } from '../src';
import speakeasy from 'speakeasy';

describe('Authentication', () => {
  describe('2FA Functions', () => {
    it('should generate a valid 2FA secret', async () => {
      const result = await generate2FASecret('test-user');
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result.secret).toBeTruthy();
      // QR code is base64 data URL, not otpauth URL
      expect(result.qrCodeUrl).toContain('data:image/png;base64,');
    });

    it('should verify valid 2FA tokens', async () => {
      const { secret } = await generate2FASecret('test-user');
      const token = speakeasy.totp({
        secret,
        encoding: 'base32',
      });
      const isValid = await verify2FAToken(secret, token);
      expect(isValid).toBe(true);
    });

    it('should reject invalid 2FA tokens', async () => {
      const { secret } = await generate2FASecret('test-user');
      const isValid = await verify2FAToken(secret, 'invalid-token');
      expect(isValid).toBe(false);
    });
  });
});

describe('Secrets Management', () => {
  describe('Secret Validation', () => {
    it('should validate required environment variables', () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        TELEGRAM_BOT_TOKEN: 'test-token',
        NEXTAUTH_SECRET: 'test-secret',
        ADMIN_USER_IDS: '123,456',
        WARD_LEADS: '{}',
      };

      const { validateProductionSecrets } = require('../src/secrets');
      const result = validateProductionSecrets();
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);

      // Restore environment
      process.env = originalEnv;
    });

    it('should identify missing required environment variables', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        // Missing DATABASE_URL and others
      };

      const { validateProductionSecrets } = require('../src/secrets');
      const result = validateProductionSecrets();
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('DATABASE_URL');
      expect(result.missing).toContain('TELEGRAM_BOT_TOKEN');

      // Restore environment
      process.env = originalEnv;
    });
  });
});
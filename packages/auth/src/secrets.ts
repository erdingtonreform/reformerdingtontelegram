import * as argon2 from "argon2";

/**
 * Secrets management utility for secure credential storage
 * In production, this would integrate with Fly.io secrets or a secure vault
 */

export interface SecretConfig {
  // Database secrets
  databaseUrl: string;

  // Telegram secrets
  telegramBotToken: string;

  // Authentication secrets
  nextAuthSecret: string;
  twoFactorSecrets: Record<string, string>; // userId -> TOTP secret

  // API keys
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;

  // Admin configuration
  adminUserIds: string[];
  wardLeads: Record<string, string[]>;
}

/**
 * Hash sensitive data before storage
 */
export async function hashSecret(secret: string): Promise<string> {
  return await argon2.hash(secret, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Verify hashed secret
 */
export async function verifySecret(hashedSecret: string, secret: string): Promise<boolean> {
  try {
    return await argon2.verify(hashedSecret, secret);
  } catch {
    return false;
  }
}

/**
 * Load secrets from environment variables
 * In production, this would load from Fly.io secrets
 */
export function loadSecrets(): SecretConfig {
  const config: SecretConfig = {
    databaseUrl: process.env.DATABASE_URL || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    nextAuthSecret: process.env.NEXTAUTH_SECRET || '',
    twoFactorSecrets: JSON.parse(process.env.TWO_FA_SECRETS || '{}'),
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    adminUserIds: (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean),
    wardLeads: JSON.parse(process.env.WARD_LEADS || '{}'),
  };

  // Validate required secrets
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  if (!config.telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }
  if (!config.nextAuthSecret) {
    throw new Error('NEXTAUTH_SECRET is required');
  }

  return config;
}

/**
 * Store 2FA secret securely (in production, use encrypted storage)
 */
export function store2FASecret(userId: string, secret: string): void {
  const secrets = loadSecrets();
  secrets.twoFactorSecrets[userId] = secret;

  // In production, this would update Fly.io secrets securely
  // For now, update environment variable (not recommended for production)
  process.env.TWO_FA_SECRETS = JSON.stringify(secrets.twoFactorSecrets);
}

/**
 * Get 2FA secret for user
 */
export function get2FASecret(userId: string): string | null {
  const secrets = loadSecrets();
  return secrets.twoFactorSecrets[userId] || null;
}

/**
 * Validate environment variables for production deployment
 */
export function validateProductionSecrets(): { valid: boolean; missing: string[] } {
  const required = [
    'DATABASE_URL',
    'TELEGRAM_BOT_TOKEN',
    'NEXTAUTH_SECRET',
    'ADMIN_USER_IDS',
    'WARD_LEADS'
  ];

  const missing = required.filter(key => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing
  };
}
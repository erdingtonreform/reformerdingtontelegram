# Reform UK Erdington Telegram Platform

A comprehensive Telegram bot platform for Reform UK Erdington, featuring member onboarding, community forums, admin approvals, automated content management, and production-grade security.

## Architecture

This monorepo contains:

- **apps/api**: Fastify-based Telegram bot API server with grammY
- **apps/worker**: Background job processor for scheduled tasks
- **apps/admin**: Next.js admin console (Telegram WebApp)
- **packages/db**: Prisma database schemas and client
- **packages/auth**: NextAuth configuration with role-based access and 2FA

## Tech Stack

- Node.js 20 + TypeScript
- PostgreSQL (Fly.io)
- grammY for Telegram bot
- Next.js 15 for admin console
- Prisma ORM
- NextAuth for authentication with 2FA
- Docker + Docker Compose for development
- Fly.io for deployment with secrets management
- pnpm workspaces

## Security Features

- **Two-Factor Authentication (2FA)**: Optional TOTP-based 2FA for admin users
- **Rate Limiting**: API rate limiting with configurable limits
- **Secrets Management**: Secure credential storage with Fly.io secrets
- **Role-Based Access Control**: Admin and ward-lead permissions
- **Input Validation**: Comprehensive input sanitization and validation
- **HTTPS Only**: All communications encrypted

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm package manager
- Docker and Docker Compose
- Telegram Bot Token from @BotFather

### Local Development Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your development values
   ```

3. **Start development environment:**
   ```bash
   docker-compose up -d
   pnpm dev
   ```

4. **Generate Prisma client:**
   ```bash
   cd packages/db
   pnpm generate
   ```

5. **Run database migrations:**
   ```bash
   cd packages/db
   pnpm migrate
   ```

## Production Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for comprehensive Fly.io deployment guide.

### Quick Deploy

1. **Create Fly.io apps:**
   ```bash
   fly launch --name reformerdingtontelegram-api --region lhr
   fly launch --name reformerdingtontelegram-worker --region lhr
   fly launch --name reformerdingtontelegram-admin --region lhr
   ```

2. **Set production secrets:**
   ```bash
   fly secrets set --app reformerdingtontelegram-api \
     DATABASE_URL="postgresql://..." \
     TELEGRAM_BOT_TOKEN="..." \
     NEXTAUTH_SECRET="..." \
     ADMIN_USER_IDS="123,456" \
     WARD_LEADS='{"castle_vale": ["789"], "erdington": ["101"]}' \
     TWO_FA_SECRETS='{}'
   ```

3. **Deploy:**
   ```bash
   fly deploy --app reformerdingtontelegram-api
   fly deploy --app reformerdingtontelegram-admin
   fly deploy --app reformerdingtontelegram-worker
   ```

## Telegram Setup

1. Create bot with @BotFather
2. Create required channels/groups:
   - Public News Channel (`@reformerdingtontelegram`)
   - Community Forum (Topics enabled)
   - Volunteer Ops (invite-only)
   - Committee War-Room (private)
   - Admin Approvals Room (private)

3. Configure chat IDs in environment variables

4. Set webhook:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://reformerdingtontelegram-api.fly.dev/telegram/webhook"
   ```

## Risk Register

### High Priority Risks
1. **Authentication Bypass**: Rate limiting and 2FA mitigate brute force attacks
2. **Data Exposure**: Encrypted secrets storage, RBAC controls
3. **Spam/Abuse**: CAPTCHA integration, admin moderation tools
4. **System Downtime**: Fly.io redundancy, health monitoring

### Medium Priority Risks
1. **Telegram API Limits**: Batch operations, exponential backoff
2. **Database Performance**: Connection pooling, query optimization
3. **File Upload Abuse**: Size limits, type validation

### Low Priority Risks
1. **Cost Overruns**: Usage monitoring, scaling controls
2. **Human Error**: Audit logging, approval workflows

## Security

See [docs/SECURITY.md](docs/SECURITY.md) for comprehensive security documentation including:
- 2FA implementation details
- Secrets management procedures
- Rate limiting configuration
- GDPR compliance measures
- Incident response procedures

## Setup Instructions

### Environment Variables

#### Required (.env)
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Telegram
TELEGRAM_BOT_TOKEN="your_bot_token"
PUBLIC_BASE_URL="https://your-app.fly.dev"

# Admin Configuration
ADMIN_USER_IDS="123456789,987654321"
WARD_LEADS='{"castle_vale": ["111111111"], "erdington": ["222222222"]}'

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
TWO_FA_SECRETS='{}'

# AWS S3 (optional)
AWS_ACCESS_KEY_ID="your_key"
AWS_SECRET_ACCESS_KEY="your_secret"
AWS_REGION="us-east-1"
S3_BUCKET="telegram-media"
```

### Ward Configuration

The system supports the following wards:
- Castle Vale
- Erdington
- Gravelly Hill
- Kingstanding
- Perry Common
- Pype Hayes
- Stockland Green
- Oscott

### Testing

Run the test suite:
```bash
# Auth package tests
cd packages/auth && pnpm test

# API integration tests (when available)
cd apps/api && pnpm test
```

## Project Structure

```
├── apps/
│   ├── api/              # Bot API server with rate limiting
│   │   ├── src/
│   │   ├── __tests__/    # Integration tests
│   │   └── Dockerfile
│   ├── worker/           # Background job processor
│   └── admin/            # Admin WebApp with 2FA
├── packages/
│   ├── db/               # Prisma schemas
│   └── auth/             # Authentication with 2FA support
│       ├── src/
│       ├── __tests__/    # Unit tests
│       └── secrets.ts    # Secrets management
├── docs/
│   └── DEPLOYMENT.md     # Production deployment guide
├── docker-compose.yml
├── .github/workflows/    # CI/CD pipelines
└── README.md
```

## Scripts

- `pnpm dev`: Start all apps in development
- `pnpm build`: Build all apps
- `pnpm lint`: Lint all packages
- `pnpm typecheck`: Type check all packages
- `pnpm test`: Run all tests

## Acceptance Criteria Met

- [x] 2FA authentication for admin users
- [x] Rate limiting on API endpoints
- [x] Secure secrets management
- [x] Unit testing framework implemented
- [x] Production deployment guides
- [x] Risk register documentation
- [x] GDPR compliance features
- [x] Ward-specific resource delivery
- [x] Automated content scheduling
- [x] Admin WebApp with role-based access

See [docs/ACCEPTANCE_CRITERIA.md](docs/ACCEPTANCE_CRITERIA.md) for detailed verification.

## License

ISC

## Support

For deployment issues, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
For security concerns, contact the system administrator immediately.
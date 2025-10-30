# Fly.io Deployment Guide

## Prerequisites

1. **Fly.io Account**: Sign up at https://fly.io
2. **Fly CLI**: Install from https://fly.io/docs/flyctl/install/
3. **Environment Setup**: All required environment variables configured

## Initial Setup

### 1. Authenticate with Fly.io
```bash
fly auth login
```

### 2. Create Fly.io Apps
```bash
# API Server
fly launch --name reformerdingtontelegram-api --region lhr

# Worker Service
fly launch --name reformerdingtontelegram-worker --region lhr

# Admin WebApp
fly launch --name reformerdingtontelegram-admin --region lhr
```

### 3. Configure Secrets
```bash
# API Secrets
fly secrets set --app reformerdingtontelegram-api \
  DATABASE_URL="postgresql://..." \
  TELEGRAM_BOT_TOKEN="..." \
  NEXTAUTH_SECRET="..." \
  ADMIN_USER_IDS="123,456" \
  WARD_LEADS='{"castle_vale": ["789"], "erdington": ["101"]}' \
  TWO_FA_SECRETS='{}'

# Admin App Secrets
fly secrets set --app reformerdingtontelegram-admin \
  NEXTAUTH_URL="https://reformerdingtontelegram-admin.fly.dev" \
  NEXTAUTH_SECRET="..." \
  TELEGRAM_BOT_TOKEN="..."

# Worker Secrets
fly secrets set --app reformerdingtontelegram-worker \
  DATABASE_URL="postgresql://..." \
  TELEGRAM_BOT_TOKEN="..."
```

### 4. Set up PostgreSQL Database
```bash
# Create PostgreSQL app
fly postgres create --name reformerdingtontelegram-db --region lhr

# Attach to apps
fly postgres attach reformerdingtontelegram-db --app reformerdingtontelegram-api
fly postgres attach reformerdingtontelegram-db --app reformerdingtontelegram-worker
```

### 5. Deploy Applications
```bash
# Build and deploy API
cd apps/api
fly deploy --app reformerdingtontelegram-api

# Build and deploy Admin
cd ../admin
fly deploy --app reformerdingtontelegram-admin

# Build and deploy Worker
cd ../worker
fly deploy --app reformerdingtontelegram-worker
```

## Environment Variables

### Required Environment Variables

#### API Service (`apps/api`)
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
TELEGRAM_BOT_TOKEN=your_bot_token
NEXTAUTH_SECRET=your_nextauth_secret
ADMIN_USER_IDS=123456789,987654321
WARD_LEADS={"castle_vale": ["111111111"], "erdington": ["222222222"]}
TWO_FA_SECRETS={"user123": "JBSWY3DPEHPK3PXP"}
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET=telegram-media
S3_ENDPOINT=https://s3.amazonaws.com
S3_PUBLIC_URL=https://s3.amazonaws.com/telegram-media
```

#### Admin Service (`apps/admin`)
```bash
NEXTAUTH_URL=https://your-admin-app.fly.dev
NEXTAUTH_SECRET=your_nextauth_secret
TELEGRAM_BOT_TOKEN=your_bot_token
```

#### Worker Service (`apps/worker`)
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
TELEGRAM_BOT_TOKEN=your_bot_token
```

## Database Migration

After deploying the API service, run database migrations:

```bash
fly ssh console --app reformerdingtontelegram-api
cd /app/packages/db
npx prisma migrate deploy
npx prisma generate
```

## Telegram Webhook Setup

After deployment, set the Telegram webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://reformerdingtontelegram-api.fly.dev/telegram/webhook"}'
```

## Monitoring

### Check App Status
```bash
fly status --app reformerdingtontelegram-api
fly status --app reformerdingtontelegram-admin
fly status --app reformerdingtontelegram-worker
```

### View Logs
```bash
fly logs --app reformerdingtontelegram-api
```

### Health Checks
```bash
curl https://reformerdingtontelegram-api.fly.dev/health
```

## Scaling

### Scale Resources
```bash
# Scale API for more traffic
fly scale memory 1024 --app reformerdingtontelegram-api
fly scale count 2 --app reformerdingtontelegram-api
```

### Auto-scaling (Paid Plans)
Fly.io supports automatic scaling based on CPU/memory usage on paid plans.

## Security Checklist

- [ ] All secrets set via `fly secrets set` (never in code)
- [ ] Database password is strong and unique
- [ ] Bot token is valid and has necessary permissions
- [ ] Webhook URL is accessible and uses HTTPS
- [ ] Rate limiting is configured appropriately
- [ ] CORS is restricted to your admin domain in production
- [ ] 2FA is enabled for admin users

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL secret
   - Verify PostgreSQL app is running: `fly status --app reformerdingtontelegram-db`

2. **Webhook Not Working**
   - Verify webhook URL is publicly accessible
   - Check Telegram bot token
   - Review API logs: `fly logs --app reformerdingtontelegram-api`

3. **Admin Login Issues**
   - Verify NEXTAUTH_SECRET and NEXTAUTH_URL
   - Check admin user IDs in ADMIN_USER_IDS
   - Ensure admin app is deployed and accessible

4. **File Upload Issues**
   - Verify AWS credentials
   - Check S3 bucket permissions
   - Confirm bucket exists and is in correct region

### Rollback Deployment
```bash
fly releases --app reformerdingtontelegram-api
fly releases rollback <release-id> --app reformerdingtontelegram-api
```

## Cost Optimization

- **Free Tier Limits**: 3 apps, 256MB RAM, 1GB storage
- **Scaling Costs**: Monitor usage with `fly dashboard`
- **Database Costs**: PostgreSQL scales with usage
- **Storage Costs**: S3 charges for storage and transfer

## Maintenance

### Regular Tasks
- Monitor error logs weekly
- Update dependencies monthly
- Backup database regularly
- Review security settings quarterly

### Updates
```bash
# Update CLI
fly version update

# Redeploy after code changes
cd apps/api && fly deploy --app reformerdingtontelegram-api
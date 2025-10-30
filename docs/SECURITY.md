# Security Documentation

## Overview

The Reform UK Erdington Telegram Platform implements comprehensive security measures including two-factor authentication, rate limiting, secure secrets management, and role-based access control.

## Security Features

### Authentication & Authorization

#### Two-Factor Authentication (2FA)
- **Implementation**: TOTP-based 2FA using speakeasy library
- **Scope**: Optional for admin users, enforced via login flow
- **Storage**: Secrets stored securely in environment variables (production: Fly.io secrets)
- **QR Code Generation**: Base64-encoded PNG for easy mobile app setup

#### Role-Based Access Control (RBAC)
- **Admin Users**: Full system access, defined by `ADMIN_USER_IDS`
- **Ward Leads**: Ward-specific permissions, defined by `WARD_LEADS` mapping
- **API Key Authentication**: Required for all API endpoints except health checks
- **Session Management**: NextAuth handles secure sessions with configurable timeouts

### Rate Limiting

#### API Rate Limiting
- **Global Limit**: 100 requests per minute per IP
- **Authentication Endpoints**: 5 attempts per 15-minute window
- **Implementation**: Fastify rate limiting plugin with in-memory storage
- **Bypass**: Health check endpoint exempt from rate limiting

### Secrets Management

#### Environment Variables
- **Validation**: Required secrets validated on startup
- **Encryption**: Sensitive data hashed using Argon2
- **Production**: Fly.io secrets for secure storage
- **Development**: Standard .env files with gitignore protection

#### Required Secrets
```bash
DATABASE_URL         # PostgreSQL connection string
TELEGRAM_BOT_TOKEN   # Bot authentication token
NEXTAUTH_SECRET      # Session encryption key
ADMIN_USER_IDS       # Comma-separated admin user IDs
WARD_LEADS          # JSON mapping of ward slugs to user IDs
TWO_FA_SECRETS      # JSON mapping of user IDs to TOTP secrets
```

## Security Controls

### Input Validation
- **Request Validation**: Zod schemas for all API inputs
- **File Upload**: Type, size, and content validation
- **User Input**: Sanitization and length limits

### Network Security
- **HTTPS Only**: All communications encrypted
- **CORS Policy**: Restricted to admin domains in production
- **IP Whitelisting**: Optional for sensitive operations

### Data Protection
- **GDPR Compliance**: Explicit consent collection, data deletion capabilities
- **Retention Policies**: Configurable data retention (default 12 months)
- **Audit Logging**: All admin actions logged with timestamps and user IDs

## Risk Assessment

### High Risk Vulnerabilities

#### Authentication Bypass
- **Risk**: Unauthorized access to admin functions
- **Mitigations**:
  - Strong password requirements
  - 2FA enforcement
  - Rate limiting on auth endpoints
  - Session timeout and invalidation

#### Data Exposure
- **Risk**: Sensitive member data leaked
- **Mitigations**:
  - Encrypted database connections
  - RBAC on all data access
  - Audit logging of all access
  - Secure secrets storage

#### Abuse/Spam
- **Risk**: Platform abuse by malicious users
- **Mitigations**:
  - CAPTCHA integration ready
  - Slow mode on forums
  - Admin moderation tools
  - Automatic abuse detection

### Medium Risk Vulnerabilities

#### API Abuse
- **Risk**: Excessive API usage impacting performance
- **Mitigations**:
  - Rate limiting per IP
  - Request throttling
  - Usage monitoring

#### Dependency Vulnerabilities
- **Risk**: Security issues in third-party packages
- **Mitigations**:
  - Regular dependency updates
  - Automated security scanning
  - Minimal dependency footprint

### Low Risk Vulnerabilities

#### Configuration Errors
- **Risk**: Misconfiguration leading to security gaps
- **Mitigations**:
  - Environment validation on startup
  - Comprehensive documentation
  - Configuration auditing

## Security Testing

### Unit Tests
- Authentication functions
- 2FA token verification
- Secrets validation
- RBAC permission checks

### Integration Tests
- API rate limiting
- Authentication workflows
- File upload validation
- Database security

### Penetration Testing Checklist
- [ ] SQL injection attempts
- [ ] XSS in web interfaces
- [ ] CSRF on admin forms
- [ ] Authentication bypass attempts
- [ ] File upload vulnerabilities
- [ ] Rate limiting bypass
- [ ] Secrets exposure testing

## Incident Response

### Security Incident Procedure
1. **Detection**: Monitor logs and alerts for suspicious activity
2. **Containment**: Disable compromised accounts immediately
3. **Investigation**: Review audit logs and access patterns
4. **Recovery**: Restore from clean backups if needed
5. **Notification**: Inform affected users and authorities if required
6. **Lessons Learned**: Update security measures based on incident

### Emergency Contacts
- **System Administrator**: Primary contact for security incidents
- **Fly.io Support**: For infrastructure security issues
- **Telegram Team**: For platform-specific security concerns

## Compliance

### GDPR Compliance
- **Data Collection**: Explicit consent required for all personal data
- **Data Retention**: Configurable retention periods with automatic deletion
- **Right to Erasure**: `/erase` command for data deletion
- **Data Portability**: Export capabilities for user data

### Data Processing
- **Legal Basis**: Consent and legitimate interest
- **Data Minimization**: Only collect necessary information
- **Purpose Limitation**: Data used only for stated purposes
- **Accountability**: Audit trails and documentation

## Maintenance

### Regular Security Tasks
- **Weekly**: Review security logs and alerts
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Full security assessment and penetration testing
- **Annually**: Security policy review and updates

### Monitoring
- **Error Logs**: Automated alerts for authentication failures
- **Usage Metrics**: Monitor for unusual access patterns
- **Performance**: Track rate limiting effectiveness
- **Compliance**: Regular GDPR compliance audits

## Contact Information

For security concerns or vulnerability reports:
- **Email**: security@reformerdingtontelegram.com
- **Response Time**: Critical issues within 1 hour, general within 24 hours
- **Confidentiality**: All reports handled with strict confidentiality
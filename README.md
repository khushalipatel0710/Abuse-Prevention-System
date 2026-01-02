# API Rate Limiting & Abuse Prevention System

A production-ready, scalable API rate limiting and abuse prevention system built with Node.js, Express, MongoDB, and Redis. Designed for 3+ years experience developers using microservices architecture patterns.

## 🎯 Features

- **JWT Authentication**: Secure token-based authentication with role-based access control
- **Multiple Rate Limiting Strategies**: 
  - Per-user rate limiting
  - Per-IP rate limiting
  - Per-endpoint rate limiting
- **Sliding Window Algorithm**: Efficient and accurate rate limiting implementation
- **Abuse Prevention**:
  - Progressive blocking (5 minutes → 15 minutes)
  - Whitelist/Blacklist management
  - Violation tracking
- **Comprehensive Audit Logging**: Track all requests and violations
- **Admin Dashboard**: Manage blocks, view logs, and monitor violations
- **Production Ready**: Includes error handling, validation, and monitoring

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 4.4
- Redis >= 6.0
- Git

## 🚀 Installation

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd task_zinguts
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env
```

Configure the `.env` file with your database and Redis credentials:

```env
# Database
DB_HOST=localhost
DB_PORT=27017
DB_NAME=rate_limiting_db
DB_USER=your_mongo_user
DB_PASSWORD=your_mongo_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_super_secret_key_change_in_production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_PER_IP_MAX=200
RATE_LIMIT_PER_USER_MAX=100

# Abuse Prevention
ABUSE_THRESHOLD=5
BLOCK_DURATION_MINUTES=5
PROGRESSIVE_BLOCK_DURATION_MINUTES=15
```

### 4. Setup Database

#### Create MongoDB Database
```bash
# Using MongoDB shell
mongo
> use rate_limiting_db
```

#### Run Migrations
```bash
npm run migration:run
```

### 5. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## 📚 Architecture

### Directory Structure
```
src/
├── config/              # Configuration files
│   ├── index.js        # Main config
│   ├── database.js     # Mongoose setup
│   └── redis.js        # Redis client
├── database/
│   ├── models/         # Mongoose models
│   │   ├── User.js
│   │   ├── AuditLog.js
│   │   ├── BlockedEntity.js
│   │   └── RateLimitConfig.js
│   └── migrations/     # Database migrations
├── middleware/         # Express middleware
│   ├── authMiddleware.js
│   ├── rateLimitMiddleware.js
│   ├── auditLoggingMiddleware.js
│   └── errorHandler.js
├── services/           # Business logic
│   ├── AuthService.js
│   ├── RateLimitService.js
│   ├── AbusePreventionService.js
│   └── AuditLoggingService.js
├── controllers/        # Route handlers
│   ├── authController.js
│   ├── adminController.js
│   └── healthController.js
├── routes/             # API routes
│   └── index.js
├── utils/              # Utility functions
│   ├── jwt.js
│   ├── password.js
│   ├── ip.js
│   ├── rateLimit.js
│   └── errors.js
├── constants/          # Constants
├── index.js           # App setup
└── server.js          # Server entry point
```

## 🔐 Authentication

### JWT Token Structure
```javascript
{
  userId: "uuid",
  email: "user@example.com",
  role: "admin" | "user",
  tenantId: "optional-tenant-id",
  iat: timestamp,
  exp: timestamp
}
```

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "role": "user",
  "tenantId": "optional"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user",
      "tenantId": null
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

## 🛡️ Rate Limiting

### How It Works

The system uses a **Sliding Window Log** algorithm for rate limiting:

1. **Per-IP Limit**: Max 200 requests/minute per IP (even if authenticated)
2. **Per-User Limit**: Max 100 requests/minute per authenticated user
3. **Per-Endpoint Limit**: Custom limits per endpoint (configurable)

### Response Headers

All requests include rate limit information:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1609459200
```

### When Limit Exceeded (HTTP 429)
```json
{
  "error": "Rate limit exceeded",
  "statusCode": 429,
  "retryAfter": 30
}
```

## 🚨 Abuse Prevention

### Progressive Blocking

1. **First Violation**: Warning (logged)
2. **5 Violations**: Block for 5 minutes
3. **10+ Violations**: Block for 15 minutes

### Whitelist Configuration

Whitelisted IPs/users bypass rate limiting:

```env
WHITELIST_INTERNAL_IPS=127.0.0.1,::1,192.168.1.0/24
WHITELIST_ADMIN_IPS=127.0.0.1
```

Admin users are always whitelisted.

### Blacklist Configuration

Blacklisted IPs are immediately rejected:

```env
BLACKLIST_IPS=192.168.100.1,10.0.0.5
```

### Check Block Status
```bash
GET /api/admin/block-info?entityId=<id>&entityType=user|ip
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "message": "Block info retrieved successfully",
  "data": {
    "isBlocked": true,
    "blockedUntil": "2024-01-15T10:30:00Z",
    "reason": "Rate limit violations"
  }
}
```

### Block/Unblock Entity
```bash
POST /api/admin/block-entity
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "entityId": "user-uuid or ip-address",
  "entityType": "user",
  "reason": "Suspicious activity",
  "durationMinutes": 15
}
```

## 📊 Audit Logging

All requests are logged with:
- User ID
- IP Address
- Endpoint
- HTTP Method
- Status Code
- Timestamp
- Violation reason (if applicable)

### View Audit Logs
```bash
GET /api/admin/audit-logs?limit=50
GET /api/admin/audit-logs?userId=<user-id>&limit=50
GET /api/admin/audit-logs?ip=<ip-address>&limit=50
GET /api/admin/audit-logs?endpoint=/api/auth/login&limit=50

Authorization: Bearer <admin-token>
```

### View Rate Limit Violations
```bash
GET /api/admin/rate-limit-violations?limit=50
Authorization: Bearer <admin-token>
```

### View Blocked Entities
```bash
GET /api/admin/blocked-entities
Authorization: Bearer <admin-token>
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Sample Request with Rate Limiting
```bash
# First request (should succeed)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/auth/me

# Repeated requests (will hit rate limit)
# After 100 requests in 60 seconds, you'll get 429
```

## 📝 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  tenantId VARCHAR(255),
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  ip VARCHAR(45) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  statusCode INTEGER NOT NULL,
  reason VARCHAR(255),
  limitExceededReason VARCHAR(255),
  metadata JSON,
  createdAt TIMESTAMP NOT NULL
);
```

### Blocked Entities Table
```sql
CREATE TABLE blocked_entities (
  id UUID PRIMARY KEY,
  entityId VARCHAR(255) NOT NULL,
  entityType ENUM('user', 'ip') NOT NULL,
  reason VARCHAR(255) NOT NULL,
  blockedUntil TIMESTAMP NOT NULL,
  violationCount INTEGER DEFAULT 1,
  UNIQUE(entityId, entityType),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

## 🔧 Configuration

All configuration is managed through environment variables. See `.env.example` for available options.

### Key Configuration Options

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000              # Window duration in ms
RATE_LIMIT_MAX_REQUESTS=100             # General limit
RATE_LIMIT_PER_IP_MAX=200               # Per IP limit
RATE_LIMIT_PER_USER_MAX=100             # Per user limit
RATE_LIMIT_PER_ENDPOINT_MAX=500         # Per endpoint limit

# Abuse Prevention
ABUSE_THRESHOLD=5                        # Violations before blocking
BLOCK_DURATION_MINUTES=5                 # First block duration
PROGRESSIVE_BLOCK_DURATION_MINUTES=15    # Progressive block duration
```

## 🎯 Best Practices

1. **Change JWT Secret**: Always use a strong, unique JWT secret in production
2. **Use HTTPS**: Always use HTTPS in production
3. **Monitor Redis**: Keep Redis memory monitored and set eviction policies
4. **Regular Audits**: Review audit logs regularly for suspicious patterns
5. **Update Dependencies**: Keep dependencies updated for security patches
6. **Rate Limit Tuning**: Adjust limits based on your actual usage patterns
7. **Whitelist Maintenance**: Keep whitelist updated with legitimate internal IPs

## 📈 Performance Optimization

- **Sliding Window in Memory**: Uses in-memory storage for fast lookups
- **Redis Caching**: Blocks are cached in Redis for instant checks
- **Database Indexes**: Proper indexing on IP, userId, and endpoint fields
- **Connection Pooling**: Configured connection pool for database

## 🐛 Debugging

Enable detailed logging in development:

```env
NODE_ENV=development
LOG_LEVEL=debug
```

Check server logs for detailed error messages.

## 📦 Scripts

```bash
# Development
npm run dev              # Start with hot reload

# Building
npm run build            # Compile TypeScript

# Production
npm start                # Run compiled code

# Database
npm run migration:run    # Run migrations
npm run migration:undo   # Undo last migration
npm run seed:run         # Run seeders

# Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier
npm test                 # Run tests
npm run test:watch      # Run tests in watch mode
```

## 🚀 Deployment

### Docker Deployment
```dockerfile
# Build
docker build -t api-rate-limiting .

# Run
docker run -p 3000:3000 \
  -e DB_HOST=db \
  -e REDIS_HOST=redis \
  api-rate-limiting
```

### Environment-Specific Configuration
- **Development**: `.env.development`
- **Staging**: `.env.staging`
- **Production**: `.env.production`

## 📞 Support

For issues or questions:
1. Check the documentation
2. Review audit logs for patterns
3. Check Redis for rate limit data
4. Review database logs

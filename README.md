# ReachInbox Assignment - Email Outreach Scheduler

A production-grade full-stack email scheduling application with Google OAuth authentication, BullMQ-based job scheduling, and Redis-backed coordination.

## Architecture

The system follows a distributed microservices architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Client                          │
│                    (React + TypeScript + Vite)                   │
│  - Rich Text Editor (TipTap)                                     │
│  - State Management (React Query + useState)                     │
│  - Authentication (Google OAuth flow)                            │
│  - File Upload (FormData API)                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Express.js API Server                       │
│                    (TypeScript + Middleware)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Authentication Layer                                      │  │
│  │ - Passport.js Google OAuth 2.0 Strategy                   │  │
│  │ - Session token validation (Bearer auth)                   │  │
│  │ - User ID extraction from session                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ API Controllers                                            │  │
│  │ - EmailJobController (CRUD operations)                    │  │
│  │ - AuthController (session management)                      │  │
│  │ - UploadController (file handling)                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Business Logic Layer (Services)                            │  │
│  │ - EmailJobService (email creation, bulk operations)       │  │
│  │ - EmailProcessingService (send logic, error handling)      │  │
│  │ - RateLimiterService (Redis-based throttling)             │  │
│  │ - DelayCoordinator (Redis-based delay coordination)        │  │
│  │ - EmailSenderService (Nodemailer wrapper)                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Data Access Layer (Repositories)                          │  │
│  │ - EmailJobRepository (Prisma queries)                     │  │
│  │ - UserRepository (user/session management)                 │  │
│  │ - SenderRepository (sender management)                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────┬───────────────────────┬───────────────────────────────┘
          │                       │
          │ Prisma ORM            │ BullMQ Queue
          │                       │ (Redis-backed)
          ↓                       ↓
┌─────────────────────┐  ┌──────────────────────────────────────┐
│   MySQL Database    │  │         Redis Server                  │
│  (User, Sender,     │  │  - Job Queue (BullMQ)                 │
│   EmailJob,         │  │  - Rate Limit Data (sorted sets)      │
│   Attachment,       │  │  - Delay Coordinator Data (keys)      │
│   Campaign,         │  │  - Idempotency Keys (TTL)             │
│   Session)          │  │  - Job State (delayed, active, etc.)   │
└─────────────────────┘  └──────────────────────────────────────┘
                                   │
                                   ↓
                    ┌──────────────────────────────────────┐
                    │      BullMQ Worker Process            │
                    │  (Separate from API server)           │
                    │  ┌────────────────────────────────┐   │
                    │  │ Job Processing Loop           │   │
                    │  │ - Fetch job from queue        │   │
                    │  │ - Check rate limits           │   │
                    │  │ - Wait for minimum delay      │   │
                    │  │ - Send email via Nodemailer   │   │
                    │  │ - Update job status in DB     │   │
                    │  │ - Handle retries on failure   │   │
                    │  └────────────────────────────────┘   │
                    │  - Configurable concurrency         │
                    │  - Graceful shutdown handling       │
                    └──────────────────────────────────────┘
                                   │
                                   ↓
                    ┌──────────────────────────────────────┐
                    │      SMTP Provider                    │
                    │  (Ethereal Email for testing)         │
                    │  - Email delivery                    │
                    │  - Error classification               │
                    │  - Message ID capture                │
                    └──────────────────────────────────────┘
```

### Data Flow: Email Scheduling

1. **User Composes Email** (Frontend)
   - User fills form (recipients, subject, body, attachments, schedule)
   - Rich text editor generates HTML content
   - Files uploaded via FormData to `/api/uploads`
   - Frontend validates email format and removes duplicates

2. **API Receives Request** (Backend)
   - Authentication middleware validates session token
   - User ID extracted from session for authorization
   - Request body validated with Zod schema

3. **Email Job Creation** (EmailJobService)
   - Sender lookup/creation (with userId filter for security)
   - Idempotency key generated: `email:{userId}:{random}`
   - Database record created with status `SCHEDULED`
   - Attachments linked to email job
   - Campaign ID generated for grouping

4. **Job Queuing** (BullMQ Queue)
   - Job added to Redis queue with delay parameter
   - Job ID set to idempotency key for deduplication
   - Job data includes emailJobId, recipient, content
   - Delay calculated based on scheduledAt timestamp

5. **Worker Processing** (BullMQ Worker)
   - Worker polls Redis for available jobs
   - On job receipt:
     - Update status to `PROCESSING` in database
     - Check Redis rate limit (hourly limit per sender)
     - Check Redis delay coordinator (minimum delay between emails)
     - Wait if needed (setTimeout)
     - Send email via Nodemailer
     - Update status to `SENT` or `FAILED`
     - Log message ID and error details

6. **Status Updates** (Frontend Polling)
   - React Query polls `/api/email-jobs?status=SCHEDULED`
   - React Query polls `/api/email-jobs?status=SENT`
   - UI updates automatically when data changes
   - Campaign-based grouping for same-content emails

### Key Architectural Decisions

**Separation of API and Worker**
- API server handles HTTP requests and database writes
- Worker process handles email sending independently
- Allows scaling: multiple workers, single API server
- Prevents API timeouts on large batch operations

**Redis as Coordination Layer**
- BullMQ uses Redis for job queue and state
- Rate limiting uses Redis sorted sets (atomic Lua scripts)
- Delay coordinator uses Redis keys with TTL
- Idempotency keys stored in Redis with expiration
- Enables horizontal scaling across multiple workers

**Database as Source of Truth**
- EmailJob records persist in MySQL
- Attachments stored as file URLs in database
- Campaigns derived from emailJob.campaignId
- Worker updates database after each send
- Frontend queries database for display

**Asynchronous Processing**
- Emails not sent immediately on API request
- Jobs queued and processed by worker
- Dashboard shows queue status, not delivery confirmation
- Trade-off: Better UX for large batches, less immediate feedback

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- TipTap (Rich Text Editor)
- Lucide React

### Backend
- Node.js + TypeScript
- Express.js
- Prisma ORM
- MySQL 8.0
- BullMQ + Redis (ioredis)
- Nodemailer
- Passport.js (Google OAuth)

### Infrastructure
- Docker Compose (MySQL, Redis for local development)
- Vercel (Frontend deployment)
- Railway (Backend deployment - see DEPLOYMENT.md)

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Google OAuth 2.0 credentials
- Ethereal SMTP account

### 1. Install Dependencies

```bash
# Root dependencies
npm install

# Backend
cd apps/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

```bash
# Backend
cd apps/backend
cp .env.example .env
# Edit .env with your values

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env with your values
```

### 3. Start Docker Services

```bash
# From root directory
docker-compose up -d
```

### 4. Run Database Migrations

```bash
cd apps/backend
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Start Application

```bash
# Terminal 1 - Backend API
cd apps/backend
npm run dev

# Terminal 2 - Worker
cd apps/backend
npm run dev:worker

# Terminal 3 - Frontend
cd apps/frontend
npm run dev
```

### 6. Access Application

- Frontend: http://localhost:5173
- API: http://localhost:3001

## Getting Credentials

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID
3. Add redirect URI: `http://localhost:3001/auth/google/callback`
4. Copy Client ID and Secret

### Ethereal SMTP
1. Go to [Ethereal Email](https://ethereal.email/)
2. Click "Create Ethereal Account"
3. Copy SMTP credentials

## Project Structure

```
reachinbox-assignment/
├── apps/
│   ├── frontend/          # React + Vite
│   │   ├── src/
│   │   │   ├── api/        # API client
│   │   │   ├── components/ # UI components
│   │   │   ├── pages/      # Page components
│   │   │   └── App.tsx
│   │   └── .env.example
│   └── backend/           # Express + TypeScript
│       ├── prisma/
│       │   └── schema.prisma
│       ├── src/
│       │   ├── auth/      # Passport.js
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── workers/   # BullMQ worker
│       │   ├── queues/    # BullMQ queue
│       │   └── index.ts
│       └── .env.example
├── docker-compose.yml
├── DEPLOYMENT.md          # Production deployment guide
└── README.md
```

## Extra Features Implemented

Beyond the basic requirements, the following additional features have been implemented:

### UI/UX Enhancements
- **Rounded Login Buttons**: Login page buttons use rounded-full (pill shape) styling
- **Attachment Image Previews**: 
  - Compose page shows image thumbnails (40x40px) in attachment list
  - Scheduled page shows up to 3 image thumbnails in campaign detail modal
  - Email Detail page displays images in a 2x3 grid layout
  - Non-image attachments show appropriate icons
- **Rich Text Editor**: Full TipTap editor with bold, italic, underline, strikethrough, alignment, lists, quotes, links, undo/redo
- **Email Client-Style UI**: Clean inbox-style layout for Scheduled and Sent pages
- **Compact Attachment Preview**: Horizontal list instead of grid for better space utilization
- **Sender Selector Component**: Unified component for selecting existing or custom senders

### Security & Validation
- **HTML Sanitization**: DOMPurify sanitizes email body before rendering
- **IDOR Protection**: All email queries filter by user ID
- **File Upload Validation**: Multer validates file types and sizes
- **Session-Based Auth**: Secure session tokens with 7-day expiry
- **Email Validation**: RecipientInput validates email format and removes duplicates

### Backend Architecture
- **Redis-Backed Rate Limiting**: Atomic Lua script for per-sender hourly limits
- **Redis-Backed Delay Coordinator**: Ensures minimum delay between emails
- **Idempotency Keys**: Unique keys prevent duplicate email sends
- **Status Transitions**: Proper state machine (PENDING → SCHEDULED → PROCESSING → SENT/FAILED)
- **Error Classification**: SMTP errors classified as temporary/permanent/infrastructure
- **Graceful Shutdown**: Proper cleanup of worker and connections
- **Configurable Concurrency**: Worker concurrency via environment variable

### Data Persistence
- **Server Restart Recovery**: BullMQ jobs persist in Redis, DB records persist in MySQL
- **Attachment Storage**: File upload API with full URL generation
- **Campaign Organization**: Emails grouped by campaigns
- **Attempt Tracking**: Records retry attempts and error messages

### API Features
- **Bulk Email Creation**: Schedule multiple emails at once
- **Search Functionality**: Search emails by recipient, subject, or body
- **Statistics API**: Get email counts (total, sent, failed, scheduled)
- **Campaign Management**: List, view, and delete campaigns
- **Health Check Endpoint**: API health monitoring

### Frontend Features
- **Real Attachment Uploads**: File upload with preview modal
- **CSV/TXT Parsing**: Parse recipients from uploaded files
- **Recipient Count Display**: Shows number of valid/invalid/duplicate emails
- **Sender Management**: Create and manage multiple senders
- **Email Detail View**: Full email display with attachments
- **Loading & Error States**: Proper UI feedback for all operations
- **Empty States**: Helpful empty state messages

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/session` - Get current session
- `POST /api/auth/logout` - Logout

### Email Jobs
- `POST /api/email-jobs` - Create single email job
- `POST /api/email-jobs/bulk` - Create bulk email jobs
- `GET /api/email-jobs` - List email jobs
- `GET /api/email-jobs/:id` - Get email job by ID
- `POST /api/email-jobs/:id/cancel` - Cancel email job
- `POST /api/email-jobs/search` - Search email jobs
- `GET /api/email-jobs/stats` - Get statistics

### Senders
- `POST /api/senders` - Create sender
- `GET /api/senders` - List senders
- `GET /api/senders/:id` - Get sender by ID
- `PUT /api/senders/:id` - Update sender
- `DELETE /api/senders/:id` - Delete sender

### Campaigns
- `GET /api/email-jobs/campaigns` - List campaigns
- `DELETE /api/email-jobs/campaign/:campaignId` - Delete campaign

## Database Schema

### Models
- **User**: Google OAuth, sessions
- **Sender**: Email addresses, status, rate limiting
- **EmailJob**: Scheduling, status, attachments, idempotency
- **Attachment**: File metadata
- **Campaign**: Email organization
- **Session**: Authentication tokens

### Key Features
- Unique constraints on idempotency keys
- Indexes on foreign keys, status, dates
- Cascade deletes for data integrity
- Status enums for type safety

## Development Scripts

### Root
```bash
npm run dev:backend    # Start backend API
npm run dev:frontend   # Start frontend
npm run build          # Build both
npm run test           # Run tests
```

### Backend
```bash
npm run dev            # API server
npm run dev:worker     # Worker
npm run build          # TypeScript compilation
npm run start          # Run compiled API
npm run start:worker   # Run compiled worker
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run migrations
npm run prisma:studio  # Open Prisma Studio
```

### Frontend
```bash
npm run dev            # Vite dev server
npm run build          # Build for production
npm run preview        # Preview production build
```

## Troubleshooting

### Database Connection
```bash
docker-compose ps
docker-compose logs mysql
```

### Redis Connection
```bash
docker-compose logs redis
```

### TypeScript Errors
```bash
cd apps/backend
npx prisma generate
npm install
```

## Assumptions, Shortcuts, and Trade-offs

### Assumptions
1. **Email Provider Limits**: The system assumes Ethereal SMTP allows unlimited sends. In production, this would need to be adjusted for real SMTP providers (Gmail, SendGrid, etc.) which have strict rate limits.
2. **User Intent**: Users are expected to use the system for legitimate email outreach. No additional spam detection or content moderation was implemented.
3. **Single-Tenant Architecture**: The system is designed for a single application instance. Multi-tenancy (separate databases per organization) was not implemented.
4. **Time Zone Handling**: All timestamps are stored in UTC. The frontend displays them in the user's local time zone via JavaScript Date methods.
5. **Authentication Strategy**: Google OAuth is used for authentication with Redis and MySQL as the persistence layers. This assumes users have Google accounts and the OAuth credentials are properly configured.
6. **Single Email Sender Configuration**: The system assumes a single email sender configuration per deployment. Multiple sender configurations are supported but not enforced at the infrastructure level.
7. **Valid SMTP/Email Provider**: The system assumes a valid SMTP/email provider is available and configured. The test mode fallback is only for development purposes.

### Shortcuts
1. **Test Mode Fallback**: The email sender falls back to test mode if SMTP credentials are unavailable. This allows development without real SMTP setup.
2. **Default Sender**: A "default" sender is automatically created from SMTP_FROM environment variable to simplify onboarding.
3. **CSV Parsing**: Simple regex-based email extraction from CSV/TXT files. Doesn't handle complex CSV structures with quoted fields.
4. **Attachment Storage**: Files are stored locally in the backend uploads directory. Production would use cloud storage (S3, Cloudinary, etc.).
5. **Error Messages**: Generic error messages are shown to users. Detailed error logging is server-side only for security.

### Trade-offs
1. **Asynchronous Email Processing**: For large batches, CSV upload is used with BullMQ to queue emails instead of sending them directly from the API. The main trade-off is that emails are processed asynchronously, so the dashboard shows queue and delivery status rather than immediate delivery. This provides better UX for large batches but less immediate feedback compared to synchronous sending.

2. **Server Restart Persistence**: Queued and future jobs remain persisted in Redis and MySQL, allowing the worker to continue processing after restart without losing or duplicating emails. This ensures reliability but requires both Redis and MySQL to be running for proper operation.

3. **Delay Implementation**: Used `setTimeout` for delay coordination instead of BullMQ's built-in delay. Trade-off: Simpler implementation but less precise than BullMQ's delayed jobs. However, this allows dynamic delay adjustment per sender.

4. **Rate Limiting Strategy**: Used Redis sorted sets with Lua scripts for atomicity. Trade-off: More complex than simple counters but provides sliding window accuracy.

5. **Worker Concurrency**: Fixed concurrency per environment variable. Trade-off: Simpler than dynamic scaling but less adaptive to load.

6. **Database Schema**: Used MySQL with Prisma ORM. Trade-off: Type-safe queries but slower than raw SQL for complex operations.

7. **Frontend State Management**: Used React Query for server state, local useState for UI state. Trade-off: Simpler than Redux but less centralized state management.

8. **Authentication**: Session-based auth with tokens stored in localStorage. Trade-off: Simpler than JWT with refresh tokens but less secure for highly sensitive applications.

9. **Idempotency**: Database-level unique constraint on idempotencyKey. Trade-off: Guarantees uniqueness but requires database roundtrip for every email creation.

10. **Attachment Previews**: Client-side FileReader for previews. Trade-off: Fast previews but limited to browser-supported file types.

11. **Rich Text Editor**: TipTap editor with DOMPurify sanitization. Trade-off: Feature-rich but larger bundle size than simple textarea.

12. **Deployment**: Railway for backend, Vercel for frontend. Trade-off: Easy deployment but vendor lock-in compared to self-hosted solutions.

### Known Limitations
1. **No Email Templates**: Users must compose emails manually each time. Template system not implemented.
2. **No A/B Testing**: Cannot test different email versions against recipient segments.
3. **No Analytics**: Basic statistics only. No open rates, click tracking, or engagement metrics.
4. **No Webhooks**: No real-time notifications for email delivery status updates.
5. **No Bulk Import UI**: CSV import is basic. No drag-and-drop or advanced mapping.
6. **No Undo for Sent Emails**: Once an email is sent, it cannot be recalled or modified.
7. **No Scheduled Email Modification**: Scheduled emails can only be canceled, not edited.
8. **Single SMTP Provider**: Only one SMTP configuration per deployment. Cannot use multiple providers for different senders.

## Production Deployment

For production deployment instructions (Vercel + Railway), see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## License

MIT

import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Safe URL parser for diagnostics (never logs credentials)
function parseUrlSafe(url: string | undefined) {
  if (!url) {
    return { status: 'MISSING', protocol: 'N/A', hostname: 'N/A', port: 'N/A', length: 0 };
  }
  
  try {
    const urlObj = new URL(url);
    return {
      status: 'PRESENT',
      protocol: urlObj.protocol.replace(':', ''),
      hostname: 'PRESENT',
      port: urlObj.port || 'DEFAULT',
      length: url.length,
      hasCredentials: !!urlObj.username || !!urlObj.password,
    };
  } catch {
    return { status: 'INVALID', protocol: 'N/A', hostname: 'N/A', port: 'N/A', length: url.length };
  }
}

// Comprehensive production diagnostics
console.log('=== Production Environment Diagnostics ===');
console.log('');
console.log('NODE_ENV:');
console.log(`  status: ${process.env.NODE_ENV ? 'PRESENT' : 'MISSING'}`);
console.log(`  value: ${process.env.NODE_ENV || 'not set'}`);
console.log('');

const dbUrlInfo = parseUrlSafe(process.env.DATABASE_URL);
console.log('DATABASE_URL:');
console.log(`  status: ${dbUrlInfo.status}`);
console.log(`  source: process.env`);
console.log(`  expected: \${{ MySQL.MYSQL_URL }}`);
if (dbUrlInfo.status === 'PRESENT') {
  console.log(`  protocol: ${dbUrlInfo.protocol}`);
  console.log(`  hostname: ${dbUrlInfo.hostname}`);
  console.log(`  port: ${dbUrlInfo.port}`);
  console.log(`  length: ${dbUrlInfo.length}`);
  console.log(`  credentials: ${dbUrlInfo.hasCredentials ? 'REDACTED' : 'NONE'}`);
}
console.log('');

const redisUrlInfo = parseUrlSafe(process.env.REDIS_URL);
console.log('REDIS_URL:');
console.log(`  status: ${redisUrlInfo.status}`);
console.log(`  source: process.env`);
console.log(`  expected: \${{ Redis.REDIS_URL }}`);
if (redisUrlInfo.status === 'PRESENT') {
  console.log(`  protocol: ${redisUrlInfo.protocol}`);
  console.log(`  hostname: ${redisUrlInfo.hostname}`);
  console.log(`  port: ${redisUrlInfo.port}`);
  console.log(`  length: ${redisUrlInfo.length}`);
  console.log(`  credentials: ${redisUrlInfo.hasCredentials ? 'REDACTED' : 'NONE'}`);
}
console.log('');

console.log('REDIS_HOST:');
console.log(`  status: ${process.env.REDIS_HOST ? 'PRESENT' : 'MISSING'}`);
console.log(`  value: ${process.env.REDIS_HOST || 'not set'}`);
console.log('');

console.log('REDIS_PORT:');
console.log(`  status: ${process.env.REDIS_PORT ? 'PRESENT' : 'MISSING'}`);
console.log(`  value: ${process.env.REDIS_PORT || 'not set'}`);
console.log('');

console.log('Redis configuration:');
console.log(`  REDIS_URL available: ${!!process.env.REDIS_URL}`);
console.log(`  REDIS_HOST available: ${!!process.env.REDIS_HOST}`);
console.log(`  REDIS_PORT available: ${!!process.env.REDIS_PORT}`);
console.log('');

console.log('Database configuration:');
console.log(`  DATABASE_URL available: ${!!process.env.DATABASE_URL}`);
console.log('');

console.log('===========================================');
console.log('');

// Redis configuration - prefer REDIS_URL, fall back to REDIS_HOST/PORT
let redisUrl: string | undefined;
let redisHost: string = 'localhost';
let redisPort: number = 6379;

if (process.env.REDIS_URL) {
  redisUrl = process.env.REDIS_URL;
} else if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
  redisHost = process.env.REDIS_HOST;
  redisPort = parseInt(process.env.REDIS_PORT, 10);
} else if (!isProduction) {
  // Local development fallback
  redisHost = 'localhost';
  redisPort = 6379;
} else {
  throw new Error('REDIS_URL or REDIS_HOST/REDIS_PORT is required in production');
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl,
  redisHost,
  redisPort,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET || 'change-this-secret',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL!,
  },
  
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER!,
    password: process.env.SMTP_PASSWORD!,
    from: process.env.SMTP_FROM!,
  },
  
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    defaultMinDelayMs: parseInt(process.env.DEFAULT_MIN_DELAY_MS || '1000', 10),
    defaultEmailsPerHour: parseInt(process.env.DEFAULT_EMAILS_PER_HOUR || '10', 10),
  },
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SESSION_SECRET',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
] as const;

const productionRequiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'SESSION_SECRET',
  'FRONTEND_URL',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

if (isProduction) {
  for (const envVar of productionRequiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable for production: ${envVar}`);
    }
  }
}

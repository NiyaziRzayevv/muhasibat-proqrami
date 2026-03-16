const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default(''),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  PASSWORD_SALT: z.string().min(1).default('servis_salt_2024'),
  LOG_LEVEL: z.string().optional(),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('admin123'),
});

const env = schema.parse(process.env);

function getCorsOrigins() {
  const raw = env.CORS_ORIGINS || '';
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  return parts;
}

module.exports = { env, getCorsOrigins };

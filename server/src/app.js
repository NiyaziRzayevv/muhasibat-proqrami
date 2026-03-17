const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');

const { env, getCorsOrigins } = require('./env');
const { createLogger } = require('./logger');
const { healthRouter } = require('./routes/health');
const { authRouter } = require('./routes/auth');
const { usersRouter } = require('./routes/users');
const { rolesRouter } = require('./routes/roles');
const { auditRouter } = require('./routes/audit');
const statsRouter = require('./routes/stats');
const recordsRouter = require('./routes/records');
const customersRouter = require('./routes/customers');
const licensesRouter = require('./routes/licenses');
const licenseAdminRouter = require('./routes/license-admin');
const settingsRouter = require('./routes/settings');
const parseRouter = require('./routes/parse');
const productsRouter = require('./routes/products');
const stockRouter = require('./routes/stock');
const categoriesRouter = require('./routes/categories');
const suppliersRouter = require('./routes/suppliers');
const salesRouter = require('./routes/sales');
const backupRouter = require('./routes/backup');
const expensesRouter = require('./routes/expenses');
const vehiclesRouter = require('./routes/vehicles');
const notificationsRouter = require('./routes/notifications');
const appointmentsRouter = require('./routes/appointments');
const tasksRouter = require('./routes/tasks');
let assetsRouter, financeRouter, debtsRouter;
try { assetsRouter = require('./routes/assets'); } catch(e) { console.warn('assets route not found, skipping'); }
try { financeRouter = require('./routes/finance'); } catch(e) { console.warn('finance route not found, skipping'); }
try { debtsRouter = require('./routes/debts'); } catch(e) { console.warn('debts route not found, skipping'); }

function createApp() {
  const app = express();
  const logger = createLogger(env);

  app.set('trust proxy', 1);

  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(express.json({ limit: '2mb' }));

  const origins = getCorsOrigins();
  app.use(cors({
    origin: (origin, callback) => {
      if (!origins.length) return callback(null, true);
      if (!origin) return callback(null, true);
      if (origin === 'null') return callback(null, true);
      if (origins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS blocked'));
    },
    credentials: true,
  }));

  app.get('/', (req, res) => res.json({ success: true, data: { name: 'smartqeyd-api' } }));
  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/roles', rolesRouter);
  app.use('/audit', auditRouter);
  app.use('/stats', statsRouter);
  app.use('/records', recordsRouter);
  app.use('/customers', customersRouter);
  app.use('/licenses', licensesRouter);
  app.use('/licenses/admin', licenseAdminRouter);
  app.use('/settings', settingsRouter);
  app.use('/parse', parseRouter);
  app.use('/products', productsRouter);
  app.use('/stock', stockRouter);
  app.use('/categories', categoriesRouter);
  app.use('/suppliers', suppliersRouter);
  app.use('/sales', salesRouter);
  app.use('/expenses', expensesRouter);
  app.use('/vehicles', vehiclesRouter);
  app.use('/notifications', notificationsRouter);
  app.use('/appointments', appointmentsRouter);
  app.use('/tasks', tasksRouter);
  if (assetsRouter) app.use('/assets', assetsRouter);
  if (financeRouter) app.use('/finance', financeRouter);
  if (debtsRouter) app.use('/debts', debtsRouter);
  app.use('/backup', backupRouter);

  app.use((err, req, res, _next) => {
    req.log?.error({ err }, 'request_error');

    if (err?.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'validation_error', details: err.issues });
    }

    return res.status(500).json({ success: false, error: err?.message || 'internal_error' });
  });

  return app;
}

module.exports = { createApp };

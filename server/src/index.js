const { env } = require('./env');
const { createApp } = require('./app');
const { prisma } = require('./prisma');

async function main() {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on :${env.PORT}`);
  });

  const shutdown = async () => {
    try {
      await prisma.$disconnect();
    } catch (_) {}
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

const { env } = require('../src/env');
const { prisma } = require('../src/prisma');
const { hashPassword } = require('../src/utils/password');

async function main() {
  const defaultRoles = [
    {
      name: 'admin',
      displayName: 'Admin',
      permissions: {
        dashboard: true, records: true, sales: true, pos: true,
        products: true, customers: true, suppliers: true,
        reports: true, export: true, settings: true,
        users: true, finance: true, expenses: true,
        audit: true, license: true, backup: true,
        deleteRecords: true, deleteProducts: true, deleteSales: true,
      },
    },
    {
      name: 'manager',
      displayName: 'Menecer',
      permissions: {
        dashboard: true, records: true, sales: true, pos: true,
        products: true, customers: true, suppliers: true,
        reports: true, export: true, settings: false,
        users: false, finance: true, expenses: true,
        audit: false, license: false, backup: false,
        deleteRecords: true, deleteProducts: false, deleteSales: false,
      },
    },
    {
      name: 'cashier',
      displayName: 'Kassir',
      permissions: {
        dashboard: true, records: false, sales: true, pos: true,
        products: true, customers: true, suppliers: false,
        reports: false, export: false, settings: false,
        users: false, finance: false, expenses: false,
        audit: false, license: false, backup: false,
        deleteRecords: false, deleteProducts: false, deleteSales: false,
      },
    },
    {
      name: 'worker',
      displayName: 'İşçi',
      permissions: {
        dashboard: true, records: true, sales: false, pos: false,
        products: false, customers: true, suppliers: false,
        reports: false, export: false, settings: false,
        users: false, finance: false, expenses: false,
        audit: false, license: false, backup: false,
        deleteRecords: false, deleteProducts: false, deleteSales: false,
      },
    },
    {
      name: 'viewer',
      displayName: 'Müşahidəçi',
      permissions: {
        dashboard: true, records: true, sales: true, pos: false,
        products: true, customers: true, suppliers: true,
        reports: true, export: false, settings: false,
        users: false, finance: false, expenses: false,
        audit: false, license: false, backup: false,
        deleteRecords: false, deleteProducts: false, deleteSales: false,
      },
    },
  ];

  for (const role of defaultRoles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { displayName: role.displayName, permissions: role.permissions },
      create: { name: role.name, displayName: role.displayName, permissions: role.permissions },
    });
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (!adminRole) throw new Error('admin role missing');

  await prisma.user.upsert({
    where: { username: env.ADMIN_USERNAME },
    update: {
      roleId: adminRole.id,
      isActive: true,
      approvalStatus: 'approved',
      accessType: 'lifetime',
    },
    create: {
      username: env.ADMIN_USERNAME,
      passwordHash: hashPassword(env.ADMIN_PASSWORD),
      fullName: 'Admin İstifadəçi',
      roleId: adminRole.id,
      isActive: true,
      approvalStatus: 'approved',
      accessType: 'lifetime',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

const bcrypt = require('bcryptjs');
const prisma = require('../src/db/prisma');

async function seed() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      console.log(`[seed] User "${username}" already exists`);
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { username, password: hashed } });
    console.log(`[seed] Admin user "${username}" created`);
  } catch (err) {
    console.error(`[seed] Error: ${err.message}`);
  }
}

seed()
  .finally(async () => {
    await prisma.$disconnect();
  });

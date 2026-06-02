const mysql = require('mysql2/promise');

async function waitForDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  console.log(`Waiting for database...`);
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      const conn = await mysql.createConnection({ uri: url });
      await conn.end();
      console.log('Database connected!');
      return;
    } catch (e) {
      attempts++;
      console.log(`Attempt ${attempts}/${maxAttempts} failed. Retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  console.error('Could not connect to database after 60s');
  process.exit(1);
}

waitForDb().then(async () => {
  const { execSync } = require('child_process');
  try {
    console.log('Running migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Running seed...');
    execSync('node prisma/seed.js', { stdio: 'inherit' });
    console.log('Starting app...');
    execSync('node src/index.js', { stdio: 'inherit' });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});

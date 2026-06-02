const mysql = require('mysql2/promise');
const { URL } = require('url');

async function waitForDb() {
  const urlStr = process.env.DATABASE_URL;
  if (!urlStr) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  // Parse: mysql://user:pass@host:port/database
  const url = new URL(urlStr.replace('mysql://', 'http://'));
  
  const config = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.replace('/', ''),
  };

  console.log(`Connecting to ${config.host}:${config.port} as ${config.user}...`);
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      const conn = await mysql.createConnection(config);
      await conn.end();
      console.log('Database connected!');
      return;
    } catch (e) {
      attempts++;
      console.log(`Attempt ${attempts}/${maxAttempts} failed: ${e.message}`);
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
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: { ...process.env, npm_config_update_notifier: 'false' } });
    console.log('Running seed...');
    execSync('node prisma/seed.js', { stdio: 'inherit' });
    console.log('Starting app...');
    execSync('node src/index.js', { stdio: 'inherit' });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});

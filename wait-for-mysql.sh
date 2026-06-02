#!/bin/sh
echo "Waiting for MySQL at mysql:3306..."
while ! nc -z mysql 3306; do
  sleep 2
done
echo "MySQL is ready!"
npx prisma migrate deploy
node prisma/seed.js
node src/index.js

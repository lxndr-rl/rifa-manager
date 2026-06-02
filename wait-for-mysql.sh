#!/bin/sh
HOST=$(echo $DATABASE_URL | sed -n 's|.*://.*@\(.*\):.*|\1|p')
PORT=$(echo $DATABASE_URL | sed -n 's|.*://.*@.*:\(.*\)/.*|\1|p')

echo "Waiting for MySQL at $HOST:$PORT..."
while ! nc -z $HOST $PORT; do
  sleep 2
done
echo "MySQL is ready!"
npx prisma migrate deploy
node prisma/seed.js
node src/index.js

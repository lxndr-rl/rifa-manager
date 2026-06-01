#!/bin/bash
set -e

CONTAINER="rifa-manager"
IMAGE="${1:-ghcr.io/lxndr-rl/rifa-manager:main}"

echo "Stopping and removing old container..."
docker stop $CONTAINER 2>/dev/null || true
docker rm $CONTAINER 2>/dev/null || true

echo "Pulling new image..."
docker pull $IMAGE

echo "Starting new container..."
docker run -d \
  --name $CONTAINER \
  --restart unless-stopped \
  -p 3000:3000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e ADMIN_USERNAME="${ADMIN_USERNAME:-admin}" \
  -e ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}" \
  $IMAGE

echo "Deploy complete. Check logs: docker logs -f $CONTAINER"

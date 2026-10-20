#!/usr/bin/env bash
set -euo pipefail

# An isolated, disposable deployment: never removes an existing project container.
prefix="secondchance-check-${GITHUB_RUN_ID:-$$}"
network="$prefix-net"
mongo="$prefix-mongo"
sentiment="$prefix-sentiment"
app="$prefix-app"
cleanup() {
  docker rm -f "$app" "$sentiment" "$mongo" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$network" >/dev/null
docker run -d --name "$mongo" --network "$network" mongo:7 >/dev/null
for attempt in $(seq 1 45); do
  if docker exec "$mongo" mongosh --quiet --eval "db.adminCommand('ping').ok" >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" = 45 ]; then docker logs "$mongo"; exit 1; fi
  sleep 2
done
docker run --rm --network "$network" \
  -e "MONGO_URL=mongodb://$mongo:27017" -e MONGO_DB=secondChance \
  secondchance-backend:ci node util/import-mongo/index.js

docker run -d --name "$sentiment" --network "$network" secondchance-sentiment:ci >/dev/null
secret=$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")
docker run -d --name "$app" --network "$network" -p 127.0.0.1::3060 \
  -e "MONGO_URL=mongodb://$mongo:27017" -e MONGO_DB=secondChance \
  -e "JWT_SECRET=$secret" -e "SENTIMENT_URL=http://$sentiment:5000/sentiment" \
  secondchance-backend:ci >/dev/null
unset secret
port=$(docker port "$app" 3060/tcp | sed 's/.*://')
export API_BASE_URL="http://127.0.0.1:$port"
for attempt in $(seq 1 45); do
  if curl --fail --silent "$API_BASE_URL/health" >/dev/null; then break; fi
  if [ "$attempt" = 45 ]; then docker logs "$app"; exit 1; fi
  sleep 2
done
node scripts/smoke-deployment.cjs
printf 'CI/CD deployment verification succeeded: MongoDB, API, sentiment, landing page and React application.\n'

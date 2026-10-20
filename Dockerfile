FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY secondChance-frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY secondChance-frontend/ ./
RUN npm run build

FROM node:22-bookworm-slim AS backend
ENV NODE_ENV=production PORT=3060 HOST=0.0.0.0
WORKDIR /app/secondChance-backend
COPY secondChance-backend/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --chown=node:node secondChance-backend/ ./
COPY --from=frontend /build/build /app/secondChance-frontend/build
RUN mkdir -p public/images && chown -R node:node public/images
USER node
EXPOSE 3060
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3060/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "app.js"]

FROM node:22-bookworm-slim AS sentiment
ENV NODE_ENV=production PORT=5000 HOST=0.0.0.0
WORKDIR /app
COPY sentiment/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --chown=node:node sentiment/ ./
USER node
EXPOSE 5000
CMD ["node", "index.js"]

FROM backend AS app

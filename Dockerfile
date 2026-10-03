# Override NODE_IMAGE with an approved immutable digest for a release image.
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS dependencies
WORKDIR /app
RUN npm install --global bun@1.4.2
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN npm run build:production

FROM ${NODE_IMAGE} AS production-dependencies
WORKDIR /app
RUN npm install --global bun@1.4.2
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json tsconfig.json server.ts ./
COPY --chown=node:node server ./server
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "scripts/healthcheck.mjs"]
CMD ["node", "--import", "tsx", "server.ts"]

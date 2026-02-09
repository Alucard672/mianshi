#
# Monorepo (web + server) single-service image:
# - Builds Vue app into /app/web/dist
# - Runs Express server which serves API + static SPA
#

FROM node:18-alpine AS server_deps
WORKDIR /app
COPY server/package.json server/package-lock.json server/
RUN npm --prefix server ci --omit=dev

FROM node:18-alpine AS web_build
WORKDIR /app
COPY web/package.json web/package-lock.json web/
RUN npm --prefix web ci
COPY web web
RUN npm --prefix web run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=server_deps /app/server/node_modules server/node_modules
COPY server server
COPY --from=web_build /app/web/dist web/dist

# Cloud hosting platforms usually inject PORT; default is 3001 in code.
EXPOSE 3001
CMD ["node", "server/scripts/start.js"]


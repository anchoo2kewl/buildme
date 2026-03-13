FROM node:22-alpine

ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILD_TIME=unknown

ENV BUILDME_MCP_VERSION=$VERSION
ENV BUILDME_MCP_GIT_COMMIT=$COMMIT
ENV BUILDME_MCP_BUILD_TIME=$BUILD_TIME

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY dist/ dist/

EXPOSE 3001
CMD ["node", "dist/index.js"]

## Stage 1: Build frontend
FROM node:24-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

## Stage 2: Build backend
FROM golang:1.26-alpine AS backend
ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILD_TIME=unknown
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /app/frontend/dist ./frontend/dist
RUN go build -ldflags "-s -w \
    -X github.com/anchoo2kewl/buildme/internal/version.Version=${VERSION} \
    -X github.com/anchoo2kewl/buildme/internal/version.GitCommit=${COMMIT} \
    -X github.com/anchoo2kewl/buildme/internal/version.BuildTime=${BUILD_TIME}" \
    -o /buildme ./cmd/server

## Stage 3: Runtime
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
COPY --from=backend /buildme /usr/local/bin/buildme
VOLUME /data
ENV BUILDME_DB_PATH=/data/buildme.db
ENV BUILDME_FRONTEND_DIST=""
EXPOSE 8080
ENTRYPOINT ["buildme"]

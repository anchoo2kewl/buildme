## Stage 1: Build backend
FROM golang:1.26-alpine AS backend
ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILD_TIME=unknown
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags "-s -w \
    -X github.com/anchoo2kewl/buildme/internal/version.Version=${VERSION} \
    -X github.com/anchoo2kewl/buildme/internal/version.GitCommit=${COMMIT} \
    -X github.com/anchoo2kewl/buildme/internal/version.BuildTime=${BUILD_TIME}" \
    -o /buildme ./cmd/server

## Stage 2: Runtime
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
COPY --from=backend /buildme /usr/local/bin/buildme
COPY frontend/dist/ /app/frontend/dist/
VOLUME /data
ENV BUILDME_DB_PATH=/data/buildme.db
ENV BUILDME_FRONTEND_DIST=/app/frontend/dist
EXPOSE 8080
ENTRYPOINT ["buildme"]

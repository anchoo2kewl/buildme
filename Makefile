VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
COMMIT  ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
BUILD_TIME ?= $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
LDFLAGS := -s -w \
	-X github.com/anchoo2kewl/buildme/internal/version.Version=$(VERSION) \
	-X github.com/anchoo2kewl/buildme/internal/version.GitCommit=$(COMMIT) \
	-X github.com/anchoo2kewl/buildme/internal/version.BuildTime=$(BUILD_TIME)

.PHONY: all build frontend backend dev test clean docker

all: frontend backend

frontend:
	cd frontend && npm install && npm run build

backend:
	go build -ldflags "$(LDFLAGS)" -o buildme ./cmd/server

build: frontend backend

dev:
	@echo "Starting backend with hot-reload..."
	BUILDME_JWT_SECRET=dev-secret-change-me-32chars!! BUILDME_ENCRYPTION_KEY=12345678901234567890123456789012 \
		go run -ldflags "$(LDFLAGS)" ./cmd/server

test:
	go test -race -count=1 ./internal/...

lint:
	go vet ./...

clean:
	rm -f buildme
	rm -rf frontend/dist frontend/node_modules

docker:
	docker build -t buildme:$(VERSION) --build-arg VERSION=$(VERSION) --build-arg COMMIT=$(COMMIT) --build-arg BUILD_TIME=$(BUILD_TIME) .

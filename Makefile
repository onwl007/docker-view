SHELL := /bin/sh

APP_NAME := docker-view
CMD_PATH := ./cmd/docker-view
WEB_DIR := web
BUILD_DIR := build
BIN_DIR := $(BUILD_DIR)/bin
DIST_DIR := $(BUILD_DIR)/dist
RELEASE_ROOT := $(BUILD_DIR)/release
PKG_NAME := github.com/wanglei/docker-view/pkg/version
CACHE_DIR := .cache
GO_CACHE_DIR := $(CURDIR)/$(CACHE_DIR)/go-build

GO ?= go
PNPM ?= pnpm
GOOS ?= $(shell $(GO) env GOOS)
GOARCH ?= $(shell $(GO) env GOARCH)
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
BUILD_DATE ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
CONFIG ?= ./configs/config.example.yaml
VITE_HOST ?= 0.0.0.0

LDFLAGS := -X '$(PKG_NAME).version=$(VERSION)' -X '$(PKG_NAME).commit=$(COMMIT)' -X '$(PKG_NAME).date=$(BUILD_DATE)'
RELEASE_NAME := $(APP_NAME)_$(VERSION)_$(GOOS)_$(GOARCH)
RELEASE_DIR := $(RELEASE_ROOT)/$(RELEASE_NAME)

export GOCACHE := $(GO_CACHE_DIR)

.PHONY: help dev dev-backend dev-frontend install-frontend debug debug-build build build-backend build-frontend test test-backend test-frontend lint lint-backend lint-frontend typecheck release clean prepare-cache

help:
	@printf "%s\n" \
		"Available targets:" \
		"  make dev            Run backend debug server and Vite dev server together" \
		"  make dev-backend    Run backend in debug-friendly mode" \
		"  make dev-frontend   Run the Vite dev server" \
		"  make install-frontend Install frontend dependencies with pnpm" \
		"  make debug          Alias of make dev-backend" \
		"  make debug-build    Build backend with debug symbols" \
		"  make build          Build frontend and backend artifacts" \
		"  make test           Run backend and frontend unit tests" \
		"  make lint           Run backend vet, frontend lint and typecheck" \
		"  make release        Produce release package with binary and web assets" \
		"Variables:" \
		"  CONFIG=./configs/config.example.yaml" \
		"  VITE_HOST=0.0.0.0" \
		"  VERSION=<version> GOOS=<target-os> GOARCH=<target-arch>"

dev: prepare-cache
	@set -e; \
	trap 'kill 0 2>/dev/null || true' INT TERM EXIT; \
	$(MAKE) --no-print-directory dev-backend & \
	$(MAKE) --no-print-directory dev-frontend & \
	wait

dev-backend: prepare-cache
	$(GO) run -gcflags=all=-N\ -l $(CMD_PATH) --config $(CONFIG)

dev-frontend:
	cd $(WEB_DIR) && $(PNPM) dev --host $(VITE_HOST)

install-frontend:
	cd $(WEB_DIR) && $(PNPM) install

debug: dev-backend

debug-build: $(BIN_DIR)
	$(GO) build -gcflags=all=-N\ -l -o $(BIN_DIR)/$(APP_NAME)-debug $(CMD_PATH)

build: build-frontend build-backend

build-backend: $(BIN_DIR)
	CGO_ENABLED=0 GOOS=$(GOOS) GOARCH=$(GOARCH) $(GO) build -ldflags="$(LDFLAGS)" -o $(BIN_DIR)/$(APP_NAME) $(CMD_PATH)

build-frontend:
	cd $(WEB_DIR) && $(PNPM) build

test: test-backend test-frontend

test-backend:
	$(GO) test ./...

test-frontend:
	cd $(WEB_DIR) && $(PNPM) test

lint: lint-backend lint-frontend typecheck

lint-backend:
	$(GO) vet ./...

lint-frontend:
	cd $(WEB_DIR) && $(PNPM) lint

typecheck:
	cd $(WEB_DIR) && $(PNPM) typecheck

release: clean build-frontend test lint $(RELEASE_DIR)
	CGO_ENABLED=0 GOOS=$(GOOS) GOARCH=$(GOARCH) $(GO) build -trimpath -ldflags="-s -w $(LDFLAGS)" -o $(RELEASE_DIR)/$(APP_NAME) $(CMD_PATH)
	cp README.md $(RELEASE_DIR)/
	cp configs/config.example.yaml $(RELEASE_DIR)/
	cp -R $(WEB_DIR)/dist $(RELEASE_DIR)/web-dist
	tar -C $(RELEASE_ROOT) -czf $(DIST_DIR)/$(RELEASE_NAME).tar.gz $(RELEASE_NAME)

clean:
	rm -rf $(BIN_DIR) $(DIST_DIR) $(RELEASE_ROOT) $(CACHE_DIR)

prepare-cache:
	mkdir -p $(GO_CACHE_DIR)

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

$(DIST_DIR):
	mkdir -p $(DIST_DIR)

$(RELEASE_DIR): $(DIST_DIR)
	mkdir -p $(RELEASE_DIR)

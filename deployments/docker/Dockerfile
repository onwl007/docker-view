FROM node:24-alpine AS web-builder

WORKDIR /app/web
COPY web/package.json web/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY web ./
RUN pnpm build

FROM golang:1.26-alpine AS go-builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . ./
COPY --from=web-builder /app/web/dist ./web/dist
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/docker-view ./cmd/docker-view

FROM alpine:3.22

RUN addgroup -S docker-view && adduser -S -G docker-view docker-view
WORKDIR /opt/docker-view

COPY --from=go-builder /out/docker-view ./docker-view
COPY --from=go-builder /app/configs/config.example.yaml ./config.yaml
COPY --from=go-builder /app/web/dist ./web-dist

ENV DOCKER_VIEW_WEB_DIR=/opt/docker-view/web-dist
EXPOSE 8080

USER docker-view
ENTRYPOINT ["./docker-view"]
CMD ["--config", "/opt/docker-view/config.yaml"]

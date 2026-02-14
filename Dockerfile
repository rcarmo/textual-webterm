# Build: docker build -t webterm .
# Run:   docker run -v /var/run/docker.sock:/var/run/docker.sock -p 8080:8080 webterm --docker-watch

FROM golang:1.26-alpine AS builder

WORKDIR /src
COPY go/go.mod go/go.sum ./go/
RUN cd go && go mod download
COPY go ./go
RUN cd go && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/webterm ./cmd/webterm

FROM alpine:3.21 AS runtime

# Keep docker-cli for user-provided webterm-command values like `docker logs` / `docker exec`.
RUN apk add --no-cache ca-certificates docker-cli

WORKDIR /app
COPY --from=builder /out/webterm /usr/local/bin/webterm
COPY go/webterm/static /app/static

ENV WEBTERM_STATIC_PATH=/app/static

EXPOSE 8080

ENTRYPOINT ["webterm"]
CMD ["--host", "0.0.0.0", "--port", "8080", "--docker-watch"]

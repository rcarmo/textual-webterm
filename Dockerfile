# Minimal image for serving a web terminal with Docker watch mode
#
# Build: docker build -t textual-webterm .
# Run:   docker run -v /var/run/docker.sock:/var/run/docker.sock -p 8080:8080 textual-webterm --docker-watch
#
FROM python:3.12-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    make \
    && rm -rf /var/lib/apt/lists/*

# Copy only what's needed for installation
WORKDIR /build
COPY pyproject.toml poetry.lock* ./
COPY src/ ./src/
COPY Makefile ./

# Install the package
RUN pip install --no-cache-dir .

# Final minimal image
FROM python:3.12-slim

# Install only runtime dependencies (docker CLI for exec commands)
RUN apt-get update && apt-get install -y --no-install-recommends \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin/textual-webterm /usr/local/bin/textual-webterm

# Create non-root user (optional, but may need root for Docker socket access)
# RUN useradd -m webterm
# USER webterm

EXPOSE 8080

ENTRYPOINT ["textual-webterm"]
CMD ["--host", "0.0.0.0", "--port", "8080", "--docker-watch"]

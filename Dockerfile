# Minimal image for serving a web terminal
FROM python:3.12-slim

# Install minimal dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    make \
    && rm -rf /var/lib/apt/lists/*

# Install textual-webterm
COPY . /app
WORKDIR /app
RUN make install

# Expose the default port
EXPOSE 8080

# Run the terminal server
ENTRYPOINT ["textual-webterm"]
CMD ["--host", "0.0.0.0", "--port", "8080"]

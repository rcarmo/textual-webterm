package webterm

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

var (
	sharedClientsMu sync.RWMutex
	sharedClients   = map[string]*http.Client{}
)

const defaultDockerSocket = "/var/run/docker.sock"

func DockerSocketPath() string {
	dockerHost := strings.TrimSpace(os.Getenv(DockerHostEnv))
	if dockerHost == "" {
		return defaultDockerSocket
	}
	if strings.HasPrefix(dockerHost, "unix://") {
		return strings.TrimPrefix(dockerHost, "unix://")
	}
	if strings.HasPrefix(dockerHost, "/") {
		return dockerHost
	}
	return defaultDockerSocket
}

func newUnixHTTPClient(socketPath string, timeout time.Duration) *http.Client {
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			var dialer net.Dialer
			return dialer.DialContext(ctx, "unix", socketPath)
		},
	}
	return &http.Client{Transport: transport, Timeout: timeout}
}

func sharedUnixClient(socketPath string) *http.Client {
	sharedClientsMu.RLock()
	client, ok := sharedClients[socketPath]
	sharedClientsMu.RUnlock()
	if ok {
		return client
	}
	sharedClientsMu.Lock()
	defer sharedClientsMu.Unlock()
	if client, ok = sharedClients[socketPath]; ok {
		return client
	}
	client = newUnixHTTPClient(socketPath, 15*time.Second)
	sharedClients[socketPath] = client
	return client
}

func unixJSONRequest(socketPath, method, path string, payload any) (int, []byte, error) {
	var body io.Reader
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return 0, nil, err
		}
		body = bytes.NewReader(data)
	}
	req, err := http.NewRequest(method, "http://unix"+path, body)
	if err != nil {
		return 0, nil, err
	}
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := sharedUnixClient(socketPath).Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, nil, err
	}
	return resp.StatusCode, respBody, nil
}

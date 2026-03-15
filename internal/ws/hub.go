package ws

import (
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/anchoo2kewl/buildme/internal/models"
)

type Hub struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	stop       chan struct{}
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		stop:       make(chan struct{}),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			slog.Debug("ws client registered", "user_id", client.UserID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			slog.Debug("ws client unregistered", "user_id", client.UserID)

		case <-h.stop:
			h.mu.Lock()
			for client := range h.clients {
				close(client.send)
				delete(h.clients, client)
			}
			h.mu.Unlock()
			return
		}
	}
}

func (h *Hub) Stop() {
	close(h.stop)
}

func (h *Hub) Register(c *Client) {
	h.register <- c
}

func (h *Hub) Unregister(c *Client) {
	h.unregister <- c
}

// BroadcastVersionEvent sends a version event to all clients subscribed to the project.
func (h *Hub) BroadcastVersionEvent(event models.BuildEvent) {
	h.BroadcastBuildEvent(event)
}

// BroadcastBuildEvent sends a build event to all clients subscribed to the project.
func (h *Hub) BroadcastBuildEvent(event models.BuildEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		slog.Error("failed to marshal build event", "error", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if client.IsSubscribed(event.ProjectID) {
			select {
			case client.send <- data:
			default:
				// Client buffer full, skip
			}
		}
	}
}

package ws

import (
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 30 * time.Second
	maxMessageSize = 512
	sendBufSize    = 256
)

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	UserID int64

	subscriptions map[int64]bool
	mu            sync.RWMutex
}

func NewClient(hub *Hub, conn *websocket.Conn, userID int64) *Client {
	return &Client{
		hub:           hub,
		conn:          conn,
		send:          make(chan []byte, sendBufSize),
		UserID:        userID,
		subscriptions: make(map[int64]bool),
	}
}

func (c *Client) IsSubscribed(projectID int64) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.subscriptions[projectID]
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				slog.Warn("ws read error", "error", err)
			}
			break
		}
		c.handleMessage(message)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			ping, _ := json.Marshal(map[string]string{"type": "ping"})
			if err := c.conn.WriteMessage(websocket.TextMessage, ping); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleMessage(msg []byte) {
	var cmd struct {
		Type      string `json:"type"`
		ProjectID int64  `json:"project_id"`
	}
	if err := json.Unmarshal(msg, &cmd); err != nil {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	switch cmd.Type {
	case "subscribe":
		if cmd.ProjectID > 0 {
			c.subscriptions[cmd.ProjectID] = true
			slog.Debug("ws subscribed", "user_id", c.UserID, "project_id", cmd.ProjectID)
		}
	case "unsubscribe":
		delete(c.subscriptions, cmd.ProjectID)
	case "pong":
		// client pong, no-op (browser-level)
	}
}

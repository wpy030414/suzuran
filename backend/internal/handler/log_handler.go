package handler

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// LogEntry represents a log entry
type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"`
	Message   string `json:"message"`
	Context   string `json:"context,omitempty"`
}

// LogHandler handles log management requests
type LogHandler struct {
	logFile  string
	mu       sync.RWMutex
	entries  []LogEntry
	maxLines int
}

// NewLogHandler creates a new log handler
func NewLogHandler(logFile string, maxLines int) *LogHandler {
	h := &LogHandler{
		logFile:  logFile,
		maxLines: maxLines,
		entries:  make([]LogEntry, 0),
	}

	// Load existing logs if file exists
	h.loadLogs()

	return h
}

// AddLog adds a log entry to memory and optionally to file
func (h *LogHandler) AddLog(level, message string, context map[string]interface{}) {
	h.mu.Lock()
	defer h.mu.Unlock()

	entry := LogEntry{
		Timestamp: time.Now().Format(time.RFC3339),
		Level:     level,
		Message:   message,
	}

	if len(context) > 0 {
		if ctxBytes, err := json.Marshal(context); err == nil {
			entry.Context = string(ctxBytes)
		}
	}

	h.entries = append(h.entries, entry)

	// Keep only last maxLines entries
	if len(h.entries) > h.maxLines {
		h.entries = h.entries[len(h.entries)-h.maxLines:]
	}

	// Append to log file
	h.appendToFile(entry)
}

// GetLogs returns recent log entries
func (h *LogHandler) GetLogs(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "100")
	var limit int
	fmt.Sscanf(limitStr, "%d", &limit)

	if limit <= 0 || limit > 1000 {
		limit = 100
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	entries := h.entries
	if len(entries) > limit {
		entries = entries[len(entries)-limit:]
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":      entries,
		"total":     len(h.entries),
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// GetSystemLogs returns system-level logs
func (h *LogHandler) GetSystemLogs(c *gin.Context) {
	h.GetLogs(c)
}

func (h *LogHandler) loadLogs() {
	file, err := os.Open(h.logFile)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		var entry LogEntry
		if err := json.Unmarshal([]byte(line), &entry); err == nil {
			h.entries = append(h.entries, entry)
		}
	}

	// Keep only last maxLines
	if len(h.entries) > h.maxLines {
		h.entries = h.entries[len(h.entries)-h.maxLines:]
	}
}

func (h *LogHandler) appendToFile(entry LogEntry) {
	// Ensure directory exists
	dir := filepath.Dir(h.logFile)
	os.MkdirAll(dir, 0755)

	file, err := os.OpenFile(h.logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer file.Close()

	if data, err := json.Marshal(entry); err == nil {
		file.WriteString(string(data) + "\n")
	}
}

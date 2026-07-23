package service

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// DeliveryStatus represents the status of a notification delivery.
type DeliveryStatus string

const (
	DeliveryStatusPending  DeliveryStatus = "pending"
	DeliveryStatusSent     DeliveryStatus = "sent"
	DeliveryStatusRetrying DeliveryStatus = "retrying"
	DeliveryStatusFailed   DeliveryStatus = "failed"
	DeliveryStatusDelivered DeliveryStatus = "delivered"
)

// NotificationType represents the type of notification.
type NotificationType string

const (
	NotificationTypeInApp NotificationType = "in_app"
	NotificationTypeEmail NotificationType = "email"
)

// Notification represents a notification to be delivered.
type Notification struct {
	ID        string
	Type      NotificationType
	Recipient string // userID (as string) for in-app, email address for email
	Title     string
	Body      string
	Status    DeliveryStatus
	CreatedAt time.Time
	UpdatedAt time.Time
	Attempts  int
	LastError string
}

// InAppChannel defines the interface for in-app notification delivery.
type InAppChannel interface {
	Deliver(ctx context.Context, userID int, title, message string) error
}

// EmailChannel defines the interface for email notification delivery.
type EmailChannel interface {
	Send(ctx context.Context, to, subject, body string) error
}

// NotificationService handles notifications with delivery tracking and retry logic.
type NotificationService struct {
	inAppCh   InAppChannel
	emailCh   EmailChannel
	mu        sync.Mutex
	store     map[string]*Notification
	maxRetry  int
	errorCh   chan error
	idCounter atomic.Int64
}

// NewNotificationService creates a new notification service with the given channels.
func NewNotificationService(inAppCh InAppChannel, emailCh EmailChannel) *NotificationService {
	return &NotificationService{
		inAppCh:  inAppCh,
		emailCh:  emailCh,
		store:    make(map[string]*Notification),
		maxRetry: 3,
		errorCh:  make(chan error, 100),
	}
}

// nextID generates a unique notification ID.
func (s *NotificationService) nextID(prefix string) string {
	return fmt.Sprintf("%s_%d_%d", prefix, time.Now().UnixNano(), s.idCounter.Add(1))
}

// SendInApp sends an in-app notification and tracks delivery status.
func (s *NotificationService) SendInApp(ctx context.Context, userID int, title, message string) error {
	n := &Notification{
		ID:        s.nextID("inapp"),
		Type:      NotificationTypeInApp,
		Recipient: fmt.Sprintf("%d", userID),
		Title:     title,
		Body:      message,
		Status:    DeliveryStatusPending,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	s.mu.Lock()
	s.store[n.ID] = n
	s.mu.Unlock()

	err := s.inAppCh.Deliver(ctx, userID, title, message)
	s.mu.Lock()
	defer s.mu.Unlock()

	if err != nil {
		n.Status = DeliveryStatusFailed
		n.LastError = err.Error()
		n.UpdatedAt = time.Now()
		return err
	}

	n.Status = DeliveryStatusDelivered
	n.UpdatedAt = time.Now()
	log.Printf("In-app notification delivered to user %d: %s", userID, title)
	return nil
}

// SendEmail sends an email notification and tracks delivery status.
func (s *NotificationService) SendEmail(ctx context.Context, email, subject, body string) error {
	if !isValidEmail(email) {
		return fmt.Errorf("invalid email address: %s", email)
	}

	n := &Notification{
		ID:        s.nextID("email"),
		Type:      NotificationTypeEmail,
		Recipient: email,
		Title:     subject,
		Body:      body,
		Status:    DeliveryStatusPending,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	s.mu.Lock()
	s.store[n.ID] = n
	s.mu.Unlock()

	err := s.retrySend(ctx, n)
	if err != nil {
		return err
	}
	return nil
}

// retrySend handles the retry logic for a failed notification.
func (s *NotificationService) retrySend(ctx context.Context, n *Notification) error {
	var lastErr error
	for attempt := 1; attempt <= s.maxRetry; attempt++ {
		n.Attempts = attempt
		err := s.emailCh.Send(ctx, n.Recipient, n.Title, n.Body)
		if err == nil {
			s.mu.Lock()
			n.Status = DeliveryStatusDelivered
			n.UpdatedAt = time.Now()
			s.mu.Unlock()
			return nil
		}

		lastErr = err
		s.mu.Lock()
		n.Status = DeliveryStatusRetrying
		n.LastError = err.Error()
		n.UpdatedAt = time.Now()
		s.mu.Unlock()

		log.Printf("Email send attempt %d/%d failed for %s: %v", attempt, s.maxRetry, n.Recipient, err)
	}

	s.mu.Lock()
	n.Status = DeliveryStatusFailed
	n.LastError = lastErr.Error()
	n.UpdatedAt = time.Now()
	s.mu.Unlock()

	return fmt.Errorf("failed after %d attempts: %w", s.maxRetry, lastErr)
}

// GetNotification retrieves a notification by ID.
func (s *NotificationService) GetNotification(id string) (*Notification, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	n, ok := s.store[id]
	if !ok {
		return nil, false
	}
	// Return a copy to avoid data races
	copy := *n
	return &copy, true
}

// RenderTemplate renders a notification template with the given data.
// Templates use Go-style {{.Key}} placeholders.
func (s *NotificationService) RenderTemplate(tmpl string, data map[string]string) string {
	result := tmpl
	for key, value := range data {
		result = strings.ReplaceAll(result, "{{."+key+"}}", value)
	}
	return result
}

// SendApprovalNotification sends an approval notification via in-app channel.
func (s *NotificationService) SendApprovalNotification(ctx context.Context, approverUserID int, instanceID int, businessType, status string) error {
	title := s.RenderTemplate("{{.BusinessType}} #{{.InstanceID}} 待审批", map[string]string{
		"BusinessType": businessType,
		"InstanceID":  fmt.Sprintf("%d", instanceID),
	})
	message := fmt.Sprintf("您有一个新的审批任务: %s (实例 #%d), 状态: %s", businessType, instanceID, status)
	return s.SendInApp(ctx, approverUserID, title, message)
}

// GetDeliveryStatus returns the delivery status of a notification.
func (s *NotificationService) GetDeliveryStatus(id string) (DeliveryStatus, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	n, ok := s.store[id]
	if !ok {
		return "", false
	}
	return n.Status, true
}

// Errors returns the error channel for asynchronous error monitoring.
func (s *NotificationService) Errors() <-chan error {
	return s.errorCh
}

// isValidEmail performs a basic email validation.
func isValidEmail(email string) bool {
	if email == "" {
		return false
	}
	// Basic email regex validation
	pattern := `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`
	matched, _ := regexp.MatchString(pattern, email)
	return matched
}

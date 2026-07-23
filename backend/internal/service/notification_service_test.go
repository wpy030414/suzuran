package service

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
)

// mockInAppChannel is a mock implementation of InAppChannel for testing.
type mockInAppChannel struct {
	mu          sync.Mutex
	deliveries  []inAppDelivery
	shouldFail  bool
	failWithErr error
}

type inAppDelivery struct {
	UserID  int
	Title   string
	Message string
}

func newMockInAppChannel() *mockInAppChannel {
	return &mockInAppChannel{
		deliveries:  make([]inAppDelivery, 0),
		failWithErr: errors.New("mock in-app delivery failed"),
	}
}

func (m *mockInAppChannel) Deliver(ctx context.Context, userID int, title, message string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.shouldFail {
		return m.failWithErr
	}
	m.deliveries = append(m.deliveries, inAppDelivery{UserID: userID, Title: title, Message: message})
	return nil
}

func (m *mockInAppChannel) Deliveries() []inAppDelivery {
	m.mu.Lock()
	defer m.mu.Unlock()
	result := make([]inAppDelivery, len(m.deliveries))
	copy(result, m.deliveries)
	return result
}

func (m *mockInAppChannel) SetFail(shouldFail bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.shouldFail = shouldFail
}

// mockEmailChannel is a mock SMTP implementation for testing.
type mockEmailChannel struct {
	mu          sync.Mutex
	sent        []emailSent
	shouldFail  bool
	failWithErr error
	failCount   int
	maxFails    int
}

type emailSent struct {
	To      string
	Subject string
	Body    string
}

func newMockEmailChannel() *mockEmailChannel {
	return &mockEmailChannel{
		sent:        make([]emailSent, 0),
		failWithErr: errors.New("mock SMTP send failed"),
	}
}

func (m *mockEmailChannel) Send(ctx context.Context, to, subject, body string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.shouldFail {
		if m.failCount < m.maxFails {
			m.failCount++
			return m.failWithErr
		}
	}
	m.sent = append(m.sent, emailSent{To: to, Subject: subject, Body: body})
	return nil
}

func (m *mockEmailChannel) Sent() []emailSent {
	m.mu.Lock()
	defer m.mu.Unlock()
	result := make([]emailSent, len(m.sent))
	copy(result, m.sent)
	return result
}

func (m *mockEmailChannel) SetFail(shouldFail bool, maxFails int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.shouldFail = shouldFail
	m.maxFails = maxFails
	m.failCount = 0
}

func TestSendInApp_DeliversNotification(t *testing.T) {
	mock := newMockInAppChannel()
	svc := NewNotificationService(mock, newMockEmailChannel())

	userID := 42
	title := "Test Notification"
	message := "This is a test message"

	err := svc.SendInApp(context.Background(), userID, title, message)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	deliveries := mock.Deliveries()
	if len(deliveries) != 1 {
		t.Fatalf("expected 1 delivery, got %d", len(deliveries))
	}

	if deliveries[0].UserID != userID {
		t.Errorf("expected userID %d, got %d", userID, deliveries[0].UserID)
	}
	if deliveries[0].Title != title {
		t.Errorf("expected title %q, got %q", title, deliveries[0].Title)
	}
	if deliveries[0].Message != message {
		t.Errorf("expected message %q, got %q", message, deliveries[0].Message)
	}
}

func TestSendInApp_ReturnsErrorWhenChannelFails(t *testing.T) {
	mock := newMockInAppChannel()
	mock.SetFail(true)
	svc := NewNotificationService(mock, newMockEmailChannel())

	err := svc.SendInApp(context.Background(), 1, "title", "message")
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	if !strings.Contains(err.Error(), "mock in-app delivery failed") {
		t.Errorf("expected error to contain mock error message, got %q", err.Error())
	}
}

func TestSendInApp_TracksDeliveryStatus(t *testing.T) {
	mock := newMockInAppChannel()
	svc := NewNotificationService(mock, newMockEmailChannel())

	err := svc.SendInApp(context.Background(), 42, "title", "message")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(mock.Deliveries()) != 1 {
		t.Fatalf("expected 1 delivery, got %d", len(mock.Deliveries()))
	}
}

func TestSendEmail_SendsViaSMTP(t *testing.T) {
	mockEmail := newMockEmailChannel()
	svc := NewNotificationService(newMockInAppChannel(), mockEmail)

	to := "user@example.com"
	subject := "Welcome"
	body := "Welcome to Suzuran Cloud"

	err := svc.SendEmail(context.Background(), to, subject, body)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	sent := mockEmail.Sent()
	if len(sent) != 1 {
		t.Fatalf("expected 1 sent email, got %d", len(sent))
	}

	if sent[0].To != to {
		t.Errorf("expected recipient %q, got %q", to, sent[0].To)
	}
	if sent[0].Subject != subject {
		t.Errorf("expected subject %q, got %q", subject, sent[0].Subject)
	}
	if sent[0].Body != body {
		t.Errorf("expected body %q, got %q", body, sent[0].Body)
	}
}

func TestSendEmail_InvalidEmailAddress(t *testing.T) {
	mockEmail := newMockEmailChannel()
	svc := NewNotificationService(newMockInAppChannel(), mockEmail)

	invalidEmails := []string{
		"",
		"not-an-email",
		"@example.com",
		"user@",
		"user@.com",
		"user name@example.com",
	}

	for _, email := range invalidEmails {
		err := svc.SendEmail(context.Background(), email, "subject", "body")
		if err == nil {
			t.Errorf("expected error for invalid email %q, got nil", email)
		}
		if !strings.Contains(err.Error(), "invalid email address") {
			t.Errorf("expected 'invalid email address' error for %q, got %q", email, err.Error())
		}
	}
}

func TestSendEmail_NoEmailSentForInvalidAddress(t *testing.T) {
	mockEmail := newMockEmailChannel()
	svc := NewNotificationService(newMockInAppChannel(), mockEmail)

	err := svc.SendEmail(context.Background(), "invalid", "subject", "body")
	if err == nil {
		t.Fatal("expected error for invalid email")
	}

	if len(mockEmail.Sent()) != 0 {
		t.Errorf("expected no emails sent, got %d", len(mockEmail.Sent()))
	}
}

func TestRenderTemplate_SubstitutesPlaceholders(t *testing.T) {
	svc := NewNotificationService(newMockInAppChannel(), newMockEmailChannel())

	tmpl := "Hello {{.Name}}, your {{.Item}} is ready."
	data := map[string]string{
		"Name": "Alice",
		"Item": "application",
	}

	result := svc.RenderTemplate(tmpl, data)
	expected := "Hello Alice, your application is ready."
	if result != expected {
		t.Errorf("expected %q, got %q", expected, result)
	}
}

func TestRenderTemplate_LeavesUnknownPlaceholders(t *testing.T) {
	svc := NewNotificationService(newMockInAppChannel(), newMockEmailChannel())

	tmpl := "Hello {{.Name}}, your {{.UnknownKey}} is ready."
	data := map[string]string{
		"Name": "Alice",
	}

	result := svc.RenderTemplate(tmpl, data)
	expected := "Hello Alice, your {{.UnknownKey}} is ready."
	if result != expected {
		t.Errorf("expected %q, got %q", expected, result)
	}
}

func TestRenderTemplate_ApprovalTemplate(t *testing.T) {
	svc := NewNotificationService(newMockInAppChannel(), newMockEmailChannel())

	tmpl := "{{.BusinessType}} #{{.InstanceID}} 待审批"
	data := map[string]string{
		"BusinessType": "leave_application",
		"InstanceID":  "123",
	}

	result := svc.RenderTemplate(tmpl, data)
	expected := "leave_application #123 待审批"
	if result != expected {
		t.Errorf("expected %q, got %q", expected, result)
	}
}

func TestSendEmail_RetryLogic_SucceedsAfterFailures(t *testing.T) {
	mockEmail := newMockEmailChannel()
	// Fail twice, then succeed (maxRetry is 3 by default)
	mockEmail.SetFail(true, 2)
	svc := NewNotificationService(newMockInAppChannel(), mockEmail)

	err := svc.SendEmail(context.Background(), "user@example.com", "subject", "body")
	if err != nil {
		t.Fatalf("expected success after retries, got %v", err)
	}

	if len(mockEmail.Sent()) != 1 {
		t.Fatalf("expected 1 sent email, got %d", len(mockEmail.Sent()))
	}
}

func TestSendEmail_RetryLogic_FailsAfterMaxRetries(t *testing.T) {
	mockEmail := newMockEmailChannel()
	// Fail more than max retry count
	mockEmail.SetFail(true, 10)
	svc := NewNotificationService(newMockInAppChannel(), mockEmail)

	err := svc.SendEmail(context.Background(), "user@example.com", "subject", "body")
	if err == nil {
		t.Fatal("expected error after max retries")
	}

	if !strings.Contains(err.Error(), "failed after 3 attempts") {
		t.Errorf("expected error to contain 'failed after 3 attempts', got %q", err.Error())
	}

	if len(mockEmail.Sent()) != 0 {
		t.Errorf("expected no emails sent, got %d", len(mockEmail.Sent()))
	}
}

func TestGetNotification_TracksDelivery(t *testing.T) {
	mock := newMockInAppChannel()
	svc := NewNotificationService(mock, newMockEmailChannel())

	userID := 42
	title := "Test"
	message := "Message"

	err := svc.SendInApp(context.Background(), userID, title, message)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Since ID is generated internally, retrieve the only notification
	svc.mu.Lock()
	var id string
	for key := range svc.store {
		id = key
		break
	}
	svc.mu.Unlock()

	n, ok := svc.GetNotification(id)
	if !ok {
		t.Fatal("expected notification to exist")
	}

	if n.Recipient != "42" {
		t.Errorf("expected recipient '42', got %q", n.Recipient)
	}
	if n.Status != DeliveryStatusDelivered {
		t.Errorf("expected status delivered, got %q", n.Status)
	}
	if n.Title != title {
		t.Errorf("expected title %q, got %q", title, n.Title)
	}
	if n.Body != message {
		t.Errorf("expected body %q, got %q", message, n.Body)
	}
}

func TestGetDeliveryStatus_Failed(t *testing.T) {
	mockEmail := newMockEmailChannel()
	mockEmail.SetFail(true, 10)
	svc := NewNotificationService(newMockInAppChannel(), mockEmail)

	err := svc.SendEmail(context.Background(), "user@example.com", "subject", "body")
	if err == nil {
		t.Fatal("expected error")
	}

	svc.mu.Lock()
	var id string
	for key := range svc.store {
		id = key
		break
	}
	svc.mu.Unlock()

	status, ok := svc.GetDeliveryStatus(id)
	if !ok {
		t.Fatal("expected status to exist")
	}
	if status != DeliveryStatusFailed {
		t.Errorf("expected status failed, got %q", status)
	}
}

func TestSendApprovalNotification_IntegrationWithWorkflow(t *testing.T) {
	mockInApp := newMockInAppChannel()
	svc := NewNotificationService(mockInApp, newMockEmailChannel())

	approverUserID := 7
	instanceID := 123
	businessType := "leave_application"
	status := "待审批"

	err := svc.SendApprovalNotification(context.Background(), approverUserID, instanceID, businessType, status)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	deliveries := mockInApp.Deliveries()
	if len(deliveries) != 1 {
		t.Fatalf("expected 1 delivery, got %d", len(deliveries))
	}

	if deliveries[0].UserID != approverUserID {
		t.Errorf("expected userID %d, got %d", approverUserID, deliveries[0].UserID)
	}

	expectedTitle := "leave_application #123 待审批"
	if deliveries[0].Title != expectedTitle {
		t.Errorf("expected title %q, got %q", expectedTitle, deliveries[0].Title)
	}

	expectedBody := "您有一个新的审批任务: leave_application (实例 #123), 状态: 待审批"
	if deliveries[0].Message != expectedBody {
		t.Errorf("expected message %q, got %q", expectedBody, deliveries[0].Message)
	}
}

func TestSendApprovalNotification_UsesWorkflowTemplateVariables(t *testing.T) {
	mockInApp := newMockInAppChannel()
	svc := NewNotificationService(mockInApp, newMockEmailChannel())

	err := svc.SendApprovalNotification(context.Background(), 9, 999, "expense", "待审批")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	deliveries := mockInApp.Deliveries()
	if len(deliveries) != 1 {
		t.Fatalf("expected 1 delivery, got %d", len(deliveries))
	}

	if !strings.Contains(deliveries[0].Title, "expense #999 待审批") {
		t.Errorf("expected rendered title to contain 'expense #999 待审批', got %q", deliveries[0].Title)
	}

	if !strings.Contains(deliveries[0].Message, "expense") {
		t.Errorf("expected message to contain business type 'expense', got %q", deliveries[0].Message)
	}

	if !strings.Contains(deliveries[0].Message, "#999") {
		t.Errorf("expected message to contain instance ID '#999', got %q", deliveries[0].Message)
	}
}

func TestSendApprovalNotification_ErrorPropagated(t *testing.T) {
	mockInApp := newMockInAppChannel()
	mockInApp.SetFail(true)
	svc := NewNotificationService(mockInApp, newMockEmailChannel())

	err := svc.SendApprovalNotification(context.Background(), 1, 1, "type", "待审批")
	if err == nil {
		t.Fatal("expected error when in-app channel fails")
	}
}

func TestSendEmail_MessageContentPreserved(t *testing.T) {
	mockEmail := newMockEmailChannel()
	svc := NewNotificationService(newMockInAppChannel(), mockEmail)

	subject := "Subject with special chars: <>&\"'"
	body := "Body with unicode: 你好世界"

	err := svc.SendEmail(context.Background(), "user@example.com", subject, body)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	sent := mockEmail.Sent()
	if len(sent) != 1 {
		t.Fatalf("expected 1 sent email, got %d", len(sent))
	}

	if sent[0].Subject != subject {
		t.Errorf("expected subject %q, got %q", subject, sent[0].Subject)
	}
	if sent[0].Body != body {
		t.Errorf("expected body %q, got %q", body, sent[0].Body)
	}
}

func TestConcurrentSendInApp_RaceSafe(t *testing.T) {
	mock := newMockInAppChannel()
	svc := NewNotificationService(mock, newMockEmailChannel())

	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			err := svc.SendInApp(context.Background(), i, "title", "message")
			if err != nil {
				t.Errorf("send failed for user %d: %v", i, err)
			}
		}(i)
	}
	wg.Wait()

	deliveries := mock.Deliveries()
	if len(deliveries) != 100 {
		t.Fatalf("expected 100 deliveries, got %d", len(deliveries))
	}

	svc.mu.Lock()
	count := len(svc.store)
	svc.mu.Unlock()
	if count != 100 {
		t.Fatalf("expected 100 tracked notifications, got %d", count)
	}
}

func TestConcurrentSendEmail_RaceSafe(t *testing.T) {
	mockEmail := newMockEmailChannel()
	svc := NewNotificationService(newMockInAppChannel(), mockEmail)

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			err := svc.SendEmail(context.Background(), "user@example.com", "subject", "body")
			if err != nil {
				t.Errorf("send failed: %v", err)
			}
		}(i)
	}
	wg.Wait()

	sent := mockEmail.Sent()
	if len(sent) != 50 {
		t.Fatalf("expected 50 sent emails, got %d", len(sent))
	}
}

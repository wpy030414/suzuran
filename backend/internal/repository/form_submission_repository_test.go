package repository_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func cleanupFormSubmissions() {
	testDB.Exec("DELETE FROM form_submissions")
}

func TestFormSubmissionRepository_Create(t *testing.T) {
	cleanupFormSubmissions()
	repo := repository.NewFormSubmissionRepository(testDB)

	t.Run("should create form submission successfully", func(t *testing.T) {
		sub := &model.FormSubmission{
			OrgID:     1,
			FormCode:  "leave_request",
			CreatedBy: 100,
			Data:      model.JSONB{"employee": "John Doe", "days": 5},
		}
		err := repo.Create(context.Background(), sub)
		require.NoError(t, err)
		assert.NotZero(t, sub.ID)
		assert.Equal(t, 1, sub.OrgID)
		assert.Equal(t, "leave_request", sub.FormCode)
		assert.Equal(t, 100, sub.CreatedBy)
	})

	t.Run("should create submission with complex data", func(t *testing.T) {
		sub := &model.FormSubmission{
			OrgID:     2,
			FormCode:  "expense_report",
			CreatedBy: 200,
			Data: model.JSONB{
				"items": []interface{}{
					map[string]interface{}{"name": "Flight", "amount": 500},
					map[string]interface{}{"name": "Hotel", "amount": 300},
				},
				"total": 800,
			},
		}
		err := repo.Create(context.Background(), sub)
		require.NoError(t, err)
		assert.NotZero(t, sub.ID)
	})
}

func TestFormSubmissionRepository_GetByID(t *testing.T) {
	cleanupFormSubmissions()
	repo := repository.NewFormSubmissionRepository(testDB)

	t.Run("should return submission when exists", func(t *testing.T) {
		sub := &model.FormSubmission{
			OrgID:     3,
			FormCode:  "test_form",
			CreatedBy: 50,
			Data:      model.JSONB{"field1": "value1"},
		}
		require.NoError(t, repo.Create(context.Background(), sub))

		result, err := repo.GetByID(context.Background(), sub.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, sub.ID, result.ID)
		assert.Equal(t, 3, result.OrgID)
		assert.Equal(t, "test_form", result.FormCode)
		assert.Equal(t, 50, result.CreatedBy)
	})

	t.Run("should return nil when not found", func(t *testing.T) {
		result, err := repo.GetByID(context.Background(), 9999)
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestFormSubmissionRepository_ListByFormCode(t *testing.T) {
	cleanupFormSubmissions()
	repo := repository.NewFormSubmissionRepository(testDB)

	t.Run("should list submissions by form code ordered by ID DESC", func(t *testing.T) {
		sub1 := &model.FormSubmission{OrgID: 10, FormCode: "feedback", CreatedBy: 1, Data: model.JSONB{"seq": 1}}
		sub2 := &model.FormSubmission{OrgID: 10, FormCode: "feedback", CreatedBy: 2, Data: model.JSONB{"seq": 2}}
		sub3 := &model.FormSubmission{OrgID: 10, FormCode: "feedback", CreatedBy: 3, Data: model.JSONB{"seq": 3}}

		require.NoError(t, repo.Create(context.Background(), sub1))
		require.NoError(t, repo.Create(context.Background(), sub2))
		require.NoError(t, repo.Create(context.Background(), sub3))

		subs, err := repo.ListByFormCode(context.Background(), 10, "feedback")
		require.NoError(t, err)
		require.Len(t, subs, 3)
		// Should be ordered by ID DESC
		assert.Equal(t, sub3.ID, subs[0].ID)
		assert.Equal(t, sub2.ID, subs[1].ID)
		assert.Equal(t, sub1.ID, subs[2].ID)
	})

	t.Run("should only return submissions for specified org", func(t *testing.T) {
		sub1 := &model.FormSubmission{OrgID: 20, FormCode: "shared_form", CreatedBy: 1}
		sub2 := &model.FormSubmission{OrgID: 30, FormCode: "shared_form", CreatedBy: 2}

		require.NoError(t, repo.Create(context.Background(), sub1))
		require.NoError(t, repo.Create(context.Background(), sub2))

		subs, err := repo.ListByFormCode(context.Background(), 20, "shared_form")
		require.NoError(t, err)
		require.Len(t, subs, 1)
		assert.Equal(t, sub1.ID, subs[0].ID)
	})

	t.Run("should return empty slice when no submissions", func(t *testing.T) {
		subs, err := repo.ListByFormCode(context.Background(), 999, "nonexistent")
		require.NoError(t, err)
		assert.Empty(t, subs)
	})
}

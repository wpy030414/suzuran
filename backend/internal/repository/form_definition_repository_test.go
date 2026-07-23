package repository_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func cleanupFormDefinitions() {
	testDB.Exec("DELETE FROM form_definitions")
}

func TestFormDefinitionRepository_Create(t *testing.T) {
	cleanupFormDefinitions()
	repo := repository.NewFormDefinitionRepository(testDB)

	t.Run("should create form definition successfully", func(t *testing.T) {
		form := &model.FormDefinition{
			OrgID:     1,
			Name:      "Leave Request",
			Code:      "leave_request",
			CreatedBy: 1,
			Schema:    model.JSONB{"fields": []string{"name", "date"}},
		}
		err := repo.Create(context.Background(), form)
		require.NoError(t, err)
		assert.NotZero(t, form.ID)
		assert.Equal(t, "Leave Request", form.Name)
		assert.Equal(t, "leave_request", form.Code)
	})

	t.Run("should fail on duplicate code within same org", func(t *testing.T) {
		form1 := &model.FormDefinition{
			OrgID:     2,
			Name:      "Form A",
			Code:      "duplicate_code",
			CreatedBy: 1,
		}
		err := repo.Create(context.Background(), form1)
		require.NoError(t, err)

		form2 := &model.FormDefinition{
			OrgID:     2,
			Name:      "Form B",
			Code:      "duplicate_code",
			CreatedBy: 1,
		}
		err = repo.Create(context.Background(), form2)
		assert.Error(t, err)
	})

	t.Run("should allow same code in different orgs", func(t *testing.T) {
		form1 := &model.FormDefinition{
			OrgID:     10,
			Name:      "Org 10 Form",
			Code:      "shared_code",
			CreatedBy: 1,
		}
		form2 := &model.FormDefinition{
			OrgID:     20,
			Name:      "Org 20 Form",
			Code:      "shared_code",
			CreatedBy: 1,
		}

		require.NoError(t, repo.Create(context.Background(), form1))
		err := repo.Create(context.Background(), form2)
		assert.NoError(t, err)
	})
}

func TestFormDefinitionRepository_GetByID(t *testing.T) {
	cleanupFormDefinitions()
	repo := repository.NewFormDefinitionRepository(testDB)

	t.Run("should return form when exists", func(t *testing.T) {
		form := &model.FormDefinition{
			OrgID:     3,
			Name:      "Get Test Form",
			Code:      "get_test",
			CreatedBy: 1,
			Status:    "draft",
		}
		require.NoError(t, repo.Create(context.Background(), form))

		result, err := repo.GetByID(context.Background(), form.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, form.ID, result.ID)
		assert.Equal(t, "Get Test Form", result.Name)
		assert.Equal(t, "get_test", result.Code)
		assert.Equal(t, "draft", result.Status)
	})

	t.Run("should return nil when not found", func(t *testing.T) {
		result, err := repo.GetByID(context.Background(), 9999)
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestFormDefinitionRepository_GetByCode(t *testing.T) {
	cleanupFormDefinitions()
	repo := repository.NewFormDefinitionRepository(testDB)

	t.Run("should return form by code", func(t *testing.T) {
		form := &model.FormDefinition{
			OrgID:     4,
			Name:      "Code Lookup Form",
			Code:      "code_lookup",
			CreatedBy: 1,
		}
		require.NoError(t, repo.Create(context.Background(), form))

		result, err := repo.GetByCode(context.Background(), 4, "code_lookup")
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, form.ID, result.ID)
		assert.Equal(t, "Code Lookup Form", result.Name)
	})

	t.Run("should return nil when code not found in org", func(t *testing.T) {
		result, err := repo.GetByCode(context.Background(), 99, "nonexistent")
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("should not return form from different org", func(t *testing.T) {
		form := &model.FormDefinition{
			OrgID:     30,
			Name:      "Org 30 Form",
			Code:      "org_specific",
			CreatedBy: 1,
		}
		require.NoError(t, repo.Create(context.Background(), form))

		result, err := repo.GetByCode(context.Background(), 40, "org_specific")
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

func TestFormDefinitionRepository_ListByOrg(t *testing.T) {
	cleanupFormDefinitions()
	repo := repository.NewFormDefinitionRepository(testDB)

	t.Run("should list all forms for org ordered by ID", func(t *testing.T) {
		form1 := &model.FormDefinition{OrgID: 50, Name: "Form A", Code: "form_a_50", CreatedBy: 1}
		form2 := &model.FormDefinition{OrgID: 50, Name: "Form B", Code: "form_b_50", CreatedBy: 1}
		form3 := &model.FormDefinition{OrgID: 50, Name: "Form C", Code: "form_c_50", CreatedBy: 1}

		require.NoError(t, repo.Create(context.Background(), form1))
		require.NoError(t, repo.Create(context.Background(), form2))
		require.NoError(t, repo.Create(context.Background(), form3))

		forms, err := repo.ListByOrg(context.Background(), 50)
		require.NoError(t, err)
		require.Len(t, forms, 3)
		assert.Equal(t, "Form A", forms[0].Name)
		assert.Equal(t, "Form B", forms[1].Name)
		assert.Equal(t, "Form C", forms[2].Name)
	})

	t.Run("should return empty slice when no forms", func(t *testing.T) {
		forms, err := repo.ListByOrg(context.Background(), 999)
		require.NoError(t, err)
		assert.Empty(t, forms)
	})
}

func TestFormDefinitionRepository_Update(t *testing.T) {
	cleanupFormDefinitions()
	repo := repository.NewFormDefinitionRepository(testDB)

	t.Run("should update form successfully", func(t *testing.T) {
		form := &model.FormDefinition{
			OrgID:     6,
			Name:      "Original Name",
			Code:      "update_test",
			CreatedBy: 1,
			Schema:    model.JSONB{"version": 1},
		}
		require.NoError(t, repo.Create(context.Background(), form))

		form.Name = "Updated Name"
		form.Schema = model.JSONB{"version": 2, "updated": true}
		err := repo.Update(context.Background(), form)
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), form.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, "Updated Name", result.Name)
	})
}

func TestFormDefinitionRepository_Delete(t *testing.T) {
	cleanupFormDefinitions()
	repo := repository.NewFormDefinitionRepository(testDB)

	t.Run("should delete form successfully", func(t *testing.T) {
		form := &model.FormDefinition{
			OrgID:     7,
			Name:      "Delete Me",
			Code:      "delete_test",
			CreatedBy: 1,
		}
		require.NoError(t, repo.Create(context.Background(), form))

		err := repo.Delete(context.Background(), form.ID)
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), form.ID)
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("should succeed even if form doesn't exist", func(t *testing.T) {
		err := repo.Delete(context.Background(), 9999)
		assert.NoError(t, err)
	})
}

func TestFormDefinitionRepository_Publish(t *testing.T) {
	cleanupFormDefinitions()
	repo := repository.NewFormDefinitionRepository(testDB)

	t.Run("should publish form successfully", func(t *testing.T) {
		form := &model.FormDefinition{
			OrgID:     8,
			Name:      "Publish Test",
			Code:      "publish_test",
			CreatedBy: 1,
			Status:    "draft",
		}
		require.NoError(t, repo.Create(context.Background(), form))
		assert.Equal(t, "draft", form.Status)

		err := repo.Publish(context.Background(), form.ID)
		require.NoError(t, err)

		result, err := repo.GetByID(context.Background(), form.ID)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, "published", result.Status)
	})
}

package repository_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

func cleanupWidgetLibrary() {
	testDB.Exec("DELETE FROM widget_library")
}

func TestWidgetLibraryRepository_GetByCode(t *testing.T) {
	cleanupWidgetLibrary()
	repo := repository.NewWidgetLibraryRepository(testDB)

	t.Run("should return widget by code", func(t *testing.T) {
		widget := &model.WidgetLibrary{
			Name: "Text Input",
			Code: "text_input",
			Type: "input",
			Config: model.JSONB{
				"placeholder": "Enter text",
				"maxLength":   100,
			},
		}
		testDB.Create(widget)

		result, err := repo.GetByCode(context.Background(), "text_input")
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, widget.ID, result.ID)
		assert.Equal(t, "Text Input", result.Name)
		assert.Equal(t, "text_input", result.Code)
		assert.Equal(t, "input", result.Type)
	})

	t.Run("should return nil when code not found", func(t *testing.T) {
		result, err := repo.GetByCode(context.Background(), "nonexistent")
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

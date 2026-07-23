package repository

import (
	"context"
	"github.com/xrl/suzuran-cloud/internal/model"
	"gorm.io/gorm"
)

type WidgetLibraryRepository struct {
	db *gorm.DB
}

func NewWidgetLibraryRepository(db *gorm.DB) *WidgetLibraryRepository {
	return &WidgetLibraryRepository{db: db}
}

func (r *WidgetLibraryRepository) GetByCode(ctx context.Context, code string) (*model.WidgetLibrary, error) {
	var widget model.WidgetLibrary
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&widget).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &widget, err
}

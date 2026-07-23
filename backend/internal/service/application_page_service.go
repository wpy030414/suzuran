package service

import (
	"context"
	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

type ApplicationPageService struct {
	pageRepo   *repository.ApplicationPageRepository
	widgetRepo *repository.WidgetLibraryRepository
}

func NewApplicationPageService(pageRepo *repository.ApplicationPageRepository, widgetRepo *repository.WidgetLibraryRepository) *ApplicationPageService {
	return &ApplicationPageService{
		pageRepo:   pageRepo,
		widgetRepo: widgetRepo,
	}
}

func (s *ApplicationPageService) CreatePage(ctx context.Context, page *model.ApplicationPage) error {
	return s.pageRepo.Create(ctx, page)
}

func (s *ApplicationPageService) GetPageByCode(ctx context.Context, orgID int, code string) (*model.ApplicationPage, error) {
	return s.pageRepo.GetByCode(ctx, orgID, code)
}

func (s *ApplicationPageService) RenderTemplate(ctx context.Context, page *model.ApplicationPage) (string, error) {
	return page.VueTemplate, nil
}

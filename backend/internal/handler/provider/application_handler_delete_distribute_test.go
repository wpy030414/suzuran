package provider

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
	"github.com/xrl/suzuran-cloud/internal/service"
)

func setupDeleteDistributeTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, db.AutoMigrate(
		&model.Application{},
		&model.Form{},
		&model.View{},
	))

	return db
}

func setupDeleteDistributeHandler(t *testing.T) (*ApplicationHandler, *gorm.DB) {
	t.Helper()
	db := setupDeleteDistributeTestDB(t)
	appService := service.NewApplicationService(
		repository.NewApplicationRepository(db),
		repository.NewFormRepository(db),
		repository.NewViewRepository(db),
	)
	handler := NewApplicationHandler(appService)
	return handler, db
}

func seedAppWithFormsAndViews(t *testing.T, db *gorm.DB, orgID int, pkgName, name string) *model.Application {
	t.Helper()
	app := &model.Application{
		OrgID:       orgID,
		PackageName: pkgName,
		Name:        name,
		Description: "test app",
		Schema:      model.JSONB{"key": "val"},
	}
	app.GenerateUUID()
	app.SetVersion(time.Now(), "abcd")
	require.NoError(t, db.Create(app).Error)

	form := &model.Form{
		ApplicationID: app.ID,
		Name:          "TestForm",
		Code:          "test_form",
		Schema:        model.JSONB{"fields": []interface{}{}},
	}
	require.NoError(t, db.Create(form).Error)

	view := &model.View{
		ApplicationID: app.ID,
		Name:          "TestView",
		Code:          "test_view",
		Type:          "table",
		Config:        model.JSONB{"columns": []interface{}{"name"}},
	}
	require.NoError(t, db.Create(view).Error)

	return app
}

func TestDeleteApp_Success(t *testing.T) {
	handler, db := setupDeleteDistributeHandler(t)
	app := seedAppWithFormsAndViews(t, db, 1, "test-pkg", "Test App")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("DELETE", "/api/provider/applications/"+fmt.Sprint(app.ID), nil)
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}}

	handler.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "deleted", resp["message"])

	var count int64
	db.Model(&model.Application{}).Where("id = ?", app.ID).Count(&count)
	assert.Equal(t, int64(0), count)
}

func TestDistributeApp_Success(t *testing.T) {
	handler, db := setupDeleteDistributeHandler(t)
	app := seedAppWithFormsAndViews(t, db, 1, "com.example.hr", "HR App")
	targetOrgID := 99

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]interface{}{
		"targetOrgId": targetOrgID,
		"overwrite":   false,
	})
	c.Request = httptest.NewRequest("POST", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/distribute", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}}

	handler.Distribute(c)

	assert.Equal(t, http.StatusCreated, w.Code)
	var newApp model.Application
	json.Unmarshal(w.Body.Bytes(), &newApp)
	assert.Equal(t, targetOrgID, newApp.OrgID)
	assert.Equal(t, "com.example.hr", newApp.PackageName)
	assert.Equal(t, "HR App", newApp.Name)
	assert.NotEqual(t, app.ID, newApp.ID)
	assert.NotEmpty(t, newApp.UUID)

	var formCount int64
	db.Model(&model.Form{}).Where("application_id = ?", newApp.ID).Count(&formCount)
	assert.Equal(t, int64(1), formCount)

	var viewCount int64
	db.Model(&model.View{}).Where("application_id = ?", newApp.ID).Count(&viewCount)
	assert.Equal(t, int64(1), viewCount)

	var srcCount int64
	db.Model(&model.Application{}).Where("id = ?", app.ID).Count(&srcCount)
	assert.Equal(t, int64(1), srcCount)
}

func TestDistributeApp_Overwrite(t *testing.T) {
	handler, db := setupDeleteDistributeHandler(t)
	app := seedAppWithFormsAndViews(t, db, 1, "com.example.finance", "Finance App")
	targetOrgID := 88

	existing := &model.Application{
		OrgID:       targetOrgID,
		PackageName: "com.example.finance",
		Name:        "Old Finance",
		Description: "old",
		Schema:      model.JSONB{},
	}
	existing.GenerateUUID()
	existing.SetVersion(time.Now(), "old1")
	require.NoError(t, db.Create(existing).Error)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]interface{}{
		"targetOrgId": targetOrgID,
		"overwrite":   true,
	})
	c.Request = httptest.NewRequest("POST", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/distribute", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}}

	handler.Distribute(c)

	assert.Equal(t, http.StatusCreated, w.Code)
	var newApp model.Application
	json.Unmarshal(w.Body.Bytes(), &newApp)
	assert.Equal(t, targetOrgID, newApp.OrgID)
	assert.Equal(t, "com.example.finance", newApp.PackageName)

	var oldCount int64
	db.Model(&model.Application{}).Where("id = ?", existing.ID).Count(&oldCount)
	assert.Equal(t, int64(0), oldCount)

	var targetCount int64
	db.Model(&model.Application{}).Where("org_id = ? AND package_name = ?", targetOrgID, "com.example.finance").Count(&targetCount)
	assert.Equal(t, int64(1), targetCount)
}

func TestDistributeApp_NotFound(t *testing.T) {
	handler, _ := setupDeleteDistributeHandler(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]interface{}{
		"targetOrgId": 2,
		"overwrite":   false,
	})
	c.Request = httptest.NewRequest("POST", "/api/provider/applications/9999/distribute", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "id", Value: "9999"}}

	handler.Distribute(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Contains(t, resp["error"], "not found")
}

func TestDistributeApp_EmptyBody(t *testing.T) {
	handler, _ := setupDeleteDistributeHandler(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/provider/applications/1/distribute", bytes.NewReader([]byte("{}")))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "id", Value: "1"}}

	handler.Distribute(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

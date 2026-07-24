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

func setupFormViewTestDB(t *testing.T) *gorm.DB {
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

func setupFormViewHandler(t *testing.T) (*ApplicationHandler, *gorm.DB) {
	t.Helper()
	db := setupFormViewTestDB(t)
	appService := service.NewApplicationService(
		repository.NewApplicationRepository(db),
		repository.NewFormRepository(db),
		repository.NewViewRepository(db),
	)
	handler := NewApplicationHandler(appService)
	return handler, db
}

func seedApplication(t *testing.T, db *gorm.DB) *model.Application {
	t.Helper()
	app := &model.Application{
		OrgID:       1,
		PackageName: "test-app",
		Name:        "Test App",
		Description: "Test",
		Schema:      model.JSONB{},
	}
	app.GenerateUUID()
	app.SetVersion(time.Now(), "abcd")
	require.NoError(t, db.Create(app).Error)
	return app
}

func TestCreateForm_Success(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]interface{}{
		"name":        "Leave Form",
		"code":        "leave",
		"description": "Leave request form",
		"schema": map[string]interface{}{
			"fields": []interface{}{
				map[string]interface{}{"type": "text", "name": "reason"},
			},
		},
	})
	c.Request = httptest.NewRequest("POST", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/forms", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}}

	handler.CreateForm(c)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp model.Form
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Leave Form", resp.Name)
	assert.Equal(t, "leave", resp.Code)
	assert.Equal(t, app.ID, resp.ApplicationID)
	assert.NotZero(t, resp.ID)
}

func TestCreateForm_MissingName(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]string{
		"code": "leave",
	})
	c.Request = httptest.NewRequest("POST", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/forms", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}}

	handler.CreateForm(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateForm_MissingCode(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]string{
		"name": "Leave Form",
	})
	c.Request = httptest.NewRequest("POST", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/forms", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}}

	handler.CreateForm(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestListForms_Success(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)

	// Seed two forms
	for _, name := range []string{"Form A", "Form B"} {
		f := &model.Form{ApplicationID: app.ID, Name: name, Code: "code_" + name, Schema: model.JSONB{}}
		require.NoError(t, db.Create(f).Error)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/forms", nil)
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}}

	handler.ListForms(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []model.Form
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Len(t, resp, 2)
}

func TestListForms_Empty(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/forms", nil)
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}}

	handler.ListForms(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []model.Form
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Empty(t, resp)
}

func TestGetForm_Success(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)
	form := &model.Form{ApplicationID: app.ID, Name: "My Form", Code: "my_form", Schema: model.JSONB{"foo": "bar"}}
	require.NoError(t, db.Create(form).Error)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/forms/"+fmt.Sprint(form.ID), nil)
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}, {Key: "formId", Value: fmt.Sprint(form.ID)}}

	handler.GetForm(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp model.Form
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "My Form", resp.Name)
	assert.Equal(t, "my_form", resp.Code)
}

func TestGetForm_NotFound(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/forms/9999", nil)
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}, {Key: "formId", Value: "9999"}}

	handler.GetForm(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestDeleteForm_Success(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)
	form := &model.Form{ApplicationID: app.ID, Name: "To Delete", Code: "to_delete", Schema: model.JSONB{}}
	require.NoError(t, db.Create(form).Error)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("DELETE", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/forms/"+fmt.Sprint(form.ID), nil)
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}, {Key: "formId", Value: fmt.Sprint(form.ID)}}

	handler.DeleteForm(c)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verify deleted
	var count int64
	db.Model(&model.Form{}).Where("id = ?", form.ID).Count(&count)
	assert.Equal(t, int64(0), count)
}

func TestCreateView_Success(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]interface{}{
		"name":        "Table View",
		"code":        "table_view",
		"type":        "table",
		"description": "A table view",
		"config": map[string]interface{}{
			"columns": []interface{}{"name", "status"},
		},
	})
	c.Request = httptest.NewRequest("POST", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/views", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}}

	handler.CreateView(c)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp model.View
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Table View", resp.Name)
	assert.Equal(t, "table_view", resp.Code)
	assert.Equal(t, "table", resp.Type)
	assert.Equal(t, app.ID, resp.ApplicationID)
}

func TestCreateView_MissingType(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]string{
		"name": "Table View",
		"code": "table_view",
	})
	c.Request = httptest.NewRequest("POST", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/views", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}}

	handler.CreateView(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestListViews_Success(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)

	// Seed two views
	for _, name := range []string{"View A", "View B"} {
		v := &model.View{ApplicationID: app.ID, Name: name, Code: "code_" + name, Type: "table", Config: model.JSONB{}}
		require.NoError(t, db.Create(v).Error)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/views", nil)
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}}

	handler.ListViews(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []model.View
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Len(t, resp, 2)
}

func TestListViews_Empty(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/views", nil)
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}}

	handler.ListViews(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []model.View
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Empty(t, resp)
}

func TestUpdateForm_Success(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)
	form := &model.Form{ApplicationID: app.ID, Name: "Old Name", Code: "my_form", Description: "old desc", Schema: model.JSONB{}}
	require.NoError(t, db.Create(form).Error)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]interface{}{
		"name":        "New Name",
		"description": "new desc",
		"schema":      model.JSONB{"fields": []interface{}{}},
	})
	c.Request = httptest.NewRequest("PUT", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/forms/"+fmt.Sprint(form.ID), bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}, {Key: "formId", Value: fmt.Sprint(form.ID)}}

	handler.UpdateForm(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp model.Form
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "New Name", resp.Name)
	assert.Equal(t, "new desc", resp.Description)
}

func TestUpdateForm_NotFound(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]string{
		"name": "Does not matter",
	})
	c.Request = httptest.NewRequest("PUT", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/forms/9999", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}, {Key: "formId", Value: "9999"}}

	handler.UpdateForm(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeleteView_Success(t *testing.T) {
	handler, db := setupFormViewHandler(t)
	app := seedApplication(t, db)
	view := &model.View{ApplicationID: app.ID, Name: "To Delete", Code: "to_delete", Type: "table", Config: model.JSONB{}}
	require.NoError(t, db.Create(view).Error)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("DELETE", "/api/provider/applications/"+fmt.Sprint(app.ID)+"/views/"+fmt.Sprint(view.ID), nil)
	c.Params = []gin.Param{{Key: "id", Value: fmt.Sprint(app.ID)}, {Key: "viewId", Value: fmt.Sprint(view.ID)}}

	handler.DeleteView(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var count int64
	db.Model(&model.View{}).Where("id = ?", view.ID).Count(&count)
	assert.Equal(t, int64(0), count)
}

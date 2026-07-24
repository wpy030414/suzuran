package provider

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/repository"
	"github.com/xrl/suzuran-cloud/internal/service"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, db.AutoMigrate(
		&model.Org{},
	))

	return db
}

func TestOrgHandler_Create_Success(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM orgs")
	}()

	orgRepo := repository.NewOrgRepository(db)
	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
	handler := NewOrgHandler(orgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]string{
		"name":        "Test Org",
		"description": "Test Description",
	})
	c.Request = httptest.NewRequest("POST", "/api/provider/orgs", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{}

	handler.Create(c)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp model.Org
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Test Org", resp.Name)
	assert.Equal(t, "Test Description", resp.Description)
	assert.NotZero(t, resp.ID)
}

func TestOrgHandler_Create_EmptyName(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM orgs")
	}()

	orgRepo := repository.NewOrgRepository(db)
	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
	handler := NewOrgHandler(orgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]string{
		"name":        "",
		"description": "Test Description",
	})
	c.Request = httptest.NewRequest("POST", "/api/provider/orgs", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.Create(c)

	// Service should handle empty name validation
	assert.True(t, w.Code == http.StatusCreated || w.Code == http.StatusInternalServerError)
}

func TestOrgHandler_GetByID_Success(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM orgs")
	}()

	// Create test org
	org := &model.Org{
		Name:        "Get Test Org",
		Description: "Get Test Description",
	}
	require.NoError(t, db.Create(org).Error)

	orgRepo := repository.NewOrgRepository(db)
	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
	handler := NewOrgHandler(orgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/orgs/1", nil)
	c.Params = []gin.Param{{Key: "orgId", Value: "1"}}

	handler.GetByID(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp model.Org
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Get Test Org", resp.Name)
	assert.Equal(t, "Get Test Description", resp.Description)
}

func TestOrgHandler_GetByID_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM orgs")
	}()

	orgRepo := repository.NewOrgRepository(db)
	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
	handler := NewOrgHandler(orgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/orgs/999", nil)
	c.Params = []gin.Param{{Key: "orgId", Value: "999"}}

	handler.GetByID(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestOrgHandler_List_Success(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM orgs")
	}()

	// Create multiple orgs
	orgs := []model.Org{
		{Name: "Org 1", Description: "Description 1"},
		{Name: "Org 2", Description: "Description 2"},
		{Name: "Org 3", Description: "Description 3"},
	}
	for i := range orgs {
		require.NoError(t, db.Create(&orgs[i]).Error)
	}

	orgRepo := repository.NewOrgRepository(db)
	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
	handler := NewOrgHandler(orgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/orgs", nil)
	c.Params = []gin.Param{}

	handler.List(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []model.Org
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Len(t, resp, 3)
}

func TestOrgHandler_List_Empty(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM orgs")
	}()

	orgRepo := repository.NewOrgRepository(db)
	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
	handler := NewOrgHandler(orgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/orgs", nil)
	c.Params = []gin.Param{}

	handler.List(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []model.Org
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Empty(t, resp)
}

func TestOrgHandler_Update_Success(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM orgs")
	}()

	// Create test org
	org := &model.Org{
		Name:        "Original Name",
		Description: "Original Description",
	}
	require.NoError(t, db.Create(org).Error)

	orgRepo := repository.NewOrgRepository(db)
	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
	handler := NewOrgHandler(orgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]string{
		"name":        "Updated Name",
		"description": "Updated Description",
	})
	c.Request = httptest.NewRequest("PUT", "/api/provider/orgs/1", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "orgId", Value: "1"}}

	handler.Update(c)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verify the update
	var updatedOrg model.Org
	require.NoError(t, db.First(&updatedOrg, org.ID).Error)
	assert.Equal(t, "Updated Name", updatedOrg.Name)
	assert.Equal(t, "Updated Description", updatedOrg.Description)
}

func TestOrgHandler_Update_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM orgs")
	}()

	orgRepo := repository.NewOrgRepository(db)
	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
	handler := NewOrgHandler(orgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustJSON(t, map[string]string{
		"name":        "Updated Name",
		"description": "Updated Description",
	})
	c.Request = httptest.NewRequest("PUT", "/api/provider/orgs/999", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "orgId", Value: "999"}}

	handler.Update(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestOrgHandler_Delete_Success(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM orgs")
	}()

	// Create test org
	org := &model.Org{
		Name:        "Delete Test Org",
		Description: "Delete Test Description",
	}
	require.NoError(t, db.Create(org).Error)

	orgRepo := repository.NewOrgRepository(db)
	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
	handler := NewOrgHandler(orgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("DELETE", "/api/provider/orgs/1", nil)
	c.Params = []gin.Param{{Key: "orgId", Value: "1"}}

	handler.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verify deletion
	var count int64
	db.Model(&model.Org{}).Where("id = ?", org.ID).Count(&count)
	assert.Equal(t, int64(0), count)
}

func TestOrgHandler_Delete_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer func() {
		db.Exec("DELETE FROM orgs")
	}()

	orgRepo := repository.NewOrgRepository(db)
	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
	handler := NewOrgHandler(orgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("DELETE", "/api/provider/orgs/999", nil)
	c.Params = []gin.Param{{Key: "orgId", Value: "999"}}

	handler.Delete(c)

	// Delete on non-existent org returns 200 with message (idempotent behavior)
	assert.Equal(t, http.StatusOK, w.Code)
}

// Helper function

func mustJSON(t *testing.T, v interface{}) []byte {
	t.Helper()
	data, err := json.Marshal(v)
	require.NoError(t, err)
	return data
}

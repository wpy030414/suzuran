package tenant

import (
	"bytes"
	"fmt"
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

func setupTenantTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, db.AutoMigrate(
		&model.Department{},
		&model.Org{},
		&model.User{},
		&model.OrgUserBond{},
	))

	return db
}

// --- Department Handler Tests (updated for OrgMgmtHandler) ---

func TestDepartmentHandler_Create(t *testing.T) {
	db := setupTenantTestDB(t)
	org := &model.Org{Name: "Test Org"}
	require.NoError(t, db.Create(org).Error)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	userRepo := repository.NewUserRepository(db)
	deptService := service.NewDepartmentService(deptRepo, bondRepo)
	userSvc := service.NewUserService(userRepo, bondRepo)
	h := NewDepartmentHandler(deptService, userSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("org_id", org.ID)
	body := mustTenantJSON(t, map[string]interface{}{
		"name":        "Engineering",
		"level":       1,
		"description": "Engineering Department",
	})
	c.Request = httptest.NewRequest("POST", "/api/tenant/departments", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.CreateDept(c)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestDepartmentHandler_GetTree(t *testing.T) {
	db := setupTenantTestDB(t)
	org := &model.Org{Name: "Test Org"}
	require.NoError(t, db.Create(org).Error)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	userRepo := repository.NewUserRepository(db)
	deptService := service.NewDepartmentService(deptRepo, bondRepo)
	userSvc := service.NewUserService(userRepo, bondRepo)
	h := NewDepartmentHandler(deptService, userSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("org_id", org.ID)
	c.Request = httptest.NewRequest("GET", "/api/tenant/departments/tree", nil)

	h.DeptTree(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDepartmentHandler_List(t *testing.T) {
	db := setupTenantTestDB(t)
	org := &model.Org{Name: "Test Org"}
	require.NoError(t, db.Create(org).Error)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	userRepo := repository.NewUserRepository(db)
	deptService := service.NewDepartmentService(deptRepo, bondRepo)
	userSvc := service.NewUserService(userRepo, bondRepo)
	h := NewDepartmentHandler(deptService, userSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("org_id", org.ID)
	c.Request = httptest.NewRequest("GET", "/api/tenant/departments", nil)

	h.ListDepts(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDepartmentHandler_SetManager(t *testing.T) {
	db := setupTenantTestDB(t)
	org := &model.Org{Name: "Test Org"}
	require.NoError(t, db.Create(org).Error)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	userRepo := repository.NewUserRepository(db)
	deptService := service.NewDepartmentService(deptRepo, bondRepo)
	userSvc := service.NewUserService(userRepo, bondRepo)
	h := NewDepartmentHandler(deptService, userSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustTenantJSON(t, map[string]int{"managerUserId": 1})
	c.Request = httptest.NewRequest("POST", "/api/tenant/departments/1/manager", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "deptId", Value: "1"}}

	h.SetDeptManager(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDepartmentHandler_Update(t *testing.T) {
	db := setupTenantTestDB(t)
	org := &model.Org{Name: "Test Org"}
	require.NoError(t, db.Create(org).Error)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	userRepo := repository.NewUserRepository(db)
	deptService := service.NewDepartmentService(deptRepo, bondRepo)
	userSvc := service.NewUserService(userRepo, bondRepo)
	h := NewDepartmentHandler(deptService, userSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("org_id", org.ID)
	body := mustTenantJSON(t, map[string]interface{}{
		"name":        "Updated Dept",
		"description": "Updated Description",
		"level":       1,
	})
	c.Request = httptest.NewRequest("PUT", "/api/tenant/departments/1", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "deptId", Value: "1"}}

	h.UpdateDept(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDepartmentHandler_Delete(t *testing.T) {
	db := setupTenantTestDB(t)
	org := &model.Org{Name: "Test Org"}
	require.NoError(t, db.Create(org).Error)

	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	userRepo := repository.NewUserRepository(db)
	deptService := service.NewDepartmentService(deptRepo, bondRepo)
	userSvc := service.NewUserService(userRepo, bondRepo)
	h := NewDepartmentHandler(deptService, userSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("DELETE", "/api/tenant/departments/1", nil)
	c.Params = []gin.Param{{Key: "deptId", Value: "1"}}

	h.DeleteDept(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

// --- User Handler Tests (updated for OrgMgmtHandler) ---

func TestUserHandler_Create(t *testing.T) {
	db := setupTenantTestDB(t)
	org := &model.Org{Name: "Test Org"}
	require.NoError(t, db.Create(org).Error)

	userRepo := repository.NewUserRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	userSvc := service.NewUserService(userRepo, bondRepo)
	h := NewUserHandler(userSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("org_id", org.ID)
	body := mustTenantJSON(t, map[string]string{
		"name":     "Test User",
		"phone":    "13800138000",
		"password": "pass1234",
	})
	c.Request = httptest.NewRequest("POST", "/api/tenant/users", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.CreateMember(c)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestUserHandler_List(t *testing.T) {
	db := setupTenantTestDB(t)
	org := &model.Org{Name: "Test Org"}
	require.NoError(t, db.Create(org).Error)

	userRepo := repository.NewUserRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	userSvc := service.NewUserService(userRepo, bondRepo)
	h := NewUserHandler(userSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("org_id", org.ID)
	c.Request = httptest.NewRequest("GET", "/api/tenant/users", nil)

	h.ListMembers(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUserHandler_Update(t *testing.T) {
	db := setupTenantTestDB(t)
	org := &model.Org{Name: "Test Org"}
	require.NoError(t, db.Create(org).Error)

	userRepo := repository.NewUserRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	u := &model.User{Phone: "13800000001", Name: "Old", PasswordHash: "h", Salt: ""}
	require.NoError(t, db.Create(u).Error)
	bond := &model.OrgUserBond{OrgID: org.ID, UserID: u.ID}
	require.NoError(t, db.Create(bond).Error)

	userSvc := service.NewUserService(userRepo, bondRepo)
	h := NewUserHandler(userSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("org_id", org.ID)
	body := mustTenantJSON(t, map[string]string{
		"name": "Updated User",
	})
	c.Request = httptest.NewRequest("PUT", "/api/tenant/users/"+fmt.Sprint(u.ID), bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "userId", Value: fmt.Sprint(u.ID)}}

	h.UpdateMember(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUserHandler_Delete(t *testing.T) {
	db := setupTenantTestDB(t)
	org := &model.Org{Name: "Test Org"}
	require.NoError(t, db.Create(org).Error)

	userRepo := repository.NewUserRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	userSvc := service.NewUserService(userRepo, bondRepo)
	h := NewUserHandler(userSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("org_id", org.ID)
	c.Request = httptest.NewRequest("DELETE", "/api/tenant/users/1", nil)
	c.Params = []gin.Param{{Key: "userId", Value: "1"}}

	h.RemoveMember(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

// --- Form Handler Tests (unchanged) ---

func TestFormHandler_Submit(t *testing.T) {
	db := setupTenantTestDB(t)
	formDefRepo := repository.NewFormDefinitionRepository(db)
	formSubRepo := repository.NewFormSubmissionRepository(db)
	distRepo := repository.NewFormDistributionRepository(db)
	formService := service.NewFormService(formDefRepo, formSubRepo, distRepo)
	handler := NewFormHandler(formService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustTenantJSON(t, map[string]interface{}{
		"field1": "value1",
		"field2": 123,
	})
	c.Request = httptest.NewRequest("POST", "/api/tenant/forms/test-form/submit", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "code", Value: "test-form"}}

	handler.Submit(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestFormHandler_GetSubmissions(t *testing.T) {
	db := setupTenantTestDB(t)
	formDefRepo := repository.NewFormDefinitionRepository(db)
	formSubRepo := repository.NewFormSubmissionRepository(db)
	distRepo := repository.NewFormDistributionRepository(db)
	formService := service.NewFormService(formDefRepo, formSubRepo, distRepo)
	handler := NewFormHandler(formService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/tenant/forms/test-form/submissions", nil)
	c.Params = []gin.Param{{Key: "code", Value: "test-form"}}

	handler.GetSubmissions(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestFormHandler_List(t *testing.T) {
	db := setupTenantTestDB(t)
	formDefRepo := repository.NewFormDefinitionRepository(db)
	formSubRepo := repository.NewFormSubmissionRepository(db)
	distRepo := repository.NewFormDistributionRepository(db)
	formService := service.NewFormService(formDefRepo, formSubRepo, distRepo)
	handler := NewFormHandler(formService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/tenant/forms", nil)

	handler.List(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestFormHandler_Create(t *testing.T) {
	db := setupTenantTestDB(t)
	formDefRepo := repository.NewFormDefinitionRepository(db)
	formSubRepo := repository.NewFormSubmissionRepository(db)
	distRepo := repository.NewFormDistributionRepository(db)
	formService := service.NewFormService(formDefRepo, formSubRepo, distRepo)
	handler := NewFormHandler(formService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustTenantJSON(t, map[string]string{
		"name": "Test Form",
		"code": "test_form",
	})
	c.Request = httptest.NewRequest("POST", "/api/tenant/forms", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.Create(c)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestFormHandler_Publish(t *testing.T) {
	db := setupTenantTestDB(t)
	formDefRepo := repository.NewFormDefinitionRepository(db)
	formSubRepo := repository.NewFormSubmissionRepository(db)
	distRepo := repository.NewFormDistributionRepository(db)
	formService := service.NewFormService(formDefRepo, formSubRepo, distRepo)
	handler := NewFormHandler(formService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/tenant/forms/1/publish", nil)
	c.Params = []gin.Param{{Key: "id", Value: "1"}}

	handler.Publish(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestFormHandler_Delete(t *testing.T) {
	db := setupTenantTestDB(t)
	formDefRepo := repository.NewFormDefinitionRepository(db)
	formSubRepo := repository.NewFormSubmissionRepository(db)
	distRepo := repository.NewFormDistributionRepository(db)
	formService := service.NewFormService(formDefRepo, formSubRepo, distRepo)
	handler := NewFormHandler(formService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("DELETE", "/api/tenant/forms/1", nil)
	c.Params = []gin.Param{{Key: "id", Value: "1"}}

	handler.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestFormHandler_Update(t *testing.T) {
	db := setupTenantTestDB(t)
	formDefRepo := repository.NewFormDefinitionRepository(db)
	formSubRepo := repository.NewFormSubmissionRepository(db)
	distRepo := repository.NewFormDistributionRepository(db)
	formService := service.NewFormService(formDefRepo, formSubRepo, distRepo)
	handler := NewFormHandler(formService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustTenantJSON(t, map[string]string{
		"name": "Updated Form",
	})
	c.Request = httptest.NewRequest("PUT", "/api/tenant/forms/1", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "id", Value: "1"}}

	handler.Update(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

// Helper function

func mustTenantJSON(t *testing.T, v interface{}) []byte {
	t.Helper()
	data, err := json.Marshal(v)
	require.NoError(t, err)
	return data
}

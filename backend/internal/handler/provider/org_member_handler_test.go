package provider

import (
	"bytes"
	"encoding/json"
	"fmt"
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

func setupOrgMemberTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, db.AutoMigrate(
		&model.User{},
		&model.Org{},
		&model.OrgUserBond{},
		&model.Department{},
	))

	return db
}

func setupOrgMemberHandler(t *testing.T) (*OrgMemberHandler, *gorm.DB) {
	t.Helper()
	db := setupOrgMemberTestDB(t)
	deptRepo := repository.NewDepartmentRepository(db)
	bondRepo := repository.NewOrgUserBondRepository(db)
	userRepo := repository.NewUserRepository(db)
	deptService := service.NewDepartmentService(deptRepo, bondRepo)
	userSvc := service.NewUserService(userRepo, bondRepo)
	h := NewOrgMemberHandler(deptService, userSvc)
	return h, db
}

func TestProviderListMembers(t *testing.T) {
	h, db := setupOrgMemberHandler(t)
	org := &model.Org{Name: "P-Org"}
	require.NoError(t, db.Create(org).Error)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/orgs/"+fmt.Sprint(org.ID)+"/users", nil)
	c.Params = []gin.Param{{Key: "orgId", Value: fmt.Sprint(org.ID)}}
	c.Set("role", "provider")

	h.ListMembers(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var list []service.MemberView
	json.Unmarshal(w.Body.Bytes(), &list)
	assert.Len(t, list, 0)
}

func TestProviderCreateMember(t *testing.T) {
	h, db := setupOrgMemberHandler(t)
	org := &model.Org{Name: "P-Org"}
	require.NoError(t, db.Create(org).Error)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := mustOrgMemberJSON(t, map[string]interface{}{
		"phone":    "13800138000",
		"name":     "Dave",
		"password": "mypass",
	})
	c.Request = httptest.NewRequest("POST", "/api/provider/orgs/"+fmt.Sprint(org.ID)+"/users", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = []gin.Param{{Key: "orgId", Value: fmt.Sprint(org.ID)}}
	c.Set("role", "provider")

	h.CreateMember(c)

	assert.Equal(t, http.StatusCreated, w.Code)
	var m service.MemberView
	json.Unmarshal(w.Body.Bytes(), &m)
	assert.Equal(t, "Dave", m.Name)
}

func TestProviderRemoveMember(t *testing.T) {
	h, db := setupOrgMemberHandler(t)
	org := &model.Org{Name: "P-Org"}
	require.NoError(t, db.Create(org).Error)

	user := &model.User{Phone: "13800000099", Name: "Gone", PasswordHash: "h", Salt: ""}
	require.NoError(t, db.Create(user).Error)
	bond := &model.OrgUserBond{OrgID: org.ID, UserID: user.ID}
	require.NoError(t, db.Create(bond).Error)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("DELETE", "/api/provider/orgs/"+fmt.Sprint(org.ID)+"/users/"+fmt.Sprint(user.ID), nil)
	c.Params = []gin.Param{
		{Key: "orgId", Value: fmt.Sprint(org.ID)},
		{Key: "userId", Value: fmt.Sprint(user.ID)},
	}
	c.Set("role", "provider")

	h.RemoveMember(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestProviderDeptTree(t *testing.T) {
	h, db := setupOrgMemberHandler(t)
	org := &model.Org{Name: "P-Org"}
	require.NoError(t, db.Create(org).Error)

	root := &model.Department{OrgID: org.ID, Name: "Root", Level: 1}
	require.NoError(t, db.Create(root).Error)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/orgs/"+fmt.Sprint(org.ID)+"/departments/tree", nil)
	c.Params = []gin.Param{{Key: "orgId", Value: fmt.Sprint(org.ID)}}
	c.Set("role", "provider")

	h.DeptTree(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestProviderForbidden(t *testing.T) {
	h, _ := setupOrgMemberHandler(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/provider/orgs/1/users", nil)
	c.Params = []gin.Param{{Key: "orgId", Value: "1"}}
	c.Set("role", "user")

	h.ListMembers(c)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func mustOrgMemberJSON(t *testing.T, v interface{}) []byte {
	t.Helper()
	data, err := json.Marshal(v)
	require.NoError(t, err)
	return data
}

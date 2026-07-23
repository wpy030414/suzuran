package tenant

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/xrl/suzuran-cloud/internal/service"
)

type DepartmentHandler struct {
	deptService *service.DepartmentService
}

func NewDepartmentHandler(deptService *service.DepartmentService) *DepartmentHandler {
	return &DepartmentHandler{deptService: deptService}
}

func (h *DepartmentHandler) Create(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{"message": "department created"})
}

func (h *DepartmentHandler) GetTree(c *gin.Context) {
	c.JSON(http.StatusOK, []interface{}{})
}

func (h *DepartmentHandler) List(c *gin.Context) {
	c.JSON(http.StatusOK, []interface{}{})
}

func (h *DepartmentHandler) SetManager(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"message": "manager set for department", "id": id})
}

func (h *DepartmentHandler) Update(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"message": "department updated", "id": id})
}

func (h *DepartmentHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"message": "department deleted", "id": id})
}

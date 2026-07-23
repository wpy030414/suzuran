package tenant

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/xrl/suzuran-cloud/internal/service"
)

type FormHandler struct {
	formService *service.FormService
}

func NewFormHandler(formService *service.FormService) *FormHandler {
	return &FormHandler{formService: formService}
}

func (h *FormHandler) Submit(c *gin.Context) {
	code := c.Param("code")
	c.JSON(http.StatusOK, gin.H{"message": "form submitted", "code": code})
}

func (h *FormHandler) GetSubmissions(c *gin.Context) {
	code := c.Param("code")
	c.JSON(http.StatusOK, gin.H{"form_code": code, "submissions": []interface{}{}})
}

func (h *FormHandler) List(c *gin.Context) {
	c.JSON(http.StatusOK, []interface{}{})
}

func (h *FormHandler) Create(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{"message": "form created"})
}

func (h *FormHandler) Publish(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "form published"})
}

func (h *FormHandler) Delete(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "form deleted"})
}

func (h *FormHandler) Update(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "form updated"})
}

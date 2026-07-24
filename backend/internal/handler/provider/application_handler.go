package provider

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/xrl/suzuran-cloud/internal/model"
	"github.com/xrl/suzuran-cloud/internal/service"
)

// ApplicationHandler handles application management requests
type ApplicationHandler struct {
	appService *service.ApplicationService
}

// NewApplicationHandler creates a new application handler
func NewApplicationHandler(appService *service.ApplicationService) *ApplicationHandler {
	return &ApplicationHandler{appService: appService}
}

// Create creates a new application
func (h *ApplicationHandler) Create(c *gin.Context) {
	orgID, _ := c.Get("org_id")

	var req struct {
		Name        string `json:"name"`
		PackageName string `json:"packageName"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	app, err := h.appService.CreateApp(c.Request.Context(), orgID.(int), req.Name, req.PackageName, req.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, app)
}

// GetByID gets an application by ID
func (h *ApplicationHandler) GetByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	app, err := h.appService.AppRepo.GetByID(c.Request.Context(), id)
	if err != nil || app == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "application not found"})
		return
	}

	c.JSON(http.StatusOK, app)
}

// List lists all applications for an org
func (h *ApplicationHandler) List(c *gin.Context) {
	orgID, _ := c.Get("org_id")

	apps, err := h.appService.AppRepo.GetByOrgID(c.Request.Context(), orgID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, apps)
}

// Copy copies an application
func (h *ApplicationHandler) Copy(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var req struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		req.Name = ""
	}

	app, err := h.appService.CopyApp(c.Request.Context(), id, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, app)
}

// UpdateVersion creates a new version of an application
func (h *ApplicationHandler) UpdateVersion(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	app, err := h.appService.UpdateAppVersion(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, app)
}

// ListForms lists all forms for an application
func (h *ApplicationHandler) ListForms(c *gin.Context) {
	appID, _ := strconv.Atoi(c.Param("id"))

	forms, err := h.appService.ListForms(c.Request.Context(), appID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, forms)
}

// CreateForm creates a new form within an application
func (h *ApplicationHandler) CreateForm(c *gin.Context) {
	appID, _ := strconv.Atoi(c.Param("id"))

	var req struct {
		Name        string         `json:"name" binding:"required"`
		Code        string         `json:"code" binding:"required"`
		Description string         `json:"description"`
		Schema      model.JSONB    `json:"schema"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	form, err := h.appService.CreateForm(c.Request.Context(), appID, req.Name, req.Code, req.Description, req.Schema)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, form)
}

// GetForm gets a form by ID
func (h *ApplicationHandler) GetForm(c *gin.Context) {
	formID, _ := strconv.Atoi(c.Param("formId"))

	form, err := h.appService.GetForm(c.Request.Context(), formID)
	if err != nil || form == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "form not found"})
		return
	}

	c.JSON(http.StatusOK, form)
}

// UpdateForm updates a form's name, description and schema
func (h *ApplicationHandler) UpdateForm(c *gin.Context) {
	formID, _ := strconv.Atoi(c.Param("formId"))

	var req struct {
		Name        string      `json:"name" binding:"required"`
		Description string      `json:"description"`
		Schema      model.JSONB `json:"schema"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	form, err := h.appService.UpdateForm(c.Request.Context(), formID, req.Name, req.Description, req.Schema)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, form)
}

// DeleteForm deletes a form by ID
func (h *ApplicationHandler) DeleteForm(c *gin.Context) {
	formID, _ := strconv.Atoi(c.Param("formId"))

	if err := h.appService.DeleteForm(c.Request.Context(), formID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// ListViews lists all views for an application
func (h *ApplicationHandler) ListViews(c *gin.Context) {
	appID, _ := strconv.Atoi(c.Param("id"))

	views, err := h.appService.ListViews(c.Request.Context(), appID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, views)
}

// CreateView creates a new view within an application
func (h *ApplicationHandler) CreateView(c *gin.Context) {
	appID, _ := strconv.Atoi(c.Param("id"))

	var req struct {
		Name        string      `json:"name" binding:"required"`
		Code        string      `json:"code" binding:"required"`
		Type        string      `json:"type" binding:"required"`
		Description string      `json:"description"`
		Config      model.JSONB `json:"config"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	view, err := h.appService.CreateView(c.Request.Context(), appID, req.Name, req.Code, req.Type, req.Description, req.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, view)
}

// DeleteView deletes a view by ID
func (h *ApplicationHandler) DeleteView(c *gin.Context) {
	viewID, _ := strconv.Atoi(c.Param("viewId"))

	if err := h.appService.DeleteView(c.Request.Context(), viewID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// Delete deletes an application by ID
func (h *ApplicationHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	if err := h.appService.DeleteApp(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// Distribute distributes an application to a target organization
func (h *ApplicationHandler) Distribute(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var req struct {
		TargetOrgID int  `json:"targetOrgId"`
		Overwrite   bool `json:"overwrite"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	app, err := h.appService.DistributeApp(c.Request.Context(), id, req.TargetOrgID, req.Overwrite)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, app)
}

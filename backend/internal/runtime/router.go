package runtime

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/xrl/suzuran-cloud/internal/repository"
)

// AppRouter proxies incoming HTTP requests to the appropriate application container.
type AppRouter struct {
	appRepo *repository.ApplicationRepository
	manager *RuntimeManager
}

// NewAppRouter creates a new AppRouter.
func NewAppRouter(appRepo *repository.ApplicationRepository, manager *RuntimeManager) *AppRouter {
	return &AppRouter{appRepo: appRepo, manager: manager}
}

// HandleRequest proxies a request to the application container.
// Route pattern: /apps/:appId/*path
func (r *AppRouter) HandleRequest(c *gin.Context) {
	appID := c.Param("appId")
	if appID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing appId"})
		return
	}

	app, err := r.appRepo.GetByID(c.Request.Context(), appID)
	if err != nil || app == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "application not found"})
		return
	}

	if app.Status != "running" || app.ContainerID == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "application is not running"})
		return
	}

	// Get the container's IP address on the app network
	netName := fmt.Sprintf("app-%s-net", app.ID)
	containerIP, err := r.manager.GetContainerIP(c.Request.Context(), app.ContainerID, netName)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "failed to resolve container address"})
		return
	}

	// Build the target URL
	target := fmt.Sprintf("http://%s:%d", containerIP, app.Port)
	targetURL, err := url.Parse(target)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid target URL"})
		return
	}

	// Create a reverse proxy
	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	// Strip the /apps/:appId prefix from the path before forwarding
	originalPath := c.Request.URL.Path
	// Remove the /apps/{appId} prefix
	prefix := fmt.Sprintf("/apps/%s", appID)
	strippedPath := strings.TrimPrefix(originalPath, prefix)
	if strippedPath == "" {
		strippedPath = "/"
	}

	// Update the request
	c.Request.URL.Path = strippedPath
	c.Request.URL.RawPath = ""

	// Modify the request director to use the stripped path
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.URL.Path = strippedPath
		req.URL.RawPath = ""
		req.Host = targetURL.Host
	}

	proxy.ServeHTTP(c.Writer, c.Request)
}

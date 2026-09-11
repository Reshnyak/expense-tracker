// Package httpapi builds the Gin engine: middleware stack + route table.
package httpapi

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/reshnyakdg/expence-tracker/backend/internal/auth"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/handlers"
	"github.com/reshnyakdg/expence-tracker/backend/internal/httpapi/middleware"
	"github.com/reshnyakdg/expence-tracker/backend/internal/repository"
	"github.com/reshnyakdg/expence-tracker/backend/internal/service"
)

type Deps struct {
	DB        *pgxpool.Pool
	Issuer    *auth.TokenIssuer
	Google    *auth.GoogleAuthenticator
	State     *auth.StateCodec
	Log       *slog.Logger
	WebOrigin string
	DevAuth   bool
}

// NewRouter wires middleware and routes and returns the http.Handler.
func NewRouter(d Deps) http.Handler {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger(d.Log))
	r.Use(middleware.CORS(d.WebOrigin))

	svc := service.New(service.Deps{
		Store:   repository.New(d.DB),
		Issuer:  d.Issuer,
		Google:  d.Google,
		State:   d.State,
		DevAuth: d.DevAuth,
		Log:     d.Log,
	})
	h := handlers.New(svc, d.Log)

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	v1 := r.Group("/api/v1")

	authGroup := v1.Group("/auth")
	{
		authGroup.POST("/register", h.Register)
		authGroup.POST("/login", h.Login)
		authGroup.GET("/google/login", h.GoogleLogin)
		authGroup.GET("/google/callback", h.GoogleCallback)
		authGroup.POST("/refresh", h.Refresh)
		if d.DevAuth {
			authGroup.POST("/dev-login", h.DevLogin)
		}
	}

	authed := v1.Group("")
	authed.Use(middleware.AuthRequired(d.Issuer))
	{
		authed.POST("/auth/logout", h.Logout)

		authed.GET("/me", h.Me)
		authed.PATCH("/me", h.UpdateMe)

		authed.GET("/spaces", h.ListSpaces)
		authed.POST("/spaces", h.CreateSpace)
		authed.GET("/spaces/:spaceId", h.GetSpace)
		authed.GET("/spaces/:spaceId/members", h.ListMembers)
		authed.POST("/spaces/:spaceId/members", h.AddMember)

		authed.GET("/spaces/:spaceId/categories", h.ListCategories)
		authed.POST("/spaces/:spaceId/categories", h.CreateCategory)
		authed.PATCH("/spaces/:spaceId/categories/:categoryId", h.UpdateCategory)
		authed.DELETE("/spaces/:spaceId/categories/:categoryId", h.DeleteCategory)

		authed.GET("/spaces/:spaceId/expenses", h.ListExpenses)
		authed.POST("/spaces/:spaceId/expenses", h.CreateExpense)
		authed.GET("/spaces/:spaceId/expenses/:expenseId", h.GetExpense)
		authed.PATCH("/spaces/:spaceId/expenses/:expenseId", h.UpdateExpense)
		authed.DELETE("/spaces/:spaceId/expenses/:expenseId", h.DeleteExpense)

		authed.GET("/spaces/:spaceId/balances", h.SpaceBalances)
	}

	return r
}

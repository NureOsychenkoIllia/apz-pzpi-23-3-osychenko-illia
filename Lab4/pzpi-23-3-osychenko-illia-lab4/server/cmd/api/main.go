//go:generate swag init -g main.go -o ../../docs

// Package main BusOptima API Server
//
//	@title			BusOptima API
//	@version		1.0
//	@description	API для системи оптимізації автобусних перевезень BusOptima
//	@termsOfService	http://swagger.io/terms/
//
//	@contact.name	API Support
//	@contact.email	support@busoptima.ua
//
//	@license.name	MIT
//	@license.url	https://opensource.org/licenses/MIT
//
//	@host		localhost:8080
//	@BasePath	/api
//
//	@securityDefinitions.apikey	BearerAuth
//	@in							header
//	@name						Authorization
//	@description				Заголовок авторизації JWT з використанням схеми Bearer. Приклад: "Authorization: Bearer {token}"
package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/swagger"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"

	"busoptima/internal/config"

	_ "busoptima/docs"
	"busoptima/internal/handler"
	"busoptima/internal/middleware"
	"busoptima/internal/repository"
	"busoptima/internal/service"
)

func main() {
	cfg := config.Load()

	// Підключення до бази даних
	db, err := sqlx.Connect("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Налаштування пулу з'єднань
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	// Ініціалізація репозиторіїв
	repos := repository.NewRepositories(db)

	// Ініціалізація сервісів
	services := &service.Services{
		Auth:          service.NewAuthService(repos.User, repos.Device, cfg.JWTSecret),
		Route:         service.NewRouteService(repos.Route, repos.Audit),
		Bus:           service.NewBusService(repos.Bus, repos.Audit),
		Trip:          service.NewTripService(repos.Trip, repos.Event, repos.Analytics, repos.Audit),
		IoT:           service.NewIoTService(repos.Device, repos.Event, repos.Trip, repos.PriceRecommendation),
		Analytics:     service.NewAnalyticsService(repos.Analytics, repos.Trip),
		Forecast:      service.NewForecastService(repos.Analytics, repos.Route),
		Settings:      service.NewSettingsService(repos.Settings),
		Backup:        newBackupService("/app/backups", cfg.DatabaseURL, db),
		Audit:         service.NewAuditService(repos.Audit),
		DataMigration: service.NewDataMigrationService(db),
	}

	// Pricing service потребує Settings service
	services.Pricing = service.NewPricingService(services.Settings)

	// Створення Fiber додатку
	app := fiber.New(fiber.Config{
		ErrorHandler: handler.CustomErrorHandler,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))

	// Налаштування маршрутів
	setupRoutes(app, services, repos, cfg)

	// Запуск сервера з graceful shutdown
	port := cfg.Port
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on port %s", port)

	go func() {
		if err := app.Listen(":" + port); err != nil {
			log.Printf("Server stopped: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("Graceful shutdown initiated...")

	if err := app.ShutdownWithTimeout(5 * time.Second); err != nil {
		log.Printf("Force shutdown after timeout: %v", err)
	}
	log.Println("Server stopped")
}

// newBackupService — фабрика стратегії резервного копіювання (патерн Стратегія).
// BACKUP_STRATEGY=pgdump (типово) → pg_dump + AES-256-GCM шифрування.
// BACKUP_STRATEGY=json   → JSON-знімок таблиць конфігурації без pg_dump.
func newBackupService(backupDir, databaseURL string, db *sqlx.DB) service.BackupService {
	strategy := os.Getenv("BACKUP_STRATEGY")
	if strategy == "json" {
		log.Println("[backup] using JSON snapshot strategy")
		return service.NewJsonSnapshotBackupService(backupDir, db)
	}
	log.Println("[backup] using pg_dump strategy with AES-256-GCM encryption")
	return service.NewPgDumpBackupService(backupDir, databaseURL, os.Getenv("BACKUP_ENCRYPTION_KEY"))
}

var startTime = time.Now()

func setupRoutes(app *fiber.App, services *service.Services, repos *repository.Repositories, cfg *config.Config) {
	// Документація Swagger
	app.Get("/swagger/*", swagger.HandlerDefault) // за замовчуванням

	// Health check — реєструється до груп з JWT, тому публічний
	app.Get("/api/health", func(c *fiber.Ctx) error {
		instanceID := os.Getenv("HOSTNAME")
		if instanceID == "" {
			if hostname, err := os.Hostname(); err == nil {
				instanceID = hostname
			}
		}
		if instanceID == "" {
			instanceID = "unknown"
		}

		dbStatus := "ok"
		dbLatency := 0.0
		if repos != nil {
			t0 := time.Now()
			if err := repos.Ping(); err != nil {
				dbStatus = "error"
			} else {
				dbLatency = float64(time.Since(t0).Microseconds()) / 1000.0
			}
		}
		return c.JSON(fiber.Map{
			"status":      "ok",
			"version":     "1.0.0",
			"instance_id": instanceID,
			"uptime_sec":  int64(time.Since(startTime).Seconds()),
			"checks": fiber.Map{
				"database": fiber.Map{"status": dbStatus, "latency_ms": dbLatency},
			},
		})
	})

	api := app.Group("/api")

	// Публічні маршрути
	auth := api.Group("/auth")
	authHandler := handler.NewAuthHandler(services.Auth)
	auth.Post("/login", authHandler.Login)
	auth.Post("/device", authHandler.DeviceAuth)
	auth.Post("/refresh", authHandler.RefreshToken)

	// Захищені маршрути
	protected := api.Use(middleware.JWTAuth(cfg.JWTSecret))
	protected.Use(middleware.AuditLog(services.Audit, repos))

	// IoT маршрути
	iot := protected.Group("/iot")
	auditHelper := middleware.NewAuditHelper(services.Audit)
	iotHandler := handler.NewIoTHandler(services.IoT, auditHelper)
	iot.Post("/events", iotHandler.SyncEvents)
	iot.Post("/price", iotHandler.SendPriceRecommendation)
	iot.Get("/config/:tripId", iotHandler.GetTripConfig)

	// Маршрути
	routes := protected.Group("/routes")
	routeHandler := handler.NewRouteHandler(services.Route)
	routes.Get("/", middleware.RequirePermission("routes:read"), routeHandler.GetAll)
	routes.Get("/:id", middleware.RequirePermission("routes:read"), routeHandler.GetByID)
	routes.Post("/", middleware.RequirePermission("routes:write"), routeHandler.Create)
	routes.Put("/:id", middleware.RequirePermission("routes:write"), routeHandler.Update)
	routes.Delete("/:id", middleware.RequirePermission("routes:write"), routeHandler.Delete)

	// Автобуси
	buses := protected.Group("/buses")
	busHandler := handler.NewBusHandler(services.Bus)
	buses.Get("/", middleware.RequirePermission("buses:read"), busHandler.GetAll)
	buses.Get("/:id", middleware.RequirePermission("buses:read"), busHandler.GetByID)
	buses.Post("/", middleware.RequirePermission("buses:write"), busHandler.Create)
	buses.Put("/:id", middleware.RequirePermission("buses:write"), busHandler.Update)
	buses.Delete("/:id", middleware.RequirePermission("buses:write"), busHandler.Delete)

	// Рейси
	trips := protected.Group("/trips")
	tripHandler := handler.NewTripHandler(services.Trip)
	trips.Get("/", middleware.RequirePermission("routes:read"), tripHandler.GetAll)
	trips.Get("/:id", middleware.RequirePermission("routes:read"), tripHandler.GetByID)
	trips.Post("/", middleware.RequirePermission("trips:write"), tripHandler.Create)
	trips.Put("/:id", middleware.RequirePermission("trips:write"), tripHandler.Update)
	trips.Get("/:id/events", middleware.RequirePermission("routes:read"), tripHandler.GetEvents)

	// Аналітика
	analytics := protected.Group("/analytics")
	analyticsHandler := handler.NewAnalyticsHandler(services.Analytics, services.Forecast)
	analytics.Get("/dashboard", middleware.RequirePermission("analytics:read"), analyticsHandler.GetDashboard)
	analytics.Get("/forecast", middleware.RequirePermission("analytics:read"), analyticsHandler.GetForecast)
	analytics.Get("/forecasts", middleware.RequirePermission("analytics:read"), analyticsHandler.GetForecasts)
	analytics.Get("/profitability", middleware.RequirePermission("analytics:read"), analyticsHandler.GetProfitability)

	// Ціноутворення
	pricing := protected.Group("/pricing")
	pricingHandler := handler.NewPricingHandler(services.Pricing)
	pricing.Post("/calculate", middleware.RequirePermission("routes:read"), pricingHandler.CalculatePrice)

	// Аналітика рейсів
	trips.Get("/:id/analytics", middleware.RequirePermission("analytics:read"), analyticsHandler.GetTripAnalytics)
	trips.Post("/:id/analytics/calculate", middleware.RequirePermission("analytics:read"), analyticsHandler.CalculateTripAnalytics)

	// Адміністрування
	admin := protected.Group("/admin")
	adminHandler := handler.NewAdminHandler(services.Auth, services.Settings, services.Backup, services.Audit, services.DataMigration)
	admin.Get("/users", middleware.RequirePermission("users:read"), adminHandler.GetUsers)
	admin.Post("/users", middleware.RequirePermission("users:write"), adminHandler.CreateUser)
	admin.Put("/users/:id", middleware.RequirePermission("users:write"), adminHandler.UpdateUser)
	admin.Put("/users/:id/role", middleware.RequirePermission("users:write"), adminHandler.UpdateUserRole)
	admin.Get("/settings", middleware.RequirePermission("users:read"), adminHandler.GetSystemSettings)
	admin.Put("/settings", middleware.RequirePermission("users:write"), adminHandler.UpdateSystemSettings)
	admin.Get("/settings/export", middleware.RequirePermission("users:read"), adminHandler.ExportSystemSettings)
	admin.Post("/settings/import", middleware.RequirePermission("users:write"), adminHandler.ImportSystemSettings)
	admin.Get("/audit-logs", middleware.RequirePermission("audit:read"), adminHandler.GetAuditLogs)
	admin.Post("/backup", middleware.RequirePermission("system:backup"), adminHandler.CreateBackup)
	admin.Get("/backups", middleware.RequirePermission("system:backup"), adminHandler.ListBackups)
	admin.Post("/backups/:backup_id/restore", middleware.RequirePermission("system:backup"), adminHandler.RestoreBackup)
	admin.Get("/data/export", middleware.RequirePermission("system:backup"), adminHandler.ExportData)
	admin.Post("/data/import", middleware.RequirePermission("system:backup"), adminHandler.ImportData)
}

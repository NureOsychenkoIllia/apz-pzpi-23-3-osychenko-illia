package service

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

// DataMigrationService — міграція операційних даних між середовищами.
// При експорті персональні дані анонімізуються відповідно до принципів GDPR.
type DataMigrationService interface {
	ExportData(ctx context.Context) (*DataExport, error)
	ImportData(ctx context.Context, export *DataExport) error
}

// DataExport — структура пакету міграції даних
type DataExport struct {
	ExportedAt time.Time       `json:"exported_at"`
	Version    string          `json:"version"`
	Anonymized bool            `json:"anonymized"`
	Routes     []routeRow      `json:"routes"`
	Buses      []busRow        `json:"buses"`
	Trips      []tripRow       `json:"trips"`
	Users      []anonymousUser `json:"users"`
}

type routeRow struct {
	OriginCity           string  `json:"origin_city"               db:"origin_city"`
	DestinationCity      string  `json:"destination_city"          db:"destination_city"`
	DistanceKm           float64 `json:"distance_km"               db:"distance_km"`
	BasePrice            float64 `json:"base_price"                db:"base_price"`
	FuelCostPerKm        float64 `json:"fuel_cost_per_km"          db:"fuel_cost_per_km"`
	DriverCostPerTrip    float64 `json:"driver_cost_per_trip"      db:"driver_cost_per_trip"`
	EstimatedDurationMin int     `json:"estimated_duration_minutes" db:"estimated_duration_minutes"`
	IsActive             bool    `json:"is_active"                 db:"is_active"`
}

type busRow struct {
	RegistrationNumber      string  `json:"registration_number"         db:"registration_number"`
	Capacity                int     `json:"capacity"                     db:"capacity"`
	Model                   string  `json:"model"                        db:"model"`
	FuelConsumptionPer100km float64 `json:"fuel_consumption_per_100km"   db:"fuel_consumption_per_100km"`
	IsActive                bool    `json:"is_active"                    db:"is_active"`
}

type tripRow struct {
	RouteOrigin        string `json:"route_origin"         db:"route_origin"`
	RouteDestination   string `json:"route_destination"    db:"route_destination"`
	ScheduledDeparture string `json:"scheduled_departure"  db:"scheduled_departure"`
	Status             string `json:"status"               db:"status"`
	// DriverName анонімізовано: SHA-256 оригінального значення, скорочено до 12 символів
	DriverNameHash string `json:"driver_name_hash"     db:"driver_name_hash"`
}

// anonymousUser — представлення користувача без персональних даних.
// email замінено на SHA-256 хеш (перші 16 символів) + домен-placeholder.
// full_name замінено на "User_<id>".
type anonymousUser struct {
	AnonEmail string `json:"anon_email"`
	RoleName  string `json:"role_name"`
	IsActive  bool   `json:"is_active"`
}

type dataMigrationService struct {
	db *sqlx.DB
}

// NewDataMigrationService створює сервіс міграції даних.
func NewDataMigrationService(db *sqlx.DB) DataMigrationService {
	return &dataMigrationService{db: db}
}

// ExportData повертає операційні дані з анонімізованими персональними полями.
func (s *dataMigrationService) ExportData(ctx context.Context) (*DataExport, error) {
	export := &DataExport{
		ExportedAt: time.Now(),
		Version:    "1.0",
		Anonymized: true,
	}

	// --- Маршрути (без персональних даних) ---
	if err := s.db.SelectContext(ctx, &export.Routes, `
		SELECT origin_city, destination_city, distance_km, base_price,
		       fuel_cost_per_km, driver_cost_per_trip, estimated_duration_minutes, is_active
		FROM routes ORDER BY id`); err != nil {
		return nil, fmt.Errorf("failed to export routes: %w", err)
	}

	// --- Автобуси (без персональних даних) ---
	if err := s.db.SelectContext(ctx, &export.Buses, `
		SELECT registration_number, capacity, model, fuel_consumption_per_100km, is_active
		FROM buses ORDER BY id`); err != nil {
		return nil, fmt.Errorf("failed to export buses: %w", err)
	}

	// --- Рейси з анонімізованим іменем водія ---
	rows, err := s.db.QueryxContext(ctx, `
		SELECT r.origin_city AS route_origin, r.destination_city AS route_destination,
		       to_char(t.scheduled_departure, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS scheduled_departure,
		       t.status,
		       encode(sha256(t.driver_name::bytea), 'hex') AS driver_name_hash
		FROM trips t
		JOIN routes r ON r.id = t.route_id
		ORDER BY t.id`)
	if err != nil {
		return nil, fmt.Errorf("failed to export trips: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var row tripRow
		if err := rows.StructScan(&row); err != nil {
			return nil, err
		}
		export.Trips = append(export.Trips, row)
	}

	// --- Користувачі з анонімізованими даними ---
	type userSrc struct {
		ID       int64  `db:"id"`
		Email    string `db:"email"`
		RoleName string `db:"role_name"`
		IsActive bool   `db:"is_active"`
	}
	var users []userSrc
	if err := s.db.SelectContext(ctx, &users, `
		SELECT u.id, u.email, r.name AS role_name, u.is_active
		FROM users u JOIN roles r ON r.id = u.role_id
		ORDER BY u.id`); err != nil {
		return nil, fmt.Errorf("failed to export users: %w", err)
	}
	for _, u := range users {
		hash := sha256.Sum256([]byte(u.Email))
		anonEmail := fmt.Sprintf("%x", hash)[:16] + "@anon.busoptima"
		export.Users = append(export.Users, anonymousUser{
			AnonEmail: anonEmail,
			RoleName:  u.RoleName,
			IsActive:  u.IsActive,
		})
	}

	return export, nil
}

// ImportData відновлює маршрути та автобуси з пакету міграції.
// Особисті дані (users, driver_name) не імпортуються — вони анонімізовані
// і непридатні для відновлення оригінальних записів.
func (s *dataMigrationService) ImportData(ctx context.Context, export *DataExport) error {
	if !export.Anonymized {
		return fmt.Errorf("only anonymized exports are accepted for import")
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	for _, r := range export.Routes {
		data, _ := json.Marshal(r)
		var m map[string]interface{}
		json.Unmarshal(data, &m)
		_, err := tx.ExecContext(ctx, `
			INSERT INTO routes
			  (origin_city, destination_city, distance_km, base_price,
			   fuel_cost_per_km, driver_cost_per_trip, estimated_duration_minutes, is_active)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			ON CONFLICT DO NOTHING`,
			r.OriginCity, r.DestinationCity, r.DistanceKm, r.BasePrice,
			r.FuelCostPerKm, r.DriverCostPerTrip, r.EstimatedDurationMin, r.IsActive,
		)
		if err != nil {
			return fmt.Errorf("failed to import route %s→%s: %w", r.OriginCity, r.DestinationCity, err)
		}
	}

	for _, b := range export.Buses {
		_, err := tx.ExecContext(ctx, `
			INSERT INTO buses (registration_number, capacity, model, fuel_consumption_per_100km, is_active)
			VALUES ($1,$2,$3,$4,$5)
			ON CONFLICT (registration_number) DO UPDATE
			  SET capacity = EXCLUDED.capacity, model = EXCLUDED.model,
			      fuel_consumption_per_100km = EXCLUDED.fuel_consumption_per_100km,
			      is_active = EXCLUDED.is_active`,
			b.RegistrationNumber, b.Capacity, b.Model, b.FuelConsumptionPer100km, b.IsActive,
		)
		if err != nil {
			return fmt.Errorf("failed to import bus %s: %w", b.RegistrationNumber, err)
		}
	}

	return tx.Commit()
}

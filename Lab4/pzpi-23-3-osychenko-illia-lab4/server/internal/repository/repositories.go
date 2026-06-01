package repository

import "github.com/jmoiron/sqlx"

// Repositories містить всі репозиторії
type Repositories struct {
	db *sqlx.DB
	User                UserRepository
	Route               RouteRepository
	Bus                 BusRepository
	Device              DeviceRepository
	Trip                TripRepository
	Event               PassengerEventRepository
	Analytics           AnalyticsRepository
	Audit               AuditLogRepository
	PriceRecommendation PriceRecommendationRepository
	Settings            SettingsRepository
}

// Ping перевіряє з'єднання з базою даних
func (r *Repositories) Ping() error {
	return r.db.Ping()
}

// NewRepositories створює новий набір репозиторіїв
func NewRepositories(db *sqlx.DB) *Repositories {
	return &Repositories{
		db:                  db,
		User:                NewUserRepository(db),
		Route:               NewRouteRepository(db),
		Bus:                 NewBusRepository(db),
		Device:              NewDeviceRepository(db),
		Trip:                NewTripRepository(db),
		Event:               NewPassengerEventRepository(db),
		Analytics:           NewAnalyticsRepository(db),
		Audit:               NewAuditLogRepository(db),
		PriceRecommendation: NewPriceRecommendationRepository(db),
		Settings:            NewSettingsRepository(db),
	}
}

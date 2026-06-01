package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

// jsonSnapshotBackupService — альтернативна стратегія резервного копіювання
// через JSON-знімки таблиць конфігурації (без pg_dump).
// Застосовується у dev-середовищах або там, де pg_dump недоступний.
type jsonSnapshotBackupService struct {
	backupDir string
	db        *sqlx.DB
}

// NewJsonSnapshotBackupService створює стратегію JSON-знімків.
func NewJsonSnapshotBackupService(backupDir string, db *sqlx.DB) BackupService {
	os.MkdirAll(backupDir, 0755)
	return &jsonSnapshotBackupService{backupDir: backupDir, db: db}
}

type snapshotData struct {
	ExportedAt time.Time              `json:"exported_at"`
	Settings   map[string]interface{} `json:"system_settings"`
}

// CreateBackup зберігає JSON-знімок таблиці system_settings.
func (s *jsonSnapshotBackupService) CreateBackup(ctx context.Context) (*BackupInfo, error) {
	timestamp := time.Now().Format("20060102_150405")
	backupID := fmt.Sprintf("snapshot_%s", timestamp)
	filename := backupID + ".json"
	fpath := filepath.Join(s.backupDir, filename)

	var raw json.RawMessage
	if err := s.db.QueryRowContext(ctx,
		"SELECT row_to_json(t) FROM system_settings t LIMIT 1",
	).Scan(&raw); err != nil {
		return nil, fmt.Errorf("failed to export settings: %w", err)
	}

	var settings map[string]interface{}
	if err := json.Unmarshal(raw, &settings); err != nil {
		return nil, fmt.Errorf("failed to parse settings: %w", err)
	}

	snapshot := snapshotData{
		ExportedAt: time.Now(),
		Settings:   settings,
	}
	data, err := json.MarshalIndent(snapshot, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal snapshot: %w", err)
	}

	if err := os.WriteFile(fpath, data, 0600); err != nil {
		return nil, fmt.Errorf("failed to write snapshot: %w", err)
	}

	info, _ := os.Stat(fpath)
	return &BackupInfo{
		ID:        backupID,
		Filename:  filename,
		Size:      info.Size(),
		CreatedAt: time.Now(),
		Status:    "completed",
	}, nil
}

// ListBackups повертає список JSON-знімків.
func (s *jsonSnapshotBackupService) ListBackups(ctx context.Context) ([]BackupInfo, error) {
	entries, err := os.ReadDir(s.backupDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read backup directory: %w", err)
	}

	var backups []BackupInfo
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		id := strings.TrimSuffix(e.Name(), ".json")
		backups = append(backups, BackupInfo{
			ID:        id,
			Filename:  e.Name(),
			Size:      info.Size(),
			CreatedAt: info.ModTime(),
			Status:    "completed",
		})
	}
	return backups, nil
}

// RestoreBackup відновлює system_settings з JSON-знімку через UPSERT.
func (s *jsonSnapshotBackupService) RestoreBackup(ctx context.Context, backupID string) error {
	fpath := filepath.Join(s.backupDir, backupID+".json")
	if _, err := os.Stat(fpath); os.IsNotExist(err) {
		return fmt.Errorf("snapshot not found: %s", backupID)
	}

	data, err := os.ReadFile(fpath)
	if err != nil {
		return fmt.Errorf("failed to read snapshot: %w", err)
	}

	var snapshot snapshotData
	if err := json.Unmarshal(data, &snapshot); err != nil {
		return fmt.Errorf("failed to parse snapshot: %w", err)
	}

		st := snapshot.Settings
		_, err = s.db.ExecContext(ctx, `
			INSERT INTO system_settings (
				id, fuel_price_per_liter, peak_hours_coefficient, weekend_coefficient,
				high_demand_threshold, low_demand_threshold, price_min_coefficient,
				price_max_coefficient, seasonal_coefficients, updated_at, updated_by
			) VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,NOW(),NULL)
			ON CONFLICT (id) DO UPDATE SET
				fuel_price_per_liter    = EXCLUDED.fuel_price_per_liter,
				peak_hours_coefficient  = EXCLUDED.peak_hours_coefficient,
				weekend_coefficient     = EXCLUDED.weekend_coefficient,
			high_demand_threshold   = EXCLUDED.high_demand_threshold,
			low_demand_threshold    = EXCLUDED.low_demand_threshold,
			price_min_coefficient   = EXCLUDED.price_min_coefficient,
			price_max_coefficient   = EXCLUDED.price_max_coefficient,
			seasonal_coefficients   = EXCLUDED.seasonal_coefficients,
			updated_at              = EXCLUDED.updated_at,
			updated_by              = EXCLUDED.updated_by`,
		st["fuel_price_per_liter"],
		st["peak_hours_coefficient"],
		st["weekend_coefficient"],
		st["high_demand_threshold"],
		st["low_demand_threshold"],
		st["price_min_coefficient"],
		st["price_max_coefficient"],
		mustMarshal(st["seasonal_coefficients"]),
	)
	if err != nil {
		return fmt.Errorf("failed to restore settings: %w", err)
	}
	return nil
}

func mustMarshal(v interface{}) []byte {
	b, _ := json.Marshal(v)
	return b
}

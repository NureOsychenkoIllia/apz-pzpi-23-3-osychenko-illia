package service

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// BackupService інтерфейс стратегії резервного копіювання (патерн Стратегія)
type BackupService interface {
	CreateBackup(ctx context.Context) (*BackupInfo, error)
	ListBackups(ctx context.Context) ([]BackupInfo, error)
	RestoreBackup(ctx context.Context, backupID string) error
}

// BackupInfo метадані резервної копії
type BackupInfo struct {
	ID        string    `json:"backup_id"`
	Filename  string    `json:"filename"`
	Size      int64     `json:"size_bytes"`
	CreatedAt time.Time `json:"created_at"`
	Status    string    `json:"status"`
}

// pgDumpBackupService — стратегія повного резервного копіювання PostgreSQL
// з AES-256-GCM шифруванням SQL-дампу
type pgDumpBackupService struct {
	backupDir     string
	databaseURL   string
	encryptionKey []byte
}

// NewPgDumpBackupService створює стратегію резервного копіювання через pg_dump.
// encryptionKeyHex — 64-символьний hex-рядок (32 байти = AES-256).
// Якщо порожній — генерує ключ випадково і виводить у лог (тільки для dev).
func NewPgDumpBackupService(backupDir, databaseURL, encryptionKeyHex string) BackupService {
	os.MkdirAll(backupDir, 0755)

	var key []byte
	if encryptionKeyHex == "" {
		key = make([]byte, 32)
		rand.Read(key)
		fmt.Printf("[backup] WARNING: no BACKUP_ENCRYPTION_KEY set, using random key: %x\n", key)
	} else {
		var err error
		key, err = hex.DecodeString(encryptionKeyHex)
		if err != nil || len(key) != 32 {
			panic("BACKUP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)")
		}
	}

	return &pgDumpBackupService{
		backupDir:     backupDir,
		databaseURL:   databaseURL,
		encryptionKey: key,
	}
}

// CreateBackup створює зашифровану резервну копію через pg_dump.
// SQL-дамп шифрується AES-256-GCM; у директорії зберігається лише .sql.enc файл.
func (s *pgDumpBackupService) CreateBackup(ctx context.Context) (*BackupInfo, error) {
	timestamp := time.Now().Format("20060102_150405")
	backupID := fmt.Sprintf("backup_%s", timestamp)

	tmpFile := filepath.Join(s.backupDir, backupID+".tmp")
	encFile := filepath.Join(s.backupDir, backupID+".sql.enc")

	cmd := exec.CommandContext(ctx, "pg_dump", s.databaseURL, "-f", tmpFile)
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("pg_dump failed: %w", err)
	}
	defer os.Remove(tmpFile)

	plaintext, err := os.ReadFile(tmpFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read dump: %w", err)
	}

	ciphertext, err := aesEncrypt(s.encryptionKey, plaintext)
	if err != nil {
		return nil, fmt.Errorf("encryption failed: %w", err)
	}

	if err := os.WriteFile(encFile, ciphertext, 0600); err != nil {
		return nil, fmt.Errorf("failed to write encrypted backup: %w", err)
	}

	info, _ := os.Stat(encFile)
	return &BackupInfo{
		ID:        backupID,
		Filename:  backupID + ".sql.enc",
		Size:      info.Size(),
		CreatedAt: time.Now(),
		Status:    "completed",
	}, nil
}

// ListBackups повертає метадані зашифрованих резервних копій без вмісту.
func (s *pgDumpBackupService) ListBackups(ctx context.Context) ([]BackupInfo, error) {
	entries, err := os.ReadDir(s.backupDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read backup directory: %w", err)
	}

	var backups []BackupInfo
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql.enc") {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		id := strings.TrimSuffix(e.Name(), ".sql.enc")
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

// RestoreBackup розшифровує копію у тимчасовий файл і відновлює БД через psql.
func (s *pgDumpBackupService) RestoreBackup(ctx context.Context, backupID string) error {
	encFile := filepath.Join(s.backupDir, backupID+".sql.enc")
	if _, err := os.Stat(encFile); os.IsNotExist(err) {
		return fmt.Errorf("backup not found: %s", backupID)
	}

	ciphertext, err := os.ReadFile(encFile)
	if err != nil {
		return fmt.Errorf("failed to read backup: %w", err)
	}

	plaintext, err := aesDecrypt(s.encryptionKey, ciphertext)
	if err != nil {
		return fmt.Errorf("decryption failed: %w", err)
	}

	tmpFile := filepath.Join(s.backupDir, backupID+".restore.tmp")
	if err := os.WriteFile(tmpFile, plaintext, 0600); err != nil {
		return fmt.Errorf("failed to write temp restore file: %w", err)
	}
	defer os.Remove(tmpFile)

	cmd := exec.CommandContext(ctx, "psql", s.databaseURL, "-f", tmpFile)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("psql restore failed: %w", err)
	}
	return nil
}

// aesEncrypt шифрує дані алгоритмом AES-256-GCM.
// Повертає nonce || ciphertext.
func aesEncrypt(key, plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

// aesDecrypt розшифровує дані, зашифровані aesEncrypt.
func aesDecrypt(key, data []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return nil, fmt.Errorf("ciphertext too short")
	}
	return gcm.Open(nil, data[:nonceSize], data[nonceSize:], nil)
}

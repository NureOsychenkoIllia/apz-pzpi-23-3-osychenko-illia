#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

run_as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo &>/dev/null; then
    sudo "$@"
  else
    fail "Потрібні root-права для встановлення Docker, але sudo не знайдено."
  fi
}

detect_package_manager() {
  if command -v apt-get &>/dev/null; then
    echo "apt"
    return
  fi
  if command -v dnf &>/dev/null; then
    echo "dnf"
    return
  fi
  if command -v pacman &>/dev/null; then
    echo "pacman"
    return
  fi
  echo ""
}

ensure_docker_service() {
  if command -v systemctl &>/dev/null; then
    run_as_root systemctl enable --now docker >/dev/null 2>&1 || \
      warn "Не вдалося автоматично увімкнути docker.service. За потреби запустіть його вручну."
  fi
}

install_docker_with_apt() {
  warn "Docker не знайдено. Спроба встановлення через apt..."
  run_as_root apt-get update
  run_as_root apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

install_docker_with_dnf() {
  warn "Docker не знайдено. Спроба встановлення через dnf..."
  run_as_root dnf install -y docker docker-compose-plugin
}

install_docker_with_pacman() {
  warn "Docker не знайдено. Спроба встановлення через pacman..."
  run_as_root pacman -Sy --noconfirm docker docker-compose
}

install_docker_if_supported() {
  local pm
  pm=$(detect_package_manager)
  case "$pm" in
    apt)
      install_docker_with_apt
      ;;
    dnf)
      install_docker_with_dnf
      ;;
    pacman)
      install_docker_with_pacman
      ;;
    *)
      fail "Docker не знайдено, а пакетний менеджер не підтримується. Підтримуються: apt, dnf, pacman."
      ;;
  esac
  ensure_docker_service
}

echo "=== BusOptima — перевірка середовища та запуск ==="

# --- 1. Docker ---
if ! command -v docker &>/dev/null; then
  install_docker_if_supported
fi
if ! command -v docker &>/dev/null; then
  fail "Docker не знайдено після спроби встановлення. Встановіть Docker Engine >= 24 вручну: https://docs.docker.com/engine/install/"
fi
DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+' | head -1)
DOCKER_MAJOR=$(echo "$DOCKER_VERSION" | cut -d. -f1)
if [ "$DOCKER_MAJOR" -lt 24 ]; then
  fail "Docker версії $DOCKER_VERSION є застарілою. Потрібна >= 24."
fi
pass "Docker $DOCKER_VERSION"

# --- 2. Docker Compose ---
if ! docker compose version &>/dev/null; then
  local_pm=$(detect_package_manager)
  case "$local_pm" in
    apt)
      warn "Docker Compose plugin не знайдено. Спроба встановлення через apt..."
      run_as_root apt-get update
      run_as_root apt-get install -y docker-compose-v2
      ;;
    dnf)
      warn "Docker Compose plugin не знайдено. Спроба встановлення через dnf..."
      run_as_root dnf install -y docker-compose-plugin
      ;;
    pacman)
      warn "Docker Compose plugin не знайдено. Спроба встановлення через pacman..."
      run_as_root pacman -Sy --noconfirm docker-compose
      ;;
    *)
      fail "Docker Compose plugin не знайдено, а пакетний менеджер не підтримується."
      ;;
  esac
fi
if ! docker compose version &>/dev/null; then
  fail "Docker Compose plugin не знайдено після спроби встановлення."
fi
COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "2.x")
pass "Docker Compose $COMPOSE_VERSION"

# --- 3. Доступність портів ---
port_in_use() {
  local port=$1
  if command -v ss &>/dev/null; then
    ss -H -ltn "sport = :$port" 2>/dev/null | grep -q .
    return $?
  fi

  if command -v netstat &>/dev/null; then
    netstat -an 2>/dev/null | grep -Eq "[[:space:]][^[:space:]]*[:.]${port}[[:space:]].*LISTEN" && return 0
  fi

  return 1
}

check_port() {
  local port=$1 name=$2
  if port_in_use "$port"; then
    fail "Порт $port ($name) вже зайнятий. Зупиніть процес і повторіть спробу."
  fi
  pass "Порт $port ($name) вільний"
}
check_port 80   "Nginx"
check_port 5432 "PostgreSQL"

# --- 4. .env файл ---
if [ ! -f .env ]; then
  warn ".env не знайдено — створюю з типових значень"
  touch .env
  pass ".env створено"
else
  pass ".env існує"
fi

# --- 5. BACKUP_ENCRYPTION_KEY ---
if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  warn "BACKUP_ENCRYPTION_KEY не встановлено. Генерую 32-байтний ключ..."
  KEY=$(openssl rand -hex 32)
  export BACKUP_ENCRYPTION_KEY="$KEY"
  if grep -q '^BACKUP_ENCRYPTION_KEY=' .env 2>/dev/null; then
    sed -i "s/^BACKUP_ENCRYPTION_KEY=.*/BACKUP_ENCRYPTION_KEY=$KEY/" .env
  else
    echo "BACKUP_ENCRYPTION_KEY=$KEY" >> .env
  fi
  pass "Ключ шифрування збережено у .env"
else
  pass "BACKUP_ENCRYPTION_KEY встановлено"
fi

ensure_env_var() {
  local key=$1 value=$2
  if ! grep -q "^${key}=" .env 2>/dev/null; then
    echo "${key}=${value}" >> .env
  fi
}

ensure_env_var "POSTGRES_DB" "busoptima"
ensure_env_var "POSTGRES_USER" "busoptima_user"
ensure_env_var "POSTGRES_PASSWORD" "busoptima_pass"
ensure_env_var "JWT_SECRET" "change-me-in-production"
pass "Базові змінні .env перевірено"

# --- 7. Права на директорію backups ---
mkdir -p ./backups
chmod 755 ./backups
pass "Директорія ./backups готова"

# --- 8. Запуск ---
COMPOSE_FILE="${1:-docker-compose.scale.yml}"
echo ""
echo "Запускаємо конфігурацію: $COMPOSE_FILE"
docker compose -f "$COMPOSE_FILE" up --build -d

echo ""
echo "=== Готово ==="
echo "API доступний через Nginx: http://localhost/api/health"
echo "Swagger UI:                http://localhost/swagger/"
echo "Зупинити:  docker compose -f $COMPOSE_FILE down"

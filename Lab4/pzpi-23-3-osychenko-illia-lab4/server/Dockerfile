FROM golang:1.22-alpine AS builder

WORKDIR /app

# Копіюємо маніфести залежностей окремо, щоб Docker кешував шар go mod download
# незалежно від змін у вихідному коді
COPY go.mod go.sum ./
RUN go mod download

# Встановлюємо swag для генерації Swagger-документації
RUN go install github.com/swaggo/swag/cmd/swag@latest

COPY . .

# Генеруємо Swagger-документацію перед збиранням
RUN swag init -g cmd/api/main.go

# CGO_ENABLED=0 — статичне збирання без C-бібліотек (необхідно для Alpine runtime)
# -a -installsuffix cgo — примусове перезбирання всіх пакетів з новим суфіксом
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/api

# --- Фінальний образ ---
FROM postgres:17-alpine

# ca-certificates — для HTTPS-запитів всередині контейнера
# postgres:17-alpine already includes pg_dump/psql matching PostgreSQL 17
RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/main .

# Директорія для зберігання резервних копій
RUN mkdir -p /app/backups

EXPOSE 8080

CMD ["./main"]

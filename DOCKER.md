# Docker Deployment Guide

## Созданные файлы

- `docker-compose.yml` - Оркестрация всех сервисов
- `server/Dockerfile` - Backend контейнер
- `client/Dockerfile` - Frontend контейнер (multi-stage build)
- `client/nginx.conf` - Конфигурация Nginx с проксированием API
- `.dockerignore` файлы - Исключения для оптимизации образов

## Запуск проекта

### 1. Запустить все сервисы
```bash
docker-compose up -d
```

### 2. Проверить статус
```bash
docker-compose ps
```

### 3. Посмотреть логи
```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend
```

### 4. Остановить проект
```bash
docker-compose down
```

### 5. Пересобрать после изменений
```bash
docker-compose up -d --build
```

## Доступ к приложению

После запуска приложение будет доступно:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api

## Порты

- `5173` - Frontend (Nginx)
- `3001` - Backend (Node.js/Express)

## Архитектура

```
┌─────────────────────────────────────┐
│  Browser (http://localhost:5173)    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Frontend Container (Nginx)          │
│  - Serves static React build        │
│  - Proxies /api/* to backend        │
└────────────┬────────────────────────┘
             │ /api requests
             ▼
┌─────────────────────────────────────┐
│  Backend Container (Node.js)         │
│  - Express API server               │
│  - SQLite database                  │
│  - Code execution sandbox           │
└─────────────────────────────────────┘
```

## Особенности конфигурации

### Backend (server/Dockerfile)
- Базовый образ: `node:18-alpine` (легковесный)
- Production dependencies only
- Порт: 3001

### Frontend (client/Dockerfile)
- Multi-stage build для оптимизации размера
- Stage 1: Build с Node.js
- Stage 2: Serve с Nginx
- Gzip сжатие
- SPA routing support
- API proxy на backend

### Nginx конфигурация
- Поддержка client-side routing (React Router)
- Кэширование статических ресурсов (1 год)
- Проксирование `/api` на backend
- Gzip сжатие

### Docker Compose
- Сеть `vibecode-network` для изоляции
- Персистентность базы данных через volume
- Auto-restart контейнеров
- Depends_on для правильного порядка запуска

## Полезные команды

### Очистка
```bash
# Остановить и удалить контейнеры
docker-compose down

# Удалить volumes (БД будет удалена!)
docker-compose down -v

# Удалить образы
docker-compose down --rmi all
```

### Отладка
```bash
# Войти внутрь контейнера backend
docker-compose exec backend sh

# Войти внутрь контейнера frontend
docker-compose exec frontend sh

# Проверить использование ресурсов
docker stats
```

### Для разработки (горячая перезагрузка)

Раскомментируйте в `docker-compose.yml` для backend:
```yaml
volumes:
  - ./server:/app
  - /app/node_modules
```

И измените команду на:
```yaml
command: npm run dev
```

## Production рекомендации

1. **Переменные окружения**
   ```yaml
   environment:
     - NODE_ENV=production
     - DATABASE_URL=postgresql://...
     - JWT_SECRET=your-secret-key
   ```

2. **Безопасность**
   - Используйте secrets для чувствительных данных
   - Настройте HTTPS с Let's Encrypt
   - Ограничьте доступ к портам

3. **Масштабирование**
   ```bash
   docker-compose up -d --scale backend=3
   ```

4. **Мониторинг**
   - Добавьте healthcheck в Dockerfile
   - Используйте Prometheus + Grafana
   - Настройте логирование в ELK stack

5. **CI/CD**
   - GitHub Actions для автосборки
   - Docker Hub / AWS ECR для хранения образов
   - Kubernetes для оркестрации (при необходимости)

## Troubleshooting

### Порты заняты
```bash
# Проверить занятые порты
lsof -i :5173
lsof -i :3001

# Изменить порты в docker-compose.yml
ports:
  - "8080:80"  # вместо 5173:80
```

### База данных не сохраняется
Убедитесь, что volume смонтирован правильно:
```bash
docker-compose down -v  # удалит данные
docker-compose up -d    # пересоздаст с volume
```

### Nginx не может подключиться к backend
Проверьте, что оба сервиса в одной сети:
```bash
docker network inspect vibecode-jam_vibecode-network
```

## Обновление зависимостей

```bash
# Пересобрать без кэша
docker-compose build --no-cache

# Только один сервис
docker-compose build --no-cache backend
```

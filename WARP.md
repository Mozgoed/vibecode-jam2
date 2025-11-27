# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview
VibeCode Jam is a browser-based technical interview platform with real-time code execution, adaptive difficulty, and AI-powered code review. It consists of a React frontend (Vite) and Node.js backend (Express + SQLite).

## Commands

### Development
```bash
# Start backend server (port 3001)
cd server
node server.js

# Start frontend dev server (port 5173)
cd client
npm run dev
```

### Building & Linting
```bash
# Build frontend for production
cd client
npm run build

# Lint frontend
cd client
npm run lint

# Preview production build
cd client
npm run preview
```

### Docker
```bash
# Start all services
docker-compose up -d

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop containers
docker-compose down

# Rebuild after changes
docker-compose up -d --build

# Reset database (deletes all data)
docker-compose down -v
docker-compose up -d
```

### Database
```bash
# View database inside Docker container
docker exec -it vibecode-backend sh
ls -la /app/data/

# Backup database
docker cp vibecode-backend:/app/data/vibecode.db ./backup.db

# Restore database
docker cp ./backup.db vibecode-backend:/app/data/vibecode.db
docker-compose restart backend
```

## Architecture

### High-Level Flow
1. **Candidate Flow**: Welcome → Qualification Test (optional) → Workspace (task selection + coding) → Submit → Report
2. **Admin Flow**: Login → Admin Dashboard (view tasks, upload new tasks, export results)

### Frontend Architecture (client/)
- **React 19** with React Router for navigation
- **Monaco Editor** provides VS Code-like editing experience
- **AuthContext** manages user authentication state (localStorage-based)
- **useAntiCheat hook** tracks copy/paste, window blur, and tab visibility events
- **Pages**: Welcome, Qualification, Workspace, Report, Admin, Login
- **Routing**: Protected routes enforce admin role for `/admin` endpoint

### Backend Architecture (server/)
- **Express server** on port 3001
- **SQLite database** with 5 tables:
  - `tasks`: coding challenges with examples and hidden tests
  - `sessions`: candidate interview sessions
  - `submissions`: code submissions with metrics
  - `anti_cheat_logs`: tracks suspicious activity
  - `users`: authentication (SHA256 hashed passwords)
- **VM-based sandbox** (`sandbox.js`): executes user code in isolated context with timeout protection
- **AI Integration**: Uses OpenAI-compatible API (SciBox) for:
  - Code review (`/api/review`)
  - Task generation (`/api/tasks/generate`)
  - Dynamic task generation during sessions (if `ENABLE_AI_TASK_GEN=true`)

### Key Integration Points
- **Code Execution**: Frontend sends code to `/api/run` with `type: 'test'` (visible examples) or `type: 'submit'` (hidden tests)
- **Anti-Cheat**: Frontend logs events to `/api/anticheat` endpoint; backend stores in `anti_cheat_logs` table
- **Qualification**: Quiz questions live in `server/questions.js`; score determines candidate level (junior/middle/senior)
- **AI Code Review**: Workspace can request code review via `/api/review`; requires `OPENAI_API_KEY` env var

## Environment Configuration
Copy `.example.env` to `.env` and configure:

```bash
# Required for AI features (code review, task generation)
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://llm.t1v.scibox.tech/v1  # Default SciBox endpoint
OPENAI_MODEL=qwen3-coder-30b-a3b-instruct-fp8   # Default model
OPENAI_API_MAX_TOKENS=-1                         # -1 for unlimited, or set limit
ENABLE_AI_TASK_GEN=true                          # Auto-generate tasks when pool exhausted

# Optional
DB_PATH=/custom/path/to/database.db             # Override database location
```

**Fallback behavior**: If `OPENAI_API_KEY` is not set:
- `/api/review` returns placeholder message
- `/api/tasks/generate` returns error
- Dynamic task generation is disabled

**Legacy support**: Server also reads `SCIBOX_API_KEY`, `SCIBOX_API_URL`, `SCIBOX_MODEL` for backward compatibility, but `OPENAI_*` variables take precedence.

## Security Notes
- **Code Execution**: Uses Node.js `vm` module with 1000ms timeout and forbidden pattern detection for `eval()` and `Function()`. This is **NOT production-safe** against malicious code.
- **Authentication**: Simple SHA256 password hashing (not bcrypt). Default admin credentials: `admin/admin`.
- **Static Analysis**: Basic heuristic flags solutions with <15 non-whitespace characters as suspicious.

## Database Schema

### Relationships
- `sessions` ← `submissions` (one-to-many via `session_id`)
- `tasks` ← `submissions` (one-to-many via `task_id`)
- `sessions` ← `anti_cheat_logs` (one-to-many via `session_id`)
- `submissions` ← `anti_cheat_logs` (one-to-many via `submission_id`)

### Task Storage Format
- `examples`: JSON array of `{input: string, output: string}` (visible to candidates)
- `tests`: JSON array of `{code: string, expected: any}` (hidden; used for grading)

## Development Patterns

### Adding New API Endpoints
Backend routes follow RESTful conventions:
- `GET /api/resource` - list resources
- `GET /api/resource/:id` - get single resource
- `POST /api/resource` - create resource
- `PUT /api/resource/:id` - update resource
- `DELETE /api/resource/:id` - delete resource

All responses use JSON format. Error responses: `{ error: "message" }`.

### Frontend API Calls
Frontend uses axios for HTTP requests. Base URL is hardcoded to `http://localhost:3001/api` in development.

### Adding New React Components
Place reusable components in `client/src/components/`. Page-level components go in `client/src/pages/`. Update routing in `App.jsx` if adding new pages.

### Database Migrations
No migration system exists. Schema changes require:
1. Update `initDb()` in `server/db.js`
2. Delete existing database or use `ALTER TABLE` statements
3. Restart server to recreate tables

### Sandbox Limitations
The VM sandbox in `sandbox.js`:
- Blocks `eval()` and `Function()` constructor via regex
- Executes user code with 1000ms timeout
- Runs test cases with 500ms timeout each
- Does NOT prevent: network access, file system access, infinite loops, excessive memory usage

## Docker Architecture
- **Frontend container**: Multi-stage build (Node.js build → Nginx serve) with API proxying
- **Backend container**: Node.js 18-alpine with hot-reload support (disabled by default)
- **Network**: Custom bridge network `vibecode-network`
- **Volume**: `db-data` persists SQLite database across container restarts
- **Nginx**: Configured for SPA routing and `/api` proxy to backend

## Testing
⚠️ **No test suite exists**. The `server/package.json` test script is a placeholder.

To add tests:
1. Install testing framework (e.g., Jest, Mocha)
2. Create `__tests__` directories
3. Update `package.json` test scripts

## Default Credentials
- **Admin**: username `admin`, password `admin` (set during database seed)
- Change via `/api/change-password` endpoint or directly update `users` table

## Known Limitations
- Frontend hardcodes backend URL (no env var support)
- No HTTPS/SSL support in development
- No rate limiting on code execution
- No session timeout or JWT expiration
- SQLite not suitable for high concurrency
- AI features require external SciBox API (not self-hosted)

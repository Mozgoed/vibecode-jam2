# VibeCode Jam

**VibeCode Jam** is a browser-based technical interview platform designed to facilitate coding challenges with real-time feedback, adaptive difficulty, and comprehensive candidate assessment.

## Features

### For Candidates
- 🖥️ **Browser-Based IDE**: Monaco Editor with syntax highlighting and autocomplete
- ✅ **Real-time Testing**: Run code against visible examples
- 📊 **Adaptive Difficulty**: Qualification test determines candidate level (Junior/Middle/Senior)
- 📈 **Detailed Reports**: Comprehensive feedback with scores, strengths, and recommendations
- 🔒 **Secure Execution**: Code runs in isolated sandboxed environment

### For Recruiters
- 📝 **Task Management**: Upload and manage coding challenges
- 👥 **Results Dashboard**: View candidate performance and submissions
- 📁 **Data Export**: Export results to CSV for analysis
- 🎯 **Level-based Filtering**: Assign tasks based on candidate skill level

### Security & Anti-Cheat
- 🕵️ **Activity Tracking**: Monitor copy/paste, tab switching, and focus changes
- ⏱️ **Timing Metrics**: Track solution time and attempt count
- 🛡️ **Sandboxed Execution**: Node.js VM prevents dangerous code execution

## Tech Stack

### Frontend
- **React** (Vite) - Modern UI framework
- **Monaco Editor** - VS Code-like code editing experience
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Vanilla CSS** - Custom dark theme styling

### Backend
- **Node.js** + **Express** - API server
- **SQLite** - Lightweight database
- **VM Module** - Sandboxed code execution

## Installation

### Prerequisites
- Node.js 20+
- npm or yarn
- Docker & Docker Compose (optional, for containerized deployment)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd vibecode-jam
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

## Running the Application

### Start Server (Port 3001)
```bash
cd server
node server.js
```

### Start Client (Port 5173)
```bash
cd client
npm run dev
```

Navigate to `http://localhost:5173`

### Using Docker (Recommended for Production)

**Quick Start:**
```bash
docker-compose up -d
```

**See [DOCKER.md](DOCKER.md) for detailed Docker deployment guide.**

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`

**Useful Docker commands:**
```bash
# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

## Usage

### Candidate Flow
1. **Welcome Page**: View available challenges
2. **Qualification Test** (Optional): Take a quiz to determine your level
3. **Workspace**: Select a task and solve it in the IDE
4. **Submit**: Run tests and submit solution
5. **Report**: View detailed performance analysis

### Admin Flow
1. Navigate to `/admin`
2. **Tasks Tab**: View all existing tasks, export to CSV
3. **Upload Tab**: Create new tasks with:
   - Title, description, difficulty level
   - Examples (JSON)
   - Test cases (JSON)

## Project Structure

```
vibecode-jam/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components (routes)
│   │   ├── hooks/       # Custom React hooks
│   │   ├── App.jsx      # Main app with routing
│   │   └── index.css    # Global styles
│   └── package.json
│
├── server/              # Node.js backend
│   ├── server.js        # Express server & routes
│   ├── db.js            # SQLite database setup
│   ├── sandbox.js       # Code execution engine
│   ├── questions.js     # Qualification quiz questions
│   └── package.json
│
└── README.md            # This file
```

## API Endpoints

### Tasks
- `GET /api/tasks?level={level}` - Get tasks (optionally filtered by level)
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create new task (admin)

### Code Execution
- `POST /api/run` - Run code with test cases
  ```json
  {
    "code": "function sum(a,b) { return a+b; }",
    "taskId": 1,
    "type": "test" | "submit"
  }
  ```

### Qualification
- `GET /api/qualification/questions` - Get quiz questions
- `POST /api/qualification/submit` - Submit answers, get level

### Sessions & Results
- `POST /api/sessions` - Create interview session
- `POST /api/submissions` - Save code submission
- `GET /api/sessions/:id` - Get session results
- `POST /api/sessions/:id/complete` - Mark session complete

## Database Schema

### `tasks`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| title | TEXT | Task title |
| description | TEXT | Task description |
| level | TEXT | junior/middle/senior |
| examples | TEXT | JSON: visible test examples |
| tests | TEXT | JSON: hidden test cases |

### `sessions`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| candidate_name | TEXT | Candidate identifier |
| level | TEXT | Assigned level |
| start_time | INTEGER | Unix timestamp |
| end_time | INTEGER | Unix timestamp |
| score | INTEGER | Total score |

### `submissions`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| session_id | INTEGER | Foreign key to sessions |
| task_id | INTEGER | Foreign key to tasks |
| code | TEXT | Submitted code |
| status | TEXT | passed/failed/error |
| metrics | TEXT | JSON: timing, attempts, etc. |
| timestamp | INTEGER | Unix timestamp |

## Security Notes

⚠️ **Important**: The current MVP uses Node.js `vm` module for code execution, which provides basic isolation but is **NOT fully secure** against malicious code. For production use:

1. Implement Docker-based sandboxing
2. Add resource limits (CPU, memory, network)
3. Use separate execution environment
4. Implement rate limiting
5. Add user authentication

## Future Enhancements

- [ ] Docker-based code execution
- [ ] Multiple language support (Python, Java, C++)
- [ ] Real-time collaboration
- [ ] Video proctoring
- [ ] AI-powered code quality analysis
- [ ] Interactive debugger
- [ ] Code similarity detection
- [ ] Advanced analytics dashboard

## License

MIT

## Support

For issues or questions, please open a GitHub issue or contact the development team.

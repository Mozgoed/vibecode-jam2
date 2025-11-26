const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const { execute } = require('./sandbox');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Get all tasks (or filter by level)
app.get('/api/tasks', (req, res) => {
    const { level } = req.query;
    let query = "SELECT id, title, description, level, examples FROM tasks";
    const params = [];
    if (level) {
        query += " WHERE level = ?";
        params.push(level);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // Parse examples
        const tasks = rows.map(r => ({
            ...r,
            examples: JSON.parse(r.examples)
        }));
        res.json({ tasks });
    });
});

// Create new task (admin)
app.post('/api/tasks', (req, res) => {
    const { title, description, level, examples, tests } = req.body;

    db.run(
        "INSERT INTO tasks (title, description, level, examples, tests) VALUES (?, ?, ?, ?, ?)",
        [title, description, level, examples, tests],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ task_id: this.lastID });
        }
    );
});

// Get single task
app.get('/api/tasks/:id', (req, res) => {
    db.get("SELECT * FROM tasks WHERE id = ?", [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: "Task not found" });
            return;
        }
        row.examples = JSON.parse(row.examples);
        // Don't send hidden tests to client!
        delete row.tests;
        res.json({ task: row });
    });
});

// Run code (against visible examples or hidden tests)
app.post('/api/run', (req, res) => {
    const { code, taskId, type } = req.body; // type: 'test' (visible) or 'submit' (hidden)

    // Basic static analysis to detect suspiciously short solutions (possible copy‑paste or hack)
    // Remove whitespace and comments for a rough length check. If code is extremely short (e.g. < 15 characters)
    // mark it as suspicious. This is a heuristic for MVP anti‑cheat.
    const normalized = (code || '')
        .replace(/\/\*[^]*?\*\//g, '') // remove block comments
        .replace(/\/\/.*$/gm, '')       // remove line comments
        .replace(/\s+/g, '');            // remove whitespace
    const suspiciousShort = normalized.length < 15;

    db.get("SELECT examples, tests FROM tasks WHERE id = ?", [taskId], async (err, row) => {
        if (err || !row) {
            res.status(404).json({ error: "Task not found" });
            return;
        }

        let testCases = [];
        if (type === 'submit') {
            testCases = JSON.parse(row.tests);
        } else {
            // For 'test', we convert examples to test format if possible, 
            // OR we assume the client sends the test cases? 
            // For MVP, let's use the 'tests' column but maybe a subset?
            // Actually, the DB has `examples` which are just input/output strings for display.
            // And `tests` which are executable code.
            // Let's assume for MVP we just run against the hidden tests for 'submit'.
            // For 'run', maybe we just run the code and return stdout?
            // Or we can have a 'visible_tests' column.
            // Let's just run against hidden tests for now for simplicity, or maybe the first few.
            const allTests = JSON.parse(row.tests);
            testCases = type === 'submit' ? allTests : allTests.slice(0, 1); // Run only 1 test for quick check
        }

        const result = await execute(code, testCases);
        // Attach suspicion flag if detected. The client/UI or admin can later interpret this.
        result.suspiciousShortSolution = suspiciousShort;
        res.json(result);
    });
});

// Anti‑cheat logging endpoint. Clients can post events to this route to record suspicious behaviour.
// Expected payload: { session_id?, submission_id?, event_type, timestamp, details }
app.post('/api/anticheat', (req, res) => {
    const { session_id = null, submission_id = null, event_type, timestamp, details = '' } = req.body;
    if (!event_type || !timestamp) {
        res.status(400).json({ error: 'Missing event_type or timestamp' });
        return;
    }
    db.run(
        "INSERT INTO anti_cheat_logs (session_id, submission_id, event_type, timestamp, details) VALUES (?, ?, ?, ?, ?)",
        [session_id, submission_id, event_type, timestamp, JSON.stringify(details)],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ log_id: this.lastID });
        }
    );
});

// Qualification Routes
const questions = require('./questions');

app.get('/api/qualification/questions', (req, res) => {
    // Send questions without correct answers
    const publicQuestions = questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options
    }));
    res.json({ questions: publicQuestions });
});

app.post('/api/qualification/submit', (req, res) => {
    const { answers } = req.body; // { questionId: optionIndex }
    let score = 0;

    questions.forEach(q => {
        if (answers[q.id] === q.correct) {
            score++;
        }
    });

    const percentage = (score / questions.length) * 100;
    let level = 'junior';
    if (percentage >= 80) level = 'senior';
    else if (percentage >= 40) level = 'middle';

    res.json({ score, level });
});

// Session & Submission Routes
app.post('/api/sessions', (req, res) => {
    const { candidate_name, level } = req.body;
    const start_time = Date.now();

    db.run(
        "INSERT INTO sessions (candidate_name, level, start_time) VALUES (?, ?, ?)",
        [candidate_name, level, start_time],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ session_id: this.lastID });
        }
    );
});

app.post('/api/submissions', (req, res) => {
    const { session_id, task_id, code, status, metrics } = req.body;
    const timestamp = Date.now();

    db.run(
        "INSERT INTO submissions (session_id, task_id, code, status, metrics, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
        [session_id, task_id, code, status, JSON.stringify(metrics), timestamp],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ submission_id: this.lastID });
        }
    );
});

app.post('/api/sessions/:id/complete', (req, res) => {
    const { score } = req.body;
    const end_time = Date.now();

    db.run(
        "UPDATE sessions SET end_time = ?, score = ? WHERE id = ?",
        [end_time, score, req.params.id],
        (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );
});

app.get('/api/sessions/:id', (req, res) => {
    db.get("SELECT * FROM sessions WHERE id = ?", [req.params.id], (err, session) => {
        if (err || !session) {
            res.status(404).json({ error: "Session not found" });
            return;
        }

        db.all("SELECT * FROM submissions WHERE session_id = ?", [req.params.id], (err, submissions) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            // Parse metrics
            submissions = submissions.map(s => ({
                ...s,
                metrics: JSON.parse(s.metrics || '{}')
            }));

            res.json({ session, submissions });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

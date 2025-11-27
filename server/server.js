const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const { execute } = require('./sandbox');

const app = express();
const PORT = 3001;

// Import OpenAI client to call SciBox via an OpenAI‑compatible API.
const OpenAI = require('openai');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// SciBox / OpenAI configuration
//
// The backend integrates with the SciBox LLM service via an OpenAI-compatible API.
// To ease local testing with tools like `test-openai`, we support both the legacy
// `SCIBOX_*` environment variables and the newer `OPENAI_*` variables. The
// precedence (highest to lowest) when reading configuration is:
//   1. OPENAI_* variables (OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL,
//      OPENAI_API_MAX_TOKENS)
//   2. SCIBOX_* variables (SCIBOX_API_KEY, SCIBOX_API_URL, SCIBOX_MODEL)
//   3. Hard-coded defaults.

// Select the API key: prefer OPENAI_API_KEY, fallback to SCIBOX_API_KEY.
const openaiApiKey = process.env.OPENAI_API_KEY || process.env.SCIBOX_API_KEY;

// Determine the base URL. OPENAI_BASE_URL overrides SCIBOX_API_URL. If neither
// is set, fall back to SciBox’s public base (without the `/chat/completions` suffix).
// Note: test‑openai by DarkGenius uses the “t1v” host for the SciBox gateway. Use that
// as the safest default. You can override it via OPENAI_BASE_URL or SCIBOX_API_URL.
const openaiBaseUrl = process.env.OPENAI_BASE_URL || process.env.SCIBOX_API_URL || 'https://llm.t1v.scibox.tech/v1';

// Choose the model. OPENAI_MODEL overrides SCIBOX_MODEL. Default to a code-competent model.
const openaiModel = process.env.OPENAI_MODEL || process.env.SCIBOX_MODEL || 'qwen3-coder-30b-a3b-instruct-fp8';

// Parse maximum tokens. The test harness uses OPENAI_API_MAX_TOKENS and accepts "-1" for unlimited.
const openaiMaxTokensEnv = process.env.OPENAI_API_MAX_TOKENS;
let openaiMaxTokens;
if (openaiMaxTokensEnv && openaiMaxTokensEnv !== '-1') {
    const parsed = parseInt(openaiMaxTokensEnv, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
        openaiMaxTokens = parsed;
    }
}
if (!openaiMaxTokens) {
    openaiMaxTokens = 800;
}

// Instantiate the SciBox client. We use the OpenAI SDK configured with our key and base URL.
const sciBoxClient = new OpenAI({
    apiKey: openaiApiKey,
    baseURL: openaiBaseUrl,
});

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

// AI code review endpoint using SciBox (or similar) API
// Expects { code: string } in the body. It will forward the code to a remote AI
// code review service defined by environment variables SCIBOX_API_URL and SCIBOX_API_KEY.
// If these variables are not set, a placeholder review message is returned.
app.post('/api/review', async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'code is required' });
    }

    // If the API key is missing – return a stub review so the UI always receives a response.
    if (!openaiApiKey) {
        return res.json({
            review:
                'AI review service is not configured.\n\n' +
                'Please set OPENAI_API_KEY (and optionally OPENAI_BASE_URL and OPENAI_MODEL) on the server ' +
                'to enable live code reviews.\n' +
                'Your code appears syntactically valid, but automatic analysis of edge cases, performance and style could not be performed.'
        });
    }

    try {
        const completion = await sciBoxClient.chat.completions.create({
            model: openaiModel,
            messages: [
                {
                    role: 'system',
                    content:
                        'Ты – опытный инженер-ревьюер. Проанализируй решение кандидата на JavaScript: ' +
                        'корректность, крайние случаи, сложность и читаемость. ' +
                        'Дай структурированный отзыв: что хорошо, какие есть проблемы и как улучшить.'
                },
                {
                    role: 'user',
                    content: `Вот решение кандидата:\n\n${code}\n\nСделай подробный ревью на русском языке.`
                }
            ],
            temperature: 0.2,
            top_p: 0.9,
            // If openaiMaxTokens is defined, use it. Otherwise let the API decide.
            max_tokens: openaiMaxTokens
        });
        const choice = completion.choices && completion.choices[0];
        const reviewText = choice && choice.message && choice.message.content
            ? choice.message.content.trim()
            : 'AI did not return a review. Please try again.';
        return res.json({ review: reviewText });
    } catch (err) {
        console.error('SciBox review error', err);
        return res.json({
            review:
                'AI review could not be generated because the SciBox service returned an error. ' +
                'This does not affect your ability to solve the task; tests above are the source of truth.'
        });
    }
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

// ------------ User authentication routes ------------

// Simple password hashing helper using Node's crypto module.
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Register a new user. Expected payload: { username, password, role }
// Role defaults to 'candidate'. The password is stored as a SHA256 hash.
app.post('/api/register', (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required' });
    }
    const hashed = hashPassword(password);
    const userRole = role || 'candidate';
    const createdAt = Date.now();
    db.run(
        "INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)",
        [username, hashed, userRole, createdAt],
        function (err) {
            if (err) {
                if (err.message && err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'User already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ user_id: this.lastID, username, role: userRole });
        }
    );
});

// Login route. Expects { username, password }. Returns basic user info on success.
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required' });
    }
    const hashed = hashPassword(password);
    db.get(
        "SELECT id, username, role FROM users WHERE username = ? AND password = ?",
        [username, hashed],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            res.json({ user_id: user.id, username: user.username, role: user.role });
        }
    );
});

// Change password route. Expects { username, oldPassword, newPassword }
app.post('/api/change-password', (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    const oldHashed = hashPassword(oldPassword);
    const newHashed = hashPassword(newPassword);

    db.get("SELECT id FROM users WHERE username = ? AND password = ?", [username, oldHashed], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        db.run("UPDATE users SET password = ? WHERE id = ?", [newHashed, user.id], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
    });
});

// ------------ Task management routes ------------

// Update an existing task (admin). Payload should include title, description, level, examples, tests.
app.put('/api/tasks/:id', (req, res) => {
    const { title, description, level, examples, tests } = req.body;
    if (!title || !description || !level || !examples || !tests) {
        return res.status(400).json({ error: 'All task fields are required' });
    }
    db.run(
        "UPDATE tasks SET title = ?, description = ?, level = ?, examples = ?, tests = ? WHERE id = ?",
        [title, description, level, examples, tests, req.params.id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Task not found' });
            }
            res.json({ success: true });
        }
    );
});

// Delete an existing task (admin). This can help maintain the database if needed.
app.delete('/api/tasks/:id', (req, res) => {
    db.run(
        "DELETE FROM tasks WHERE id = ?",
        [req.params.id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Task not found' });
            }
            res.json({ success: true });
        }
    );
});

// Generate a new task via AI. Expects { level }. The AI should return a JSON object with
// fields: title, description, examples (array of objects with input and output), tests (array of objects with code and expected).
// The generated task is inserted into the tasks table and returned to the caller.
app.post('/api/tasks/generate', async (req, res) => {
    const { level } = req.body;
    const difficulty = level || 'junior';
    if (!openaiApiKey) {
        return res.status(400).json({ error: 'AI service is not configured on the server.' });
    }
    try {
        const completion = await sciBoxClient.chat.completions.create({
            model: openaiModel,
            messages: [
                {
                    role: 'system',
                    content:
                        'Ты — генератор заданий по программированию. ' +
                        'Создай новую задачу для технического собеседования по JavaScript. ' +
                        'Выходные данные должны быть в формате JSON со следующими ключами: ' +
                        '"title" (строка), "description" (строка, подробно описывающая задачу), ' +
                        '"examples" (массив объектов с полями "input" и "output"), ' +
                        '"tests" (массив объектов с полями "code" и "expected"; code — выражение на JavaScript, expected — ожидаемый результат). ' +
                        'Уровень сложности задачи: ' + difficulty + '. ' +
                        'Используй одинарные кавычки внутри JSON для строк. ' +
                        'Не добавляй пояснения вне JSON.'
                }
            ],
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: openaiMaxTokens
        });
        const aiContent =
            (completion.choices &&
                completion.choices[0] &&
                completion.choices[0].message &&
                completion.choices[0].message.content) ||
            '';
        // Attempt to parse JSON from the AI's response. Strip code fences if present.
        const jsonMatch = aiContent.match(/```\\?json\\?\\n([\\s\\S]+?)\\n```/) || aiContent.match(/({[\\s\\S]*})/);
        let taskDataStr = null;
        if (jsonMatch) {
            taskDataStr = jsonMatch[1] || jsonMatch[0];
        } else {
            taskDataStr = aiContent.trim();
        }
        let taskData;
        try {
            // Attempt to parse the JSON as-is. Some models return valid JSON enclosed in backticks.
            taskData = JSON.parse(taskDataStr.trim());
        } catch (parseErr1) {
            try {
                // Fallback: replace single quotes with double quotes and try again.
                const fallback = taskDataStr.trim().replace(/'/g, '"');
                taskData = JSON.parse(fallback);
            } catch (parseErr2) {
                console.error('Failed to parse AI-generated task JSON:', parseErr2, aiContent);
                return res.status(500).json({ error: 'Failed to parse AI-generated task JSON.' });
            }
        }
        // Validate essential fields.
        if (!taskData.title || !taskData.description || !taskData.examples || !taskData.tests) {
            return res.status(500).json({ error: 'AI-generated task missing required fields.' });
        }
        // Serialize examples and tests to JSON strings for storage.
        const examplesStr = JSON.stringify(taskData.examples);
        const testsStr = JSON.stringify(taskData.tests);
        // Insert into tasks table.
        db.run(
            "INSERT INTO tasks (title, description, level, examples, tests) VALUES (?, ?, ?, ?, ?)",
            [taskData.title, taskData.description, difficulty, examplesStr, testsStr],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({
                    task_id: this.lastID,
                    task: {
                        id: this.lastID,
                        title: taskData.title,
                        description: taskData.description,
                        level: difficulty,
                        examples: taskData.examples
                    }
                });
            }
        );
    } catch (err) {
        console.error('AI task generation error', err);
        return res.status(500).json({ error: 'Failed to generate task via AI.' });
    }
});

// ------------ Session helper routes ------------

// Get the next unsolved task for a session. If no tasks remain and AI generation is enabled,
// the server may generate a new one via AI.
app.get('/api/sessions/:id/next', (req, res) => {
    const sessionId = req.params.id;
    db.get("SELECT * FROM sessions WHERE id = ?", [sessionId], (err, session) => {
        if (err || !session) {
            return res.status(404).json({ error: "Session not found" });
        }
        const level = session.level || 'junior';
        // Fetch all tasks of this level.
        db.all("SELECT id, title, description, level, examples FROM tasks WHERE level = ?", [level], (err2, tasks) => {
            if (err2) {
                return res.status(500).json({ error: err2.message });
            }
            // Fetch completed tasks for this session.
            db.all("SELECT task_id FROM submissions WHERE session_id = ?", [sessionId], (err3, solved) => {
                if (err3) {
                    return res.status(500).json({ error: err3.message });
                }
                const solvedIds = new Set(solved.map(s => s.task_id));
                // Find the first task not yet solved.
                const nextTask = tasks.find(t => !solvedIds.has(t.id));
                if (nextTask) {
                    nextTask.examples = JSON.parse(nextTask.examples);
                    return res.json({ task: nextTask });
                }
                // No tasks left. If AI generation is enabled, attempt to generate a new one.
                if (process.env.ENABLE_AI_TASK_GEN === 'true' && openaiApiKey) {
                    (async () => {
                        try {
                            const completion = await sciBoxClient.chat.completions.create({
                                model: openaiModel,
                                messages: [
                                    {
                                        role: 'system',
                                        content:
                                            'Ты — генератор заданий по программированию. ' +
                                            'Создай новую задачу для технического собеседования по JavaScript. ' +
                                            'Выходные данные должны быть в формате JSON со следующими ключами: ' +
                                            '"title", "description", "examples", "tests". ' +
                                            'Уровень сложности задачи: ' + level + '. ' +
                                            'Используй одинарные кавычки внутри JSON для строк. ' +
                                            'Не добавляй пояснения вне JSON.'
                                    }
                                ],
                                temperature: 0.7,
                                top_p: 0.9,
                                max_tokens: openaiMaxTokens
                            });
                            const aiContent2 =
                                (completion.choices &&
                                    completion.choices[0] &&
                                    completion.choices[0].message &&
                                    completion.choices[0].message.content) ||
                                '';
                            const match =
                                aiContent2.match(/```\\?json\\?\\n([\\s\\S]+?)\\n```/) || aiContent2.match(/({[\\s\\S]*})/);
                            let jsonStr = null;
                            if (match) {
                                jsonStr = match[1] || match[0];
                            } else {
                                jsonStr = aiContent2.trim();
                            }
                            let taskData2;
                            try {
                                // Try to parse the JSON directly
                                taskData2 = JSON.parse(jsonStr.trim());
                            } catch (e1) {
                                try {
                                    // Fallback: replace single quotes with double quotes
                                    const fallback2 = jsonStr.trim().replace(/'/g, '"');
                                    taskData2 = JSON.parse(fallback2);
                                } catch (e2) {
                                    console.error('Failed to parse AI-generated task JSON during session', e2);
                                    return res.json({ task: null });
                                }
                            }
                            if (taskData2 && taskData2.title && taskData2.description && taskData2.examples && taskData2.tests) {
                                const exStr = JSON.stringify(taskData2.examples);
                                const testStr = JSON.stringify(taskData2.tests);
                                db.run(
                                    "INSERT INTO tasks (title, description, level, examples, tests) VALUES (?, ?, ?, ?, ?)",
                                    [taskData2.title, taskData2.description, level, exStr, testStr],
                                    function (insertErr) {
                                        if (insertErr) {
                                            return res.status(500).json({ error: insertErr.message });
                                        }
                                        const newTask = {
                                            id: this.lastID,
                                            title: taskData2.title,
                                            description: taskData2.description,
                                            level,
                                            examples: taskData2.examples
                                        };
                                        return res.json({ task: newTask });
                                    }
                                );
                            } else {
                                return res.json({ task: null });
                            }
                        } catch (genErr) {
                            console.error('AI generation during session failed', genErr);
                            return res.json({ task: null });
                        }
                    })();
                } else {
                    // No tasks left and AI generation disabled; indicate completion
                    return res.json({ task: null });
                }
            });
        });
    });
});

// ------------ Admin routes for candidates and sessions ------------

// List all candidates (admin).
app.get('/api/admin/candidates', (req, res) => {
    db.all("SELECT id, username, role, created_at FROM users", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ candidates: rows });
    });
});

// Get all sessions for a specific candidate (admin).
app.get('/api/admin/candidates/:id/sessions', (req, res) => {
    const userId = req.params.id;
    db.get("SELECT username FROM users WHERE id = ?", [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        db.all(
            "SELECT * FROM sessions WHERE candidate_name = ?",
            [user.username],
            (err2, sessions) => {
                if (err2) {
                    return res.status(500).json({ error: err2.message });
                }
                res.json({ sessions });
            }
        );
    });
});

// Get details of a specific session for a candidate, including submissions and anti‑cheat logs.
app.get('/api/admin/candidates/:id/sessions/:sessionId', (req, res) => {
    const userId = req.params.id;
    const sessionId = req.params.sessionId;
    db.get("SELECT username FROM users WHERE id = ?", [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        db.get("SELECT * FROM sessions WHERE id = ?", [sessionId], (err2, session) => {
            if (err2) {
                return res.status(500).json({ error: err2.message });
            }
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
            // Optional: ensure session belongs to candidate_name
            if (session.candidate_name !== user.username) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            db.all("SELECT * FROM submissions WHERE session_id = ?", [sessionId], (err3, submissions) => {
                if (err3) {
                    return res.status(500).json({ error: err3.message });
                }
                submissions = submissions.map(s => ({
                    ...s,
                    metrics: JSON.parse(s.metrics || '{}')
                }));
                db.all("SELECT * FROM anti_cheat_logs WHERE session_id = ?", [sessionId], (err4, logs) => {
                    if (err4) {
                        return res.status(500).json({ error: err4.message });
                    }
                    res.json({ session, submissions, logs });
                });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

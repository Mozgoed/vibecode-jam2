const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'vibecode.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Tasks table
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            level TEXT NOT NULL, -- 'junior', 'middle', 'senior'
            examples TEXT NOT NULL, -- JSON string
            tests TEXT NOT NULL -- JSON string (hidden tests)
        )`);

        // Sessions table (Candidate progress)
        db.run(`CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_name TEXT,
            level TEXT,
            start_time INTEGER,
            end_time INTEGER,
            score INTEGER DEFAULT 0
        )`);

        // Submissions table
        db.run(`CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            task_id INTEGER,
            code TEXT,
            status TEXT, -- 'passed', 'failed', 'error'
            metrics TEXT, -- JSON string (time, attempts, style_score)
            timestamp INTEGER,
            FOREIGN KEY(session_id) REFERENCES sessions(id),
            FOREIGN KEY(task_id) REFERENCES tasks(id)
        )`);
        
        // Seed some initial data if empty
        db.get("SELECT count(*) as count FROM tasks", (err, row) => {
            if (row.count === 0) {
                console.log("Seeding initial tasks...");
                seedTasks();
            }
        });
    });
}

function seedTasks() {
    const tasks = [
        {
            title: "Sum of Two Numbers",
            description: "Write a function `sum(a, b)` that returns the sum of two numbers.",
            level: "junior",
            examples: JSON.stringify([{input: "1, 2", output: "3"}, {input: "-1, 1", output: "0"}]),
            tests: JSON.stringify([
                {code: "sum(1, 2)", expected: 3},
                {code: "sum(10, 20)", expected: 30},
                {code: "sum(-5, 5)", expected: 0}
            ])
        },
        {
            title: "Reverse String",
            description: "Write a function `reverse(str)` that returns the reversed string.",
            level: "junior",
            examples: JSON.stringify([{input: "'hello'", output: "'olleh'"}]),
            tests: JSON.stringify([
                {code: "reverse('hello')", expected: 'olleh'},
                {code: "reverse('world')", expected: 'dlrow'},
                {code: "reverse('')", expected: ''}
            ])
        },
         {
            title: "FizzBuzz",
            description: "Write a function `fizzBuzz(n)` that returns an array from 1 to n. But for multiples of 3 print 'Fizz', for 5 'Buzz', for both 'FizzBuzz'.",
            level: "middle",
            examples: JSON.stringify([{input: "3", output: "[1, 2, 'Fizz']"}]),
            tests: JSON.stringify([
                {code: "fizzBuzz(3)", expected: [1, 2, 'Fizz']},
                {code: "fizzBuzz(5)", expected: [1, 2, 'Fizz', 4, 'Buzz']},
                {code: "fizzBuzz(15)[14]", expected: 'FizzBuzz'}
            ])
        }
    ];

    const stmt = db.prepare("INSERT INTO tasks (title, description, level, examples, tests) VALUES (?, ?, ?, ?, ?)");
    tasks.forEach(t => {
        stmt.run(t.title, t.description, t.level, t.examples, t.tests);
    });
    stmt.finalize();
}

module.exports = db;

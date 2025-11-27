const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'vibecode.db');
const db = new sqlite3.Database(dbPath);

console.log('Running database migration...');

db.serialize(() => {
    // Add qualification columns to users table if they don't exist
    db.run(`ALTER TABLE users ADD COLUMN qualification_passed INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding qualification_passed:', err.message);
        } else {
            console.log('✓ Added qualification_passed column');
        }
    });

    db.run(`ALTER TABLE users ADD COLUMN qualification_level TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding qualification_level:', err.message);
        } else {
            console.log('✓ Added qualification_level column');
        }
    });

    // Create challenges table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        level TEXT NOT NULL,
        task_ids TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        status TEXT NOT NULL DEFAULT 'in_progress',
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating challenges table:', err.message);
        } else {
            console.log('✓ Created challenges table');
        }
    });

    // Create challenge_submissions table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS challenge_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        challenge_id INTEGER NOT NULL,
        task_id INTEGER NOT NULL,
        code TEXT,
        passed INTEGER DEFAULT 0,
        submitted_at INTEGER,
        FOREIGN KEY(challenge_id) REFERENCES challenges(id),
        FOREIGN KEY(task_id) REFERENCES tasks(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating challenge_submissions table:', err.message);
        } else {
            console.log('✓ Created challenge_submissions table');
        }

        // Close database after last operation
        setTimeout(() => {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('\n✅ Migration completed successfully!');
                    console.log('You can now restart the server.');
                }
            });
        }, 1000);
    });
});

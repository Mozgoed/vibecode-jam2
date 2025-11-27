const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'vibecode.db');
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

        // Anti-cheat logs table
        db.run(`CREATE TABLE IF NOT EXISTS anti_cheat_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            submission_id INTEGER,
            event_type TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            details TEXT,
            FOREIGN KEY(session_id) REFERENCES sessions(id),
            FOREIGN KEY(submission_id) REFERENCES submissions(id)
        )`);

        // Users table for authentication. Stores a unique username, a hashed password and a role ('candidate' or 'admin').
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'candidate',
            created_at INTEGER
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
            examples: JSON.stringify([{ input: "1, 2", output: "3" }, { input: "-1, 1", output: "0" }]),
            tests: JSON.stringify([
                { code: "sum(1, 2)", expected: 3 },
                { code: "sum(10, 20)", expected: 30 },
                { code: "sum(-5, 5)", expected: 0 }
            ])
        },
        {
            title: "Reverse String",
            description: "Write a function `reverse(str)` that returns the reversed string.",
            level: "junior",
            examples: JSON.stringify([{ input: "'hello'", output: "'olleh'" }]),
            tests: JSON.stringify([
                { code: "reverse('hello')", expected: 'olleh' },
                { code: "reverse('world')", expected: 'dlrow' },
                { code: "reverse('')", expected: '' }
            ])
        },
        {
            title: "FizzBuzz",
            description: "Write a function `fizzBuzz(n)` that returns an array from 1 to n. But for multiples of 3 print 'Fizz', for 5 'Buzz', for both 'FizzBuzz'.",
            level: "middle",
            examples: JSON.stringify([{ input: "3", output: "[1, 2, 'Fizz']" }]),
            tests: JSON.stringify([
                { code: "fizzBuzz(3)", expected: [1, 2, 'Fizz'] },
                { code: "fizzBuzz(5)", expected: [1, 2, 'Fizz', 4, 'Buzz'] },
                { code: "fizzBuzz(15)[14]", expected: 'FizzBuzz' }
            ])
        },
        // Additional tasks for various difficulty levels
        {
            title: "Find Maximum Element",
            description: "Write a function `maxElement(arr)` that returns the maximum element in an array of numbers.",
            level: "junior",
            examples: JSON.stringify([
                { input: "[1, 3, 2]", output: "3" },
                { input: "[-5, -10, -1]", output: "-1" }
            ]),
            tests: JSON.stringify([
                { code: "maxElement([1,3,2])", expected: 3 },
                { code: "maxElement([-5,-10,-1])", expected: -1 },
                { code: "maxElement([5])", expected: 5 }
            ])
        },
        {
            title: "Check Palindrome",
            description: "Write a function `isPalindrome(str)` that returns true if the string is a palindrome (the same forwards and backwards) and false otherwise.",
            level: "junior",
            examples: JSON.stringify([
                { input: "'racecar'", output: "true" },
                { input: "'hello'", output: "false" }
            ]),
            tests: JSON.stringify([
                { code: "isPalindrome('racecar')", expected: true },
                { code: "isPalindrome('hello')", expected: false },
                { code: "isPalindrome('a')", expected: true }
            ])
        },
        {
            title: "Anagram Detection",
            description: "Write a function `areAnagrams(a, b)` that returns true if the two input strings are anagrams of each other and false otherwise.",
            level: "middle",
            examples: JSON.stringify([
                { input: "'listen', 'silent'", output: "true" },
                { input: "'hello', 'world'", output: "false" }
            ]),
            tests: JSON.stringify([
                { code: "areAnagrams('listen','silent')", expected: true },
                { code: "areAnagrams('hello','world')", expected: false },
                { code: "areAnagrams('anagram','nagaram')", expected: true }
            ])
        },
        {
            title: "Digital Root",
            description: "Write a function `digitalRoot(n)` that repeatedly sums the digits of a non-negative integer until a single digit is obtained.",
            level: "middle",
            examples: JSON.stringify([
                { input: "38", output: "2" },
                { input: "0", output: "0" }
            ]),
            tests: JSON.stringify([
                { code: "digitalRoot(38)", expected: 2 },
                { code: "digitalRoot(0)", expected: 0 },
                { code: "digitalRoot(999)", expected: 9 }
            ])
        },
        {
            title: "Longest Increasing Subsequence",
            description: "Write a function `longestIncSeq(arr)` that returns the length of the longest strictly increasing subsequence in an array.",
            level: "senior",
            examples: JSON.stringify([
                { input: "[10,9,2,5,3,7,101,18]", output: "4" }
            ]),
            tests: JSON.stringify([
                { code: "longestIncSeq([10,9,2,5,3,7,101,18])", expected: 4 },
                { code: "longestIncSeq([0,1,0,3,2,3])", expected: 4 },
                { code: "longestIncSeq([7,7,7,7,7,7])", expected: 1 }
            ])
        },
        {
            title: "Fibonacci Number",
            description: "Write a function `fibonacci(n)` that returns the nth Fibonacci number. Assume `fibonacci(0) = 0` and `fibonacci(1) = 1`.",
            level: "senior",
            examples: JSON.stringify([
                { input: "5", output: "5" },
                { input: "7", output: "13" }
            ]),
            tests: JSON.stringify([
                { code: "fibonacci(0)", expected: 0 },
                { code: "fibonacci(5)", expected: 5 },
                { code: "fibonacci(7)", expected: 13 }
            ])
        },

        // Additional tasks to expand the pool for each difficulty level
        // Junior level tasks
        {
            title: "Factorial",
            description: "Write a function `factorial(n)` that returns the factorial of a non-negative integer n.",
            level: "junior",
            examples: JSON.stringify([
                { input: "3", output: "6" },
                { input: "5", output: "120" }
            ]),
            tests: JSON.stringify([
                { code: "factorial(0)", expected: 1 },
                { code: "factorial(3)", expected: 6 },
                { code: "factorial(5)", expected: 120 }
            ])
        },
        {
            title: "Count Vowels",
            description: "Write a function `countVowels(str)` that returns the number of vowels in a given string (a, e, i, o, u).",
            level: "junior",
            examples: JSON.stringify([
                { input: "'hello'", output: "2" },
                { input: "'rhythm'", output: "0" }
            ]),
            tests: JSON.stringify([
                { code: "countVowels('hello')", expected: 2 },
                { code: "countVowels('rhythm')", expected: 0 },
                { code: "countVowels('AEiou')", expected: 5 }
            ])
        },
        {
            title: "Filter Even Numbers",
            description: "Write a function `evenNumbers(arr)` that returns a new array containing only the even numbers from the input array.",
            level: "junior",
            examples: JSON.stringify([
                { input: "[1,2,3,4]", output: "[2,4]" },
                { input: "[5,7,9]", output: "[]" }
            ]),
            tests: JSON.stringify([
                { code: "evenNumbers([1,2,3,4])", expected: [2, 4] },
                { code: "evenNumbers([5,7,9])", expected: [] },
                { code: "evenNumbers([0,10,11])", expected: [0, 10] }
            ])
        },

        // Middle level tasks
        {
            title: "Binary Search",
            description: "Write a function `binarySearch(arr, target)` that performs binary search on a sorted array and returns the index of the target element or -1 if not found.",
            level: "middle",
            examples: JSON.stringify([
                { input: "[1,2,3,4,5], 4", output: "3" },
                { input: "[10,20,30,40], 25", output: "-1" }
            ]),
            tests: JSON.stringify([
                { code: "binarySearch([1,2,3,4,5], 4)", expected: 3 },
                { code: "binarySearch([10,20,30,40], 25)", expected: -1 },
                { code: "binarySearch([], 1)", expected: -1 }
            ])
        },
        {
            title: "Merge Sorted Arrays",
            description: "Write a function `mergeSorted(arr1, arr2)` that merges two sorted arrays into a single sorted array.",
            level: "middle",
            examples: JSON.stringify([
                { input: "[1,3,5], [2,4,6]", output: "[1,2,3,4,5,6]" },
                { input: "[], [1,2,3]", output: "[1,2,3]" }
            ]),
            tests: JSON.stringify([
                { code: "mergeSorted([1,3,5],[2,4,6])", expected: [1, 2, 3, 4, 5, 6] },
                { code: "mergeSorted([],[1,2,3])", expected: [1, 2, 3] },
                { code: "mergeSorted([0],[1])", expected: [0, 1] }
            ])
        },
        {
            title: "Validate Parentheses",
            description: "Write a function `isValidParentheses(str)` that returns true if every opening parenthesis '(' is properly closed by a matching ')'. Only parentheses are considered.",
            level: "middle",
            examples: JSON.stringify([
                { input: "'()'", output: "true" },
                { input: "'(())'", output: "true" },
                { input: "')('", output: "false" }
            ]),
            tests: JSON.stringify([
                { code: "isValidParentheses('()')", expected: true },
                { code: "isValidParentheses('(())')", expected: true },
                { code: "isValidParentheses(')(')", expected: false }
            ])
        },

        // Senior level tasks
        {
            title: "Longest Common Subsequence",
            description: "Write a function `lcs(a, b)` that returns the length of the longest common subsequence between two strings a and b.",
            level: "senior",
            examples: JSON.stringify([
                { input: "'abcde', 'ace'", output: "3" },
                { input: "'abc', 'def'", output: "0" }
            ]),
            tests: JSON.stringify([
                { code: "lcs('abcde','ace')", expected: 3 },
                { code: "lcs('abc','def')", expected: 0 },
                { code: "lcs('AGGTAB','GXTXAYB')", expected: 4 }
            ])
        },
        {
            title: "Top K Frequent Elements",
            description: "Write a function `topKFrequent(nums, k)` that returns an array of the k most frequent elements in the integer array nums. The order of the returned elements does not matter.",
            level: "senior",
            examples: JSON.stringify([
                { input: "[1,1,1,2,2,3], 2", output: "[1,2]" },
                { input: "[1], 1", output: "[1]" }
            ]),
            tests: JSON.stringify([
                { code: "topKFrequent([1,1,1,2,2,3],2)", expected: [1, 2] },
                { code: "topKFrequent([1],1)", expected: [1] },
                { code: "topKFrequent([4,4,4,3,3,2,1],3)", expected: [4, 3, 2] }
            ])
        },
        {
            title: "Median of Two Sorted Arrays",
            description: "Write a function `findMedianSortedArrays(nums1, nums2)` that returns the median of the two sorted arrays. Assume the overall run time complexity should be O(log (m+n)).",
            level: "senior",
            examples: JSON.stringify([
                { input: "[1,3], [2]", output: "2" },
                { input: "[1,2], [3,4]", output: "2.5" }
            ]),
            tests: JSON.stringify([
                { code: "findMedianSortedArrays([1,3],[2])", expected: 2 },
                { code: "findMedianSortedArrays([1,2],[3,4])", expected: 2.5 },
                { code: "findMedianSortedArrays([0,0],[0,0])", expected: 0 }
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

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use DB_PATH from environment or default to local directory
const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'vibecode.db');

// Ensure directory exists for the database file
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created database directory: ${dbDir}`);
}

console.log(`Using database path: ${dbPath}`);

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
        // ========== JUNIOR LEVEL (10 tasks) ==========
        {
            title: "Sum of Two Numbers",
            description: "Write a function `sum(a, b)` that returns the sum of two numbers.",
            level: "junior",
            examples: JSON.stringify([{ input: "1, 2", output: "3" }, { input: "-1, 1", output: "0" }]),
            tests: JSON.stringify([
                { code: "sum(1, 2)", expected: 3 },
                { code: "sum(10, 20)", expected: 30 },
                { code: "sum(-5, 5)", expected: 0 },
                { code: "sum(0, 0)", expected: 0 }
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
                { code: "reverse('')", expected: '' },
                { code: "reverse('a')", expected: 'a' }
            ])
        },
        {
            title: "Find Maximum",
            description: "Write a function `findMax(arr)` that returns the maximum number in an array.",
            level: "junior",
            examples: JSON.stringify([{ input: "[1, 5, 3, 9, 2]", output: "9" }]),
            tests: JSON.stringify([
                { code: "findMax([1, 5, 3, 9, 2])", expected: 9 },
                { code: "findMax([10])", expected: 10 },
                { code: "findMax([-5, -1, -10])", expected: -1 },
                { code: "findMax([0, 0, 0])", expected: 0 }
            ])
        },
        {
            title: "Is Even",
            description: "Write a function `isEven(n)` that returns true if number is even, false otherwise.",
            level: "junior",
            examples: JSON.stringify([{ input: "4", output: "true" }, { input: "7", output: "false" }]),
            tests: JSON.stringify([
                { code: "isEven(4)", expected: true },
                { code: "isEven(7)", expected: false },
                { code: "isEven(0)", expected: true },
                { code: "isEven(-2)", expected: true }
            ])
        },
        {
            title: "Count Vowels",
            description: "Write a function `countVowels(str)` that counts the number of vowels (a, e, i, o, u) in a string.",
            level: "junior",
            examples: JSON.stringify([{ input: "'hello'", output: "2" }]),
            tests: JSON.stringify([
                { code: "countVowels('hello')", expected: 2 },
                { code: "countVowels('world')", expected: 1 },
                { code: "countVowels('aeiou')", expected: 5 },
                { code: "countVowels('xyz')", expected: 0 }
            ])
        },
        {
            title: "Array Sum",
            description: "Write a function `arraySum(arr)` that returns the sum of all numbers in an array.",
            level: "junior",
            examples: JSON.stringify([{ input: "[1, 2, 3, 4]", output: "10" }]),
            tests: JSON.stringify([
                { code: "arraySum([1, 2, 3, 4])", expected: 10 },
                { code: "arraySum([10])", expected: 10 },
                { code: "arraySum([0, 0])", expected: 0 },
                { code: "arraySum([-1, 1])", expected: 0 }
            ])
        },
        {
            title: "Is Palindrome",
            description: "Write a function `isPalindrome(str)` that returns true if the string is a palindrome (reads the same forwards and backwards).",
            level: "junior",
            examples: JSON.stringify([{ input: "'racecar'", output: "true" }, { input: "'hello'", output: "false" }]),
            tests: JSON.stringify([
                { code: "isPalindrome('racecar')", expected: true },
                { code: "isPalindrome('hello')", expected: false },
                { code: "isPalindrome('a')", expected: true },
                { code: "isPalindrome('ab')", expected: false }
            ])
        },
        {
            title: "String Length",
            description: "Write a function `getLength(str)` that returns the length of a string without using .length property.",
            level: "junior",
            examples: JSON.stringify([{ input: "'hello'", output: "5" }]),
            tests: JSON.stringify([
                { code: "getLength('hello')", expected: 5 },
                { code: "getLength('')", expected: 0 },
                { code: "getLength('a')", expected: 1 },
                { code: "getLength('test string')", expected: 11 }
            ])
        },
        {
            title: "Multiply Array",
            description: "Write a function `multiplyBy(arr, n)` that multiplies each element in array by n.",
            level: "junior",
            examples: JSON.stringify([{ input: "[1, 2, 3], 2", output: "[2, 4, 6]" }]),
            tests: JSON.stringify([
                { code: "multiplyBy([1, 2, 3], 2)", expected: [2, 4, 6] },
                { code: "multiplyBy([5], 3)", expected: [15] },
                { code: "multiplyBy([1, 2], 0)", expected: [0, 0] },
                { code: "multiplyBy([], 5)", expected: [] }
            ])
        },
        {
            title: "First Character",
            description: "Write a function `firstChar(str)` that returns the first character of a string.",
            level: "junior",
            examples: JSON.stringify([{ input: "'hello'", output: "'h'" }]),
            tests: JSON.stringify([
                { code: "firstChar('hello')", expected: 'h' },
                { code: "firstChar('world')", expected: 'w' },
                { code: "firstChar('a')", expected: 'a' },
                { code: "firstChar('JavaScript')", expected: 'J' }
            ])
        },

        // ========== MIDDLE LEVEL (10 tasks) ==========
        {
            title: "FizzBuzz",
            description: "Write a function `fizzBuzz(n)` that returns an array from 1 to n. For multiples of 3 print 'Fizz', for 5 'Buzz', for both 'FizzBuzz'.",
            level: "middle",
            examples: JSON.stringify([{ input: "5", output: "[1, 2, 'Fizz', 4, 'Buzz']" }]),
            tests: JSON.stringify([
                { code: "fizzBuzz(3)", expected: [1, 2, 'Fizz'] },
                { code: "fizzBuzz(5)", expected: [1, 2, 'Fizz', 4, 'Buzz'] },
                { code: "fizzBuzz(15)[14]", expected: 'FizzBuzz' },
                { code: "fizzBuzz(1)", expected: [1] }
            ])
        },
        {
            title: "Remove Duplicates",
            description: "Write a function `removeDuplicates(arr)` that removes duplicate values from an array.",
            level: "middle",
            examples: JSON.stringify([{ input: "[1, 2, 2, 3, 1]", output: "[1, 2, 3]" }]),
            tests: JSON.stringify([
                { code: "removeDuplicates([1, 2, 2, 3, 1])", expected: [1, 2, 3] },
                { code: "removeDuplicates([1, 1, 1])", expected: [1] },
                { code: "removeDuplicates([1, 2, 3])", expected: [1, 2, 3] },
                { code: "removeDuplicates([])", expected: [] }
            ])
        },
        {
            title: "Fibonacci",
            description: "Write a function `fibonacci(n)` that returns the nth Fibonacci number (starting from 0, 1, 1, 2, 3, 5...).",
            level: "middle",
            examples: JSON.stringify([{ input: "6", output: "8" }]),
            tests: JSON.stringify([
                { code: "fibonacci(0)", expected: 0 },
                { code: "fibonacci(1)", expected: 1 },
                { code: "fibonacci(6)", expected: 8 },
                { code: "fibonacci(10)", expected: 55 }
            ])
        },
        {
            title: "Anagram Check",
            description: "Write a function `isAnagram(str1, str2)` that checks if two strings are anagrams (contain the same characters in different order).",
            level: "middle",
            examples: JSON.stringify([{ input: "'listen', 'silent'", output: "true" }]),
            tests: JSON.stringify([
                { code: "isAnagram('listen', 'silent')", expected: true },
                { code: "isAnagram('hello', 'world')", expected: false },
                { code: "isAnagram('abc', 'cba')", expected: true },
                { code: "isAnagram('a', 'a')", expected: true }
            ])
        },
        {
            title: "Flatten Array",
            description: "Write a function `flatten(arr)` that flattens a nested array one level deep.",
            level: "middle",
            examples: JSON.stringify([{ input: "[[1, 2], [3, 4]]", output: "[1, 2, 3, 4]" }]),
            tests: JSON.stringify([
                { code: "flatten([[1, 2], [3, 4]])", expected: [1, 2, 3, 4] },
                { code: "flatten([[1], [2]])", expected: [1, 2] },
                { code: "flatten([1, [2, 3]])", expected: [1, 2, 3] },
                { code: "flatten([])", expected: [] }
            ])
        },
        {
            title: "Most Frequent",
            description: "Write a function `mostFrequent(arr)` that returns the most frequently occurring element in an array.",
            level: "middle",
            examples: JSON.stringify([{ input: "[1, 2, 2, 3]", output: "2" }]),
            tests: JSON.stringify([
                { code: "mostFrequent([1, 2, 2, 3])", expected: 2 },
                { code: "mostFrequent([1, 1, 1])", expected: 1 },
                { code: "mostFrequent(['a', 'b', 'a'])", expected: 'a' },
                { code: "mostFrequent([5])", expected: 5 }
            ])
        },
        {
            title: "Binary Search",
            description: "Write a function `binarySearch(arr, target)` that performs binary search on a sorted array and returns the index of target, or -1 if not found.",
            level: "middle",
            examples: JSON.stringify([{ input: "[1, 2, 3, 4, 5], 3", output: "2" }]),
            tests: JSON.stringify([
                { code: "binarySearch([1, 2, 3, 4, 5], 3)", expected: 2 },
                { code: "binarySearch([1, 2, 3], 5)", expected: -1 },
                { code: "binarySearch([10, 20, 30], 10)", expected: 0 },
                { code: "binarySearch([1], 1)", expected: 0 }
            ])
        },
        {
            title: "Chunk Array",
            description: "Write a function `chunkArray(arr, size)` that splits an array into chunks of specified size.",
            level: "middle",
            examples: JSON.stringify([{ input: "[1, 2, 3, 4, 5], 2", output: "[[1, 2], [3, 4], [5]]" }]),
            tests: JSON.stringify([
                { code: "chunkArray([1, 2, 3, 4, 5], 2)", expected: [[1, 2], [3, 4], [5]] },
                { code: "chunkArray([1, 2, 3], 1)", expected: [[1], [2], [3]] },
                { code: "chunkArray([1, 2], 3)", expected: [[1, 2]] },
                { code: "chunkArray([], 2)", expected: [] }
            ])
        },
        {
            title: "Title Case",
            description: "Write a function `toTitleCase(str)` that converts a string to title case (first letter of each word capitalized).",
            level: "middle",
            examples: JSON.stringify([{ input: "'hello world'", output: "'Hello World'" }]),
            tests: JSON.stringify([
                { code: "toTitleCase('hello world')", expected: 'Hello World' },
                { code: "toTitleCase('javascript is fun')", expected: 'Javascript Is Fun' },
                { code: "toTitleCase('a')", expected: 'A' },
                { code: "toTitleCase('THE QUICK BROWN FOX')", expected: 'The Quick Brown Fox' }
            ])
        },
        {
            title: "Valid Parentheses",
            description: "Write a function `isValidParentheses(str)` that checks if parentheses are balanced in a string.",
            level: "middle",
            examples: JSON.stringify([{ input: "'(())'", output: "true" }, { input: "'(()'", output: "false" }]),
            tests: JSON.stringify([
                { code: "isValidParentheses('(())')", expected: true },
                { code: "isValidParentheses('(()')", expected: false },
                { code: "isValidParentheses('()()')", expected: true },
                { code: "isValidParentheses('')", expected: true }
            ])
        },

        // ========== SENIOR LEVEL (10 tasks) ==========
        {
            title: "Longest Substring Without Repeating",
            description: "Write a function `lengthOfLongestSubstring(s)` that finds the length of the longest substring without repeating characters.",
            level: "senior",
            examples: JSON.stringify([{ input: "'abcabcbb'", output: "3" }]),
            tests: JSON.stringify([
                { code: "lengthOfLongestSubstring('abcabcbb')", expected: 3 },
                { code: "lengthOfLongestSubstring('bbbbb')", expected: 1 },
                { code: "lengthOfLongestSubstring('pwwkew')", expected: 3 },
                { code: "lengthOfLongestSubstring('')", expected: 0 }
            ])
        },
        {
            title: "Merge Intervals",
            description: "Write a function `mergeIntervals(intervals)` that merges overlapping intervals. Each interval is [start, end].",
            level: "senior",
            examples: JSON.stringify([{ input: "[[1,3],[2,6],[8,10]]", output: "[[1,6],[8,10]]" }]),
            tests: JSON.stringify([
                { code: "mergeIntervals([[1,3],[2,6],[8,10]])", expected: [[1, 6], [8, 10]] },
                { code: "mergeIntervals([[1,4],[4,5]])", expected: [[1, 5]] },
                { code: "mergeIntervals([[1,2]])", expected: [[1, 2]] },
                { code: "mergeIntervals([[1,4],[0,4]])", expected: [[0, 4]] }
            ])
        },
        {
            title: "Implement Debounce",
            description: "Write a function `debounce(func, delay)` that returns a debounced version of the function (delays execution until after delay ms have passed since last call).",
            level: "senior",
            examples: JSON.stringify([{ input: "function, 100", output: "debounced function" }]),
            tests: JSON.stringify([
                { code: "typeof debounce(() => {}, 100)", expected: 'function' },
                { code: "debounce(() => 5, 100).name", expected: '' }
            ])
        },
        {
            title: "Deep Clone Object",
            description: "Write a function `deepClone(obj)` that creates a deep copy of an object (nested objects too).",
            level: "senior",
            examples: JSON.stringify([{ input: "{a: 1, b: {c: 2}}", output: "{a: 1, b: {c: 2}}" }]),
            tests: JSON.stringify([
                { code: "deepClone({a: 1}).a", expected: 1 },
                { code: "deepClone({a: {b: 2}}).a.b", expected: 2 },
                { code: "JSON.stringify(deepClone({x: [1, 2]}))", expected: '{"x":[1,2]}' },
                { code: "deepClone({})", expected: {} }
            ])
        },
        {
            title: "LRU Cache",
            description: "Implement an LRU (Least Recently Used) Cache with `get(key)` and `put(key, value)` methods. Use capacity of 2.",
            level: "senior",
            examples: JSON.stringify([{ input: "put(1,1), get(1)", output: "1" }]),
            tests: JSON.stringify([
                { code: "(() => { const c = new LRUCache(2); c.put(1,1); return c.get(1); })()", expected: 1 },
                { code: "(() => { const c = new LRUCache(2); c.put(1,1); return c.get(2); })()", expected: -1 }
            ])
        },
        {
            title: "Binary Tree Max Depth",
            description: "Write a function `maxDepth(root)` that returns the maximum depth of a binary tree. Tree node format: {val, left, right}.",
            level: "senior",
            examples: JSON.stringify([{ input: "{val:3, left:{val:9}, right:{val:20}}", output: "2" }]),
            tests: JSON.stringify([
                { code: "maxDepth({val:1})", expected: 1 },
                { code: "maxDepth(null)", expected: 0 },
                { code: "maxDepth({val:1, left:{val:2}})", expected: 2 },
                { code: "maxDepth({val:1, left:{val:2, left:{val:3}}})", expected: 3 }
            ])
        },
        {
            title: "Word Search",
            description: "Write a function `exist(board, word)` that checks if word exists in a 2D board of letters. Words can be constructed from sequentially adjacent cells.",
            level: "senior",
            examples: JSON.stringify([{ input: "[['A','B'],['C','D']], 'AB'", output: "true" }]),
            tests: JSON.stringify([
                { code: "exist([['A','B'],['C','D']], 'AB')", expected: true },
                { code: "exist([['A','B'],['C','D']], 'BA')", expected: true },
                { code: "exist([['A']], 'A')", expected: true },
                { code: "exist([['A']], 'B')", expected: false }
            ])
        },
        {
            title: "Generate Permutations",
            description: "Write a function `permute(nums)` that generates all possible permutations of an array of distinct integers.",
            level: "senior",
            examples: JSON.stringify([{ input: "[1,2,3]", output: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]" }]),
            tests: JSON.stringify([
                { code: "permute([1]).length", expected: 1 },
                { code: "permute([1,2]).length", expected: 2 },
                { code: "permute([1,2,3]).length", expected: 6 }
            ])
        },
        {
            title: "Longest Common Subsequence",
            description: "Write a function `longestCommonSubsequence(text1, text2)` that returns the length of the longest common subsequence between two strings.",
            level: "senior",
            examples: JSON.stringify([{ input: "'abcde', 'ace'", output: "3" }]),
            tests: JSON.stringify([
                { code: "longestCommonSubsequence('abcde', 'ace')", expected: 3 },
                { code: "longestCommonSubsequence('abc', 'abc')", expected: 3 },
                { code: "longestCommonSubsequence('abc', 'def')", expected: 0 },
                { code: "longestCommonSubsequence('a', 'a')", expected: 1 }
            ])
        },
        {
            title: "Knapsack Problem",
            description: "Write a function `knapsack(weights, values, capacity)` that solves the 0/1 knapsack problem and returns maximum value.",
            level: "senior",
            examples: JSON.stringify([{ input: "[1,2,3], [6,10,12], 5", output: "22" }]),
            tests: JSON.stringify([
                { code: "knapsack([1,2,3], [6,10,12], 5)", expected: 22 },
                { code: "knapsack([1], [1], 1)", expected: 1 },
                { code: "knapsack([2,3], [3,4], 4)", expected: 4 },
                { code: "knapsack([1,2], [1,2], 0)", expected: 0 }
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

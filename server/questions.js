const questions = [
    {
        id: 1,
        question: "What is the time complexity of accessing an element in an array by index?",
        options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
        correct: 0 // Index of correct option
    },
    {
        id: 2,
        question: "Which of the following is NOT a JavaScript data type?",
        options: ["Symbol", "Boolean", "Integer", "Undefined"],
        correct: 2
    },
    {
        id: 3,
        question: "What does 'closure' refer to in JavaScript?",
        options: [
            "A function that has access to its outer function scope",
            "A way to close a browser window",
            "A method to secure code",
            "The end of a loop"
        ],
        correct: 0
    },
    {
        id: 4,
        question: "What is the result of `2 + '2'` in JavaScript?",
        options: ["4", "'22'", "NaN", "Error"],
        correct: 1
    },
    {
        id: 5,
        question: "Which data structure uses LIFO (Last In First Out)?",
        options: ["Queue", "Stack", "Tree", "Graph"],
        correct: 1
    }
];

module.exports = questions;

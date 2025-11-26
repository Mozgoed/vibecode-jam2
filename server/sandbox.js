const vm = require('vm');

/**
 * Executes user code against a set of test cases.
 * @param {string} userCode - The code submitted by the candidate.
 * @param {Array} testCases - Array of {code: string, expected: any}.
 * @returns {Promise<Object>} - { results: Array, passed: boolean, error: string }
 */
function execute(userCode, testCases) {
    return new Promise((resolve) => {
        const sandbox = {
            console: {
                log: (...args) => {
                    // Capture logs if needed, for now just ignore or pipe to stdout
                    // console.log('VM Log:', ...args); 
                }
            },
            // Add other safe globals if needed
        };

        const context = vm.createContext(sandbox);

        try {
            // 1. Run user code to define functions
            vm.runInContext(userCode, context, { timeout: 1000 });

            // 2. Run tests
            const results = testCases.map(test => {
                try {
                    // We wrap the test execution to capture the result
                    // We use JSON.stringify to compare complex objects easily in this MVP
                    const testScript = `
                        (() => {
                            const result = ${test.code};
                            return JSON.stringify(result);
                        })()
                    `;
                    const actualStr = vm.runInContext(testScript, context, { timeout: 500 });
                    const expectedStr = JSON.stringify(test.expected);

                    const passed = actualStr === expectedStr;
                    return {
                        test: test.code,
                        expected: test.expected,
                        actual: JSON.parse(actualStr || 'null'),
                        passed: passed
                    };
                } catch (err) {
                    return {
                        test: test.code,
                        expected: test.expected,
                        error: err.message,
                        passed: false
                    };
                }
            });

            const allPassed = results.every(r => r.passed);
            resolve({ results, passed: allPassed });

        } catch (err) {
            resolve({ error: err.message, passed: false });
        }
    });
}

module.exports = { execute };

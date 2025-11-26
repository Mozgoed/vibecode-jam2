import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CodeEditor from '../components/Editor';
import { useAntiCheat } from '../hooks/useAntiCheat';

export default function Workspace() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [code, setCode] = useState('// Write your solution here\n');
    const [output, setOutput] = useState(null);
    const [loading, setLoading] = useState(false);
    const [antiCheatLog, setAntiCheatLog] = useState([]);
    const [lastEditTime, setLastEditTime] = useState(null);
    const [idleTimer, setIdleTimer] = useState(null);

    // Track suspicious activity
    useAntiCheat((event) => {
        setAntiCheatLog(prev => [...prev, event]);
        console.log('[Anti-Cheat]', event);
    });

    useEffect(() => {
        axios.get(`http://localhost:3001/api/tasks/${id}`)
            .then(res => {
                setTask(res.data.task);
                // Pre-fill function signature if possible? 
                // For now just generic comment.
            })
            .catch(err => console.error(err));
    }, [id]);

    // Clear idle timer on unmount
    useEffect(() => {
        return () => {
            if (idleTimer) clearTimeout(idleTimer);
        };
    }, [idleTimer]);

    // Handle code changes with anti‑cheat logging
    const handleCodeChange = (newCode) => {
        setCode(newCode);
        const now = Date.now();
        // Record local event
        const editEvent = { type: 'edit', timestamp: now, details: { length: newCode.length } };
        setAntiCheatLog(prev => [...prev, editEvent]);
        // Send to backend
        try {
            fetch('http://localhost:3001/api/anticheat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_type: 'edit', timestamp: now, details: { length: newCode.length } }),
            });
        } catch (err) {}
        // Reset idle timer
        if (idleTimer) {
            clearTimeout(idleTimer);
        }
        // Schedule idle detection: if no edits occur for 30 seconds, log idle event
        const timerId = setTimeout(() => {
            const idleNow = Date.now();
            const duration = idleNow - now;
            const idleEvent = { type: 'idle', timestamp: idleNow, details: { duration } };
            setAntiCheatLog(prev => [...prev, idleEvent]);
            try {
                fetch('http://localhost:3001/api/anticheat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event_type: 'idle', timestamp: idleNow, details: { duration } }),
                });
            } catch (err) {}
        }, 30000);
        setIdleTimer(timerId);
        setLastEditTime(now);
    };

    const handleRun = async () => {
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:3001/api/run', {
                code,
                taskId: id,
                type: 'test' // visible tests
            });
            setOutput(res.data);
        } catch (err) {
            setOutput({ error: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:3001/api/run', {
                code,
                taskId: id,
                type: 'submit' // hidden tests
            });
            setOutput(res.data);
            // If passed, maybe navigate to report or show success?
        } catch (err) {
            setOutput({ error: err.message });
        } finally {
            setLoading(false);
        }
    };

    if (!task) return <div>Loading task...</div>;

    return (
        <div className="workspace">
            <header className="workspace-header">
                <h2>{task.title}</h2>
                <div className="actions">
                    <button onClick={() => navigate('/')}>Back</button>
                    <button onClick={handleRun} disabled={loading}>Run Code</button>
                    <button onClick={handleSubmit} disabled={loading} className="primary">Submit</button>
                </div>
            </header>
            <div className="workspace-body">
                <div className="pane description">
                    <h3>Description</h3>
                    <p>{task.description}</p>
                    <h4>Examples:</h4>
                    {task.examples.map((ex, i) => (
                        <div key={i} className="example">
                            <strong>Input:</strong> <code>{ex.input}</code><br />
                            <strong>Output:</strong> <code>{ex.output}</code>
                        </div>
                    ))}
                </div>
                <div className="pane editor">
                    {/* Use handleCodeChange to track editing events for anti‑cheat */}
                    <CodeEditor code={code} onChange={handleCodeChange} />
                </div>
                <div className="pane output">
                    <h3>Output</h3>
                    {loading && <div>Running...</div>}
                    {output && (
                        <div className={`result ${output.passed ? 'success' : 'error'}`}>
                            {output.error && <div className="error-msg">{output.error}</div>}
                            {output.results && output.results.map((res, i) => (
                                <div key={i} className={`test-case ${res.passed ? 'pass' : 'fail'}`}>
                                    <span>Test {i + 1}: {res.passed ? 'PASS' : 'FAIL'}</span>
                                    {!res.passed && (
                                        <div className="details">
                                            Expected: {JSON.stringify(res.expected)}<br />
                                            Actual: {JSON.stringify(res.actual)}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {output.results && output.passed && <div className="success-msg">All tests passed!</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

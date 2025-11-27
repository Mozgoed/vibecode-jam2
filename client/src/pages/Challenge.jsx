import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CodeEditor from '../components/Editor';

export default function Challenge() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [challenge, setChallenge] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [submissions, setSubmissions] = useState({});
    const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
    const [code, setCode] = useState('// Write your solution here\n');
    const [output, setOutput] = useState(null);
    const [loading, setLoading] = useState(false);
    const [startTime, setStartTime] = useState(Date.now());
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        loadChallenge();
    }, [id]);

    // Timer effect
    useEffect(() => {
        const timer = setInterval(() => {
            if (challenge && challenge.status === 'in_progress') {
                setElapsedTime(Date.now() - challenge.start_time);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [challenge]);

    const loadChallenge = () => {
        axios.get(`http://localhost:3001/api/challenges/${id}`)
            .then(res => {
                setChallenge(res.data.challenge);
                setTasks(res.data.tasks);
                setStartTime(res.data.challenge.start_time);

                // Build submissions map
                const subsMap = {};
                res.data.submissions.forEach(sub => {
                    subsMap[sub.task_id] = sub;
                });
                setSubmissions(subsMap);

                // Load code from previous submission if exists
                const firstTask = res.data.tasks[0];
                if (subsMap[firstTask.id]) {
                    setCode(subsMap[firstTask.id].code || '// Write your solution here\n');
                }
            })
            .catch(err => {
                console.error(err);
                alert('Error loading challenge');
                navigate('/');
            });
    };

    const handleTaskSwitch = (index) => {
        // Save current code before switching
        const currentTask = tasks[currentTaskIndex];
        if (currentTask && code) {
            setSubmissions(prev => ({
                ...prev,
                [currentTask.id]: { ...prev[currentTask.id], code }
            }));
        }

        setCurrentTaskIndex(index);
        const nextTask = tasks[index];

        // Load code from submission if exists
        if (submissions[nextTask.id]) {
            setCode(submissions[nextTask.id].code || '// Write your solution here\n');
        } else {
            setCode('// Write your solution here\n');
        }
        setOutput(null);
    };

    const handleRun = async () => {
        setLoading(true);
        const currentTask = tasks[currentTaskIndex];
        try {
            const res = await axios.post(`http://localhost:3001/api/challenges/${id}/submit-task`, {
                taskId: currentTask.id,
                code
            });
            setOutput(res.data);

            // Update submissions state
            setSubmissions(prev => ({
                ...prev,
                [currentTask.id]: {
                    ...prev[currentTask.id],
                    code,
                    passed: res.data.passed ? 1 : 0
                }
            }));
        } catch (err) {
            setOutput({ error: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleFinishChallenge = async () => {
        const completedCount = Object.values(submissions).filter(s => s.passed === 1).length;
        const incompleteCount = 3 - completedCount;

        if (incompleteCount > 0) {
            const confirmed = window.confirm(
                `You have ${incompleteCount} incomplete task(s). Are you sure you want to finish the challenge?`
            );
            if (!confirmed) return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`http://localhost:3001/api/challenges/${id}/complete`);
            navigate(`/challenge/${id}/results`);
        } catch (err) {
            alert('Error completing challenge: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    };

    if (!challenge || tasks.length === 0) return <div>Loading challenge...</div>;

    const currentTask = tasks[currentTaskIndex];
    const completedCount = Object.values(submissions).filter(s => s.passed === 1).length;

    return (
        <div className="workspace">
            <header className="workspace-header">
                <h2>Challenge Mode</h2>
                <div className="challenge-info">
                    <span className="timer">⏱ {formatTime(elapsedTime)}</span>
                    <span className="progress">Progress: {completedCount}/3 tasks</span>
                </div>
                <div className="actions">
                    <button onClick={handleRun} disabled={loading}>Run Code</button>
                    <button onClick={handleFinishChallenge} disabled={loading} className="primary">
                        Finish Challenge
                    </button>
                </div>
            </header>

            <div className="task-tabs">
                {tasks.map((task, index) => (
                    <button
                        key={task.id}
                        className={`task-tab ${index === currentTaskIndex ? 'active' : ''} ${submissions[task.id]?.passed ? 'completed' : ''
                            }`}
                        onClick={() => handleTaskSwitch(index)}
                    >
                        Task {index + 1}: {task.title}
                        {submissions[task.id]?.passed === 1 && <span className="check">✓</span>}
                    </button>
                ))}
            </div>

            <div className="workspace-body">
                <div className="pane description">
                    <h3>{currentTask.title}</h3>
                    <p>{currentTask.description}</p>
                    <h4>Examples:</h4>
                    {currentTask.examples.map((ex, i) => (
                        <div key={i} className="example">
                            <strong>Input:</strong> <code>{ex.input}</code><br />
                            <strong>Output:</strong> <code>{ex.output}</code>
                        </div>
                    ))}
                </div>
                <div className="pane editor">
                    <CodeEditor code={code} onChange={setCode} />
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

            <style jsx>{`
                .challenge-info {
                    display: flex;
                    gap: 2rem;
                    align-items: center;
                }
                .timer {
                    font-size: 1.2rem;
                    font-weight: bold;
                    color: #4CAF50;
                }
                .progress {
                    font-size: 1rem;
                }
                .task-tabs {
                    display: flex;
                    gap: 0.5rem;
                    padding: 1rem;
                    background: #f5f5f5;
                    border-bottom: 2px solid #ddd;
                }
                .task-tab {
                    padding: 0.75rem 1.5rem;
                    border: 1px solid #ddd;
                    background: white;
                    cursor: pointer;
                    border-radius: 4px 4px 0 0;
                    transition: all 0.2s;
                }
                .task-tab:hover {
                    background: #e8e8e8;
                }
                .task-tab.active {
                    background: #4CAF50;
                    color: white;
                    border-color: #4CAF50;
                }
                .task-tab.completed {
                    border-left: 4px solid #4CAF50;
                }
                .task-tab .check {
                    margin-left: 0.5rem;
                    color: #4CAF50;
                }
                .task-tab.active .check {
                    color: white;
                }
            `}</style>
        </div>
    );
}

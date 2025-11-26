import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Report() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`http://localhost:3001/api/sessions/${sessionId}`)
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [sessionId]);

    if (loading) return <div className="container">Loading report...</div>;
    if (!data) return <div className="container">Session not found.</div>;

    const { session, submissions } = data;
    const totalTasks = submissions.length;
    const passedTasks = submissions.filter(s => s.status === 'passed').length;
    const duration = session.end_time ? Math.round((session.end_time - session.start_time) / 1000 / 60) : 0;

    return (
        <div className="container">
            <header className="report-header">
                <h1>Interview Report</h1>
                <button onClick={() => navigate('/')}>Back to Home</button>
            </header>

            <div className="report-summary">
                <div className="stat-card">
                    <div className="stat-value">{session.score || 0}</div>
                    <div className="stat-label">Total Score</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{passedTasks}/{totalTasks}</div>
                    <div className="stat-label">Tasks Passed</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{duration} min</div>
                    <div className="stat-label">Duration</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value"><span className={`badge ${session.level}`}>{session.level}</span></div>
                    <div className="stat-label">Level</div>
                </div>
            </div>

            <h2>Task Submissions</h2>
            <div className="submissions-list">
                {submissions.map((sub, i) => (
                    <div key={sub.id} className={`submission-card ${sub.status}`}>
                        <h3>Task #{sub.task_id}</h3>
                        <div className="submission-status">
                            Status: <span className={`badge ${sub.status === 'passed' ? 'junior' : 'senior'}`}>
                                {sub.status}
                            </span>
                        </div>
                        {sub.metrics && (
                            <div className="metrics">
                                {sub.metrics.time && <div>Time: {sub.metrics.time}ms</div>}
                                {sub.metrics.attempts && <div>Attempts: {sub.metrics.attempts}</div>}
                            </div>
                        )}
                        <details>
                            <summary>View Code</summary>
                            <pre><code>{sub.code}</code></pre>
                        </details>
                    </div>
                ))}
            </div>

            <div className="report-footer">
                <h3>Recommendations</h3>
                <p>
                    {passedTasks === totalTasks
                        ? "Excellent work! All tasks completed successfully."
                        : passedTasks > totalTasks / 2
                            ? "Good effort! Keep practicing to improve your problem-solving skills."
                            : "Keep learning! Focus on fundamental concepts and practice more problems."}
                </p>
            </div>
        </div>
    );
}

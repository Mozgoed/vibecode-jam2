import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ChallengeResults() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [challenge, setChallenge] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`http://localhost:3001/api/challenges/${id}`)
            .then(res => {
                setChallenge(res.data.challenge);
                setTasks(res.data.tasks);
                setSubmissions(res.data.submissions);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                alert('Error loading results');
                navigate('/');
            });
    }, [id, navigate]);

    const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    };

    if (loading) return <div className="container">Loading results...</div>;

    const duration = challenge.end_time - challenge.start_time;
    const completedCount = submissions.filter(s => s.passed === 1).length;

    return (
        <div className="container">
            <header className="welcome-header">
                <h1>Challenge Results</h1>
            </header>

            <div className="results-summary" style={{ textAlign: 'center', margin: '2rem 0', padding: '2rem', background: '#f5f5f5', borderRadius: '8px' }}>
                <h2>🎉 Challenge Completed!</h2>
                <div style={{ fontSize: '1.5rem', margin: '1rem 0' }}>
                    <strong>Time Taken:</strong> {formatTime(duration)}
                </div>
                <div style={{ fontSize: '1.5rem', margin: '1rem 0' }}>
                    <strong>Tasks Completed:</strong> {completedCount} / 3
                </div>
                <div style={{ fontSize: '1.2rem', color: completedCount === 3 ? '#4CAF50' : '#FF9800' }}>
                    {completedCount === 3 ? 'Perfect! All tasks completed!' : `${3 - completedCount} task(s) incomplete`}
                </div>
            </div>

            <div className="task-results" style={{ margin: '2rem 0' }}>
                <h3>Task Breakdown</h3>
                {tasks.map((task, index) => {
                    const submission = submissions.find(s => s.task_id === task.id);
                    const passed = submission?.passed === 1;
                    return (
                        <div
                            key={task.id}
                            className="task-result-card"
                            style={{
                                padding: '1rem',
                                margin: '1rem 0',
                                border: `2px solid ${passed ? '#4CAF50' : '#ddd'}`,
                                borderRadius: '8px',
                                background: passed ? '#f1f8f4' : 'white'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4>{index + 1}. {task.title}</h4>
                                    <p>{task.description}</p>
                                </div>
                                <div style={{ fontSize: '2rem' }}>
                                    {passed ? '✅' : '❌'}
                                </div>
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                                Status: <strong>{passed ? 'Completed' : 'Not Completed'}</strong>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                <button className="primary" onClick={() => navigate('/')}>
                    Return to Home
                </button>
            </div>
        </div>
    );
}

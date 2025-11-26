import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function Welcome() {
    const [tasks, setTasks] = useState([]);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const level = searchParams.get('level');

    useEffect(() => {
        const url = level
            ? `http://localhost:3001/api/tasks?level=${level}`
            : 'http://localhost:3001/api/tasks';

        axios.get(url)
            .then(res => setTasks(res.data.tasks))
            .catch(err => console.error(err));
    }, [level]);

    return (
        <div className="container">
            <header className="welcome-header">
                <h1>VibeCode Jam</h1>
                {!level && (
                    <button className="primary" onClick={() => navigate('/qualification')}>
                        Take Qualification Test
                    </button>
                )}
                {level && (
                    <div className="level-info">
                        Your Level: <span className={`badge ${level}`}>{level}</span>
                        <button className="text-btn" onClick={() => navigate('/')}>Clear</button>
                    </div>
                )}
            </header>

            <p>Select a challenge to begin:</p>
            <div className="task-list">
                {tasks.length === 0 && <p>No tasks found for this level.</p>}
                {tasks.map(task => (
                    <div key={task.id} className="task-card" onClick={() => navigate(`/workspace/${task.id}`)}>
                        <h3>{task.title}</h3>
                        <span className={`badge ${task.level}`}>{task.level}</span>
                        <p>{task.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

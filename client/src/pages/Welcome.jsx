import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Welcome() {
    const [tasks, setTasks] = useState([]);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const level = searchParams.get('level');
    const { user, login, logout } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            const url = level
                ? `http://localhost:3001/api/tasks?level=${level}`
                : 'http://localhost:3001/api/tasks';

            axios.get(url)
                .then(res => setTasks(res.data.tasks))
                .catch(err => console.error(err));
        }
    }, [level, user]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(username, password);
        if (!result.success) {
            setError(result.error);
        }
    };

    // Show login form if user is not authenticated
    if (!user) {
        return (
            <div className="container">
                <header className="welcome-header">
                    <h1>VibeCode Jam</h1>
                </header>
                <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
                    <h2>Login</h2>
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem' }}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem' }}
                            />
                        </div>
                        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
                        <button type="submit" className="primary">Login</button>
                    </form>
                </div>
            </div>
        );
    }

    // Show tasks only after user is authenticated
    return (
        <div className="container">
            <header className="welcome-header">
                <h1>VibeCode Jam</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span>Welcome, {user.username}</span>
                    {user.role === 'admin' && (
                        <button className="text-btn" onClick={() => navigate('/admin')}>Admin</button>
                    )}
                    <button className="text-btn" onClick={logout}>Logout</button>
                </div>
            </header>

            {!level && (
                <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                    <button className="primary" onClick={() => navigate('/qualification')}>
                        Take Qualification Test
                    </button>
                </div>
            )}
            {level && (
                <div className="level-info">
                    Your Level: <span className={`badge ${level}`}>{level}</span>
                    <button className="text-btn" onClick={() => navigate('/')}>Clear</button>
                </div>
            )}

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

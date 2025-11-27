import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(username, password);
        if (result.success) {
            // Redirect based on role or default to home
            // For now, let's just go to home, and App.jsx will handle protection/redirection if needed
            // Or we can check user role here if we had it in result, but we can get it from context after render.
            // Let's just navigate to root, and let the user navigate from there or be redirected.
            // Actually, better UX: if admin -> /admin, else -> /
            // We need to wait for state update or check the returned user data if we modified login to return it.
            // For simplicity, let's just navigate to / and let the user choose.
            // But wait, the requirement says "admin page protected".
            // Let's just navigate to / for now.
            navigate('/');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="container">
            <h1>Login</h1>
            <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
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
                <button type="submit" style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Login</button>
            </form>
        </div>
    );
}

export default Login;

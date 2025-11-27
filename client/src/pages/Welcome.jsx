import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Welcome() {
    const [qualificationStatus, setQualificationStatus] = useState(null);
    const [activeChallenge, setActiveChallenge] = useState(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, login, logout } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(true);

    useEffect(() => {
        if (user && user.role === 'candidate') {
            setLoadingStatus(true);
            // Check qualification status
            axios.get(`http://localhost:3001/api/admin/candidates`)
                .then(res => {
                    const currentUser = res.data.candidates.find(c => c.id === user.user_id);
                    if (currentUser) {
                        setQualificationStatus({
                            passed: currentUser.qualification_passed === 1,
                            level: currentUser.qualification_level
                        });
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setLoadingStatus(false));

            // Check for active challenge
            axios.get(`http://localhost:3001/api/challenges/user/${user.user_id}`)
                .then(res => {
                    const inProgress = res.data.challenges.find(c => c.status === 'in_progress');
                    setActiveChallenge(inProgress);
                })
                .catch(err => console.error(err));
        } else {
            setLoadingStatus(false);
        }
    }, [user]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(username, password);
        if (!result.success) {
            setError(result.error);
        }
    };

    const handleStartChallenge = async () => {
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:3001/api/challenges/start', {
                userId: user.user_id
            });
            navigate(`/challenge/${res.data.challenge_id}`);
        } catch (err) {
            alert('Error starting challenge: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
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

    // Admin view - redirect to admin panel
    if (user.role === 'admin') {
        return (
            <div className="container">
                <header className="welcome-header">
                    <h1>VibeCode Jam</h1>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span>Welcome, {user.username}</span>
                        <button className="text-btn" onClick={() => navigate('/admin')}>Admin Panel</button>
                        <button className="text-btn" onClick={logout}>Logout</button>
                    </div>
                </header>
                <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                    <p>Please use the Admin Panel to manage candidates and tasks.</p>
                    <button className="primary" onClick={() => navigate('/admin')}>Go to Admin Panel</button>
                </div>
            </div>
        );
    }

    // Candidate view
    return (
        <div className="container">
            <header className="welcome-header">
                <h1>VibeCode Jam</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span>Welcome, {user.username}</span>
                    <button className="text-btn" onClick={logout}>Logout</button>
                </div>
            </header>

            {loadingStatus && (
                <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                    <p>Loading...</p>
                </div>
            )}

            {!loadingStatus && !qualificationStatus?.passed && (
                <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                    <h2>Get Started</h2>
                    <p>Please complete the qualification test to determine your level and begin coding challenges.</p>
                    <button className="primary" onClick={() => navigate('/qualification')}>
                        Take Qualification Test
                    </button>
                </div>
            )}

            {!loadingStatus && qualificationStatus?.passed && (
                <>
                    <div className="level-info" style={{ textAlign: 'center', margin: '2rem 0' }}>
                        <h2>Your Level: <span className={`badge ${qualificationStatus.level}`}>{qualificationStatus.level}</span></h2>
                    </div>

                    {activeChallenge ? (
                        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                            <p>You have an active challenge in progress.</p>
                            <button className="primary" onClick={() => navigate(`/challenge/${activeChallenge.id}`)}>
                                Resume Challenge
                            </button>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                            <p>Ready to start your coding challenge? You will receive 3 tasks to solve.</p>
                            <button
                                className="primary"
                                onClick={handleStartChallenge}
                                disabled={loading}
                            >
                                {loading ? 'Starting...' : 'Start Challenge'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

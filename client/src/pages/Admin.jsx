import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Admin() {
    const [activeTab, setActiveTab] = useState('tasks');
    const [tasks, setTasks] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [challenges, setChallenges] = useState([]);

    // Task upload form
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        level: 'junior',
        examples: '',
        tests: ''
    });
    const [newCandidate, setNewCandidate] = useState({ username: '', password: '' });
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });
    const [candidates, setCandidates] = useState([]);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = () => {
        if (activeTab === 'tasks') {
            axios.get('http://localhost:3001/api/tasks')
                .then(res => setTasks(res.data.tasks))
                .catch(err => console.error(err));
        } else if (activeTab === 'candidates') {
            axios.get('http://localhost:3001/api/admin/candidates')
                .then(res => setCandidates(res.data.candidates))
                .catch(err => console.error(err));
        } else if (activeTab === 'challenges') {
            axios.get('http://localhost:3001/api/admin/challenges')
                .then(res => setChallenges(res.data.challenges))
                .catch(err => console.error(err));
        }
    };

    const handleTaskSubmit = async (e) => {
        e.preventDefault();
        try {
            // Parse JSON strings
            const examples = JSON.parse(newTask.examples);
            const tests = JSON.parse(newTask.tests);

            await axios.post('http://localhost:3001/api/tasks', {
                ...newTask,
                examples: JSON.stringify(examples),
                tests: JSON.stringify(tests)
            });

            alert('Task created successfully!');
            setNewTask({ title: '', description: '', level: 'junior', examples: '', tests: '' });
            loadData();
        } catch (err) {
            alert('Error creating task: ' + err.message);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:3001/api/register', {
                username: newCandidate.username,
                password: newCandidate.password,
                role: 'candidate'
            });
            alert('Candidate registered successfully!');
            setNewCandidate({ username: '', password: '' });
            if (activeTab === 'candidates') loadData();
        } catch (err) {
            alert('Error registering candidate: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        try {
            // We need the current username. Assuming admin is logged in as 'admin' or we get it from context/localstorage
            // For simplicity, let's ask for username in the form or assume 'admin' if it's the admin panel changing their own password.
            // But the requirement says "admin ... possibility to change it after login".
            // Let's assume this form is for the currently logged in admin to change THEIR password.
            // We need the username.
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                alert('Not logged in');
                return;
            }
            const user = JSON.parse(userStr);

            await axios.post('http://localhost:3001/api/change-password', {
                username: user.username,
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            alert('Password changed successfully!');
            setPasswordData({ oldPassword: '', newPassword: '' });
        } catch (err) {
            alert('Error changing password: ' + (err.response?.data?.error || err.message));
        }
    };

    const exportCSV = () => {
        // Simple CSV export of tasks
        const headers = ['ID', 'Title', 'Level', 'Description'];
        const rows = tasks.map(t => [t.id, t.title, t.level, t.description]);
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tasks.csv';
        a.click();
    };

    return (
        <div className="container">
            <h1>Admin Panel</h1>

            <div className="tabs">
                <button
                    className={activeTab === 'tasks' ? 'active' : ''}
                    onClick={() => setActiveTab('tasks')}
                >
                    Tasks
                </button>
                <button
                    className={activeTab === 'upload' ? 'active' : ''}
                    onClick={() => setActiveTab('upload')}
                >
                    Upload Task
                </button>
                <button
                    className={activeTab === 'candidates' ? 'active' : ''}
                    onClick={() => setActiveTab('candidates')}
                >
                    Candidates
                </button>
                <button
                    className={activeTab === 'challenges' ? 'active' : ''}
                    onClick={() => setActiveTab('challenges')}
                >
                    Challenge Results
                </button>
                <button
                    className={activeTab === 'password' ? 'active' : ''}
                    onClick={() => setActiveTab('password')}
                >
                    Change Password
                </button>
            </div>

            {activeTab === 'tasks' && (
                <div className="tasks-admin">
                    <div className="admin-header">
                        <h2>Task List</h2>
                        <button onClick={exportCSV}>Export CSV</button>
                    </div>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Level</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => (
                                <tr key={task.id}>
                                    <td>{task.id}</td>
                                    <td>{task.title}</td>
                                    <td><span className={`badge ${task.level}`}>{task.level}</span></td>
                                    <td>{task.description.substring(0, 60)}...</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'upload' && (
                <div className="upload-form">
                    <h2>Create New Task</h2>
                    <form onSubmit={handleTaskSubmit}>
                        <div className="form-group">
                            <label>Title</label>
                            <input
                                type="text"
                                value={newTask.title}
                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={newTask.description}
                                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Level</label>
                            <select
                                value={newTask.level}
                                onChange={e => setNewTask({ ...newTask, level: e.target.value })}
                            >
                                <option value="junior">Junior</option>
                                <option value="middle">Middle</option>
                                <option value="senior">Senior</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Examples (JSON)</label>
                            <textarea
                                value={newTask.examples}
                                onChange={e => setNewTask({ ...newTask, examples: e.target.value })}
                                placeholder='[{"input": "1, 2", "output": "3"}]'
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Tests (JSON)</label>
                            <textarea
                                value={newTask.tests}
                                onChange={e => setNewTask({ ...newTask, tests: e.target.value })}
                                placeholder='[{"code": "sum(1, 2)", "expected": 3}]'
                                required
                            />
                        </div>

                        <button type="submit" className="primary">Create Task</button>
                    </form>
                </div>
            )}

            {activeTab === 'candidates' && (
                <div className="candidates-admin">
                    <h2>Candidates</h2>
                    <div className="upload-form" style={{ marginBottom: '2rem' }}>
                        <h3>Register New Candidate</h3>
                        <form onSubmit={handleRegister}>
                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={newCandidate.username}
                                    onChange={e => setNewCandidate({ ...newCandidate, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={newCandidate.password}
                                    onChange={e => setNewCandidate({ ...newCandidate, password: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="primary">Register</button>
                        </form>
                    </div>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {candidates.map(c => (
                                <tr key={c.id}>
                                    <td>{c.id}</td>
                                    <td>{c.username}</td>
                                    <td>{c.role}</td>
                                    <td>{new Date(c.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'password' && (
                <div className="upload-form">
                    <h2>Change Password</h2>
                    <form onSubmit={handleChangePassword}>
                        <div className="form-group">
                            <label>Old Password</label>
                            <input
                                type="password"
                                value={passwordData.oldPassword}
                                onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="primary">Change Password</button>
                    </form>
                </div>
            )}

            {activeTab === 'challenges' && (
                <div className="challenges-admin">
                    <h2>Challenge Results</h2>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Candidate</th>
                                <th>Level</th>
                                <th>Start Time</th>
                                <th>Duration</th>
                                <th>Tasks Completed</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {challenges.map(challenge => {
                                const duration = challenge.end_time
                                    ? challenge.end_time - challenge.start_time
                                    : Date.now() - challenge.start_time;
                                const formatTime = (ms) => {
                                    const seconds = Math.floor(ms / 1000);
                                    const minutes = Math.floor(seconds / 60);
                                    const hours = Math.floor(minutes / 60);
                                    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
                                };
                                return (
                                    <tr key={challenge.id}>
                                        <td>{challenge.id}</td>
                                        <td>{challenge.username}</td>
                                        <td><span className={`badge ${challenge.level}`}>{challenge.level}</span></td>
                                        <td>{new Date(challenge.start_time).toLocaleString()}</td>
                                        <td>{formatTime(duration)}</td>
                                        <td>{challenge.tasks_completed}/{challenge.total_tasks}</td>
                                        <td>
                                            <span className={`badge ${challenge.status === 'completed' ? 'senior' : 'middle'}`}>
                                                {challenge.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

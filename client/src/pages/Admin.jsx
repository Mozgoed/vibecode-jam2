import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Admin() {
    const [activeTab, setActiveTab] = useState('tasks');
    const [tasks, setTasks] = useState([]);
    const [sessions, setSessions] = useState([]);

    // Task upload form
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        level: 'junior',
        examples: '',
        tests: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        axios.get('http://localhost:3001/api/tasks')
            .then(res => setTasks(res.data.tasks))
            .catch(err => console.error(err));

        // For MVP, we don't have a sessions list endpoint, so skip for now
        // axios.get('http://localhost:3001/api/sessions')
        //     .then(res => setSessions(res.data.sessions))
        //     .catch(err => console.error(err));
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
        </div>
    );
}

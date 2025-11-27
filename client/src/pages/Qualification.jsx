import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Qualification() {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get('http://localhost:3001/api/qualification/questions')
            .then(res => {
                setQuestions(res.data.questions);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    const handleSelect = (qId, optionIndex) => {
        setAnswers(prev => ({ ...prev, [qId]: optionIndex }));
    };

    const handleSubmit = async () => {
        try {
            const userStr = localStorage.getItem('user');
            const userId = userStr ? JSON.parse(userStr).user_id : null;

            const res = await axios.post('http://localhost:3001/api/qualification/submit', {
                answers,
                userId
            });
            const { level, score } = res.data;

            alert(`You scored ${score}/${questions.length}. Your level is: ${level.toUpperCase()}`);
            // Reload the page to force fresh data fetch
            window.location.href = '/';
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="container">Loading test...</div>;

    return (
        <div className="container">
            <h1>Qualification Test</h1>
            <p>Please answer the following questions to determine your level.</p>
            <div className="quiz">
                {questions.map((q, i) => (
                    <div key={q.id} className="question-card">
                        <h3>{i + 1}. {q.question}</h3>
                        <div className="options">
                            {q.options.map((opt, idx) => (
                                <div
                                    key={idx}
                                    className={`option ${answers[q.id] === idx ? 'selected' : ''}`}
                                    onClick={() => handleSelect(q.id, idx)}
                                >
                                    {opt}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <button className="primary" onClick={handleSubmit} disabled={Object.keys(answers).length < questions.length}>
                Submit Answers
            </button>
        </div>
    );
}

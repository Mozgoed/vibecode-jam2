import { Routes, Route, Navigate } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Qualification from './pages/Qualification';
import Workspace from './pages/Workspace';
import Report from './pages/Report';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Challenge from './pages/Challenge';
import ChallengeResults from './pages/ChallengeResults';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" />;
  }
  if (role && user.role !== role) {
    return <Navigate to="/" />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Welcome />} />
        <Route path="/qualification" element={<Qualification />} />
        <Route path="/workspace/:id" element={<Workspace />} />
        <Route path="/challenge/:id" element={<Challenge />} />
        <Route path="/challenge/:id/results" element={<ChallengeResults />} />
        <Route path="/report/:sessionId" element={<Report />} />
        <Route path="/admin" element={
          <ProtectedRoute role="admin">
            <Admin />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;

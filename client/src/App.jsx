import { Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Qualification from './pages/Qualification';
import Workspace from './pages/Workspace';
import Report from './pages/Report';
import Admin from './pages/Admin';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/qualification" element={<Qualification />} />
      <Route path="/workspace/:id" element={<Workspace />} />
      <Route path="/report/:sessionId" element={<Report />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}

export default App;

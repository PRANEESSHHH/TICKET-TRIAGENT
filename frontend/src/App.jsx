import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ChatAssistant from './components/ChatAssistant';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Processing from './pages/Processing';
import Results from './pages/Results';
import Details from './pages/Details';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppContent = () => {
  const location = useLocation();
  const isNoLayoutPage = location.pathname === '/' || location.pathname === '/login';

  if (isNoLayoutPage) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Core Layout Window */}
        <div className="flex-1 pl-64 flex flex-col min-h-screen">
          <Navbar />
          
          {/* Dashboard Content Panel */}
          <main className="flex-1 p-8 overflow-y-auto">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/processing" element={<Processing />} />
              <Route path="/results" element={<Results />} />
              <Route path="/ticket/:id" element={<Details />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>

        {/* Floatable AI Chat Assistant */}
        <ChatAssistant />
      </div>
    </ProtectedRoute>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;

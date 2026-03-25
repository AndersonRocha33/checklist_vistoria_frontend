import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/LoginPage.jsx';
import Apartments from './pages/Apartments.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/apartments"
          element={
            <ProtectedRoute>
              <Apartments />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
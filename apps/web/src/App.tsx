import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/main-layout';
import ProtectedRoute from './components/routing/protected-route';
import { AuthProvider } from './context/auth-context';
import { publicRoutes, protectedRoutes } from './routes/routes';
import LoginPage from './pages/login-page';
import HomePage from './pages/home-page';
import SignUpPage from './pages/signup-page';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth routes without MainLayout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/" element={<HomePage />} />

          {/* All other routes with MainLayout */}
          <Route path="*" element={
            <MainLayout>
              <Routes>
                {publicRoutes.filter(r => r.path !== '/login' && r.path !== '/signup' && r.path !== '/').map((route) => (
                  <Route 
                    key={route.path}
                    path={route.path}
                    element={route.element}
                  />
                ))}
                
                {protectedRoutes.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      <ProtectedRoute requiredRole={route.role}>
                        {route.element}
                      </ProtectedRoute>
                    }
                  />
                ))}
              </Routes>
            </MainLayout>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
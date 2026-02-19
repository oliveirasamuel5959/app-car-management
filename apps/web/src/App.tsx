import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/main-layout';
import ProtectedRoute from './components/routing/protected-route';
import { AuthProvider } from './context/auth-context';
import { publicRoutes, protectedRoutes } from './routes/routes';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout>
          <Routes>
            {publicRoutes.map((route) => (
              <Route 
                key={route.path}
                path={route.path}
                element={route.element}
              />
            ))}
            
            {/* {protectedRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <ProtectedRoute>
                    {route.element}
                  </ProtectedRoute>
                }
              />
            ))} */}
          </Routes>
        </MainLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;
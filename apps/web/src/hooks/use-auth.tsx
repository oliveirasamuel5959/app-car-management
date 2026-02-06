import { createContext, ReactNode, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const login = (username, role) => {
    const userData = { name: username, role };
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  }

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const { user, login, logout } = useContext(AuthContext);

  const isAuthorized = (requiredRole) => {
    return user && user.role === requiredRole;
  };

  return { user, login, logout, isAuthorized };
};

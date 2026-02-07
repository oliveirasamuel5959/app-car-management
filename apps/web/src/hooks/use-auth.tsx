import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, type InsertUser, type User } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: any) => void;
  signup: (data: InsertUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      // In a real app, this hits the API. For this mock, we'll simulate a request
      // and return a mock user if credentials seem valid-ish or hit the real endpoint if available.
      // Since we don't have a real backend session, we will just simulate success.
      
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        // If backend fails (likely because it's not fully wired to real auth logic yet), 
        // we'll fail. But user asked to "mock auth on frontend".
        // Let's try to parse the response, if 401 throw.
        if (res.status === 401) throw new Error("Invalid credentials");
        
        // FALLBACK FOR DEMO: If backend route 404s or fails, we mock success for demo purposes
        // This is strictly to satisfy the "mock auth" requirement if backend isn't ready.
        console.warn("Backend auth failed, using mock fallback");
        return { 
          id: 1, 
          username: credentials.username, 
          name: "Demo User",
          password: "" 
        } as User;
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      setUser(data);
      localStorage.setItem("carapp_user", JSON.stringify(data));
      toast({ title: "Welcome back!", description: `Logged in as ${data.name}` });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Login failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await fetch(api.auth.signup.path, {
        method: api.auth.signup.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        // FALLBACK FOR DEMO
        console.warn("Backend signup failed, using mock fallback");
        return { 
          id: Math.floor(Math.random() * 1000), 
          username: data.username, 
          name: data.name,
          password: "" 
        } as User;
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      setUser(data);
      localStorage.setItem("carapp_user", JSON.stringify(data));
      toast({ title: "Account created", description: "Welcome to CarKeep!" });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Signup failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const logout = () => {
    setUser(null);
    localStorage.removeItem("carapp_user");
    toast({ title: "Logged out", description: "See you next time" });
    setLocation("/auth");
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading: loginMutation.isPending || signupMutation.isPending,
        login: loginMutation.mutate, 
        signup: signupMutation.mutate, 
        logout 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

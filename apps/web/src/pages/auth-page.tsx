import { useAuth } from "@/hooks/use-auth";
import { Car } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { user, login, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary relative overflow-hidden">
        {/* Abstract Pattern Background */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-primary-foreground mb-8">
            <Car className="w-8 h-8" />
            <h1 className="text-2xl font-display font-bold">CarKeep</h1>
          </div>
          
          <div className="space-y-6 max-w-lg">
            <h2 className="text-5xl font-display font-bold text-primary-foreground leading-tight">
              Manage your vehicle with confidence.
            </h2>
            <p className="text-primary-foreground/80 text-lg">
              Find trusted workshops, track maintenance, and keep your car running smoothly. All in one place.
            </p>
          </div>
        </div>
        
        <div className="relative z-10 text-primary-foreground/60 text-sm">
          © 2024 CarKeep Inc. All rights reserved.
        </div>
      </div>

      {/* Right Side - Forms */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Enter your details to access your account</p>
          </div>

          <p>Form here</p>
          
        </div>
      </div>
    </div>
  );
}

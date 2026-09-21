import React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className = '' }: AuthCardProps) {
  return (
    <div
      className={`w-full h-full flex flex-col justify-center text-foreground transition-all ${className}`}
    >
      {children}
    </div>
  );
}

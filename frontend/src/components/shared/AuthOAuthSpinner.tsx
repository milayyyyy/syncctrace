import React from 'react';

interface AuthOAuthSpinnerProps {
  readonly message: string;
}

export const AuthOAuthSpinner: React.FC<AuthOAuthSpinnerProps> = ({ message }) => (
  <div className="min-h-screen min-h-dvh flex items-center justify-center bg-[#0a0f1e]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-white/20 border-t-[#F59E0B] rounded-full animate-spin" />
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  </div>
);

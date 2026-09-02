import React from 'react';
import { AppRoute, UserProfile } from '../../types';
import { LoginPage } from './LoginPage';

interface SignupPageProps {
  onNavigate: (route: AppRoute) => void;
  onSignupSuccess?: (user: UserProfile) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  onNavigate,
  onSignupSuccess
}) => {
  return (
    <LoginPage
      initialTab="signup"
      onNavigate={onNavigate}
      onLoginSuccess={(user) => {
        if (onSignupSuccess) onSignupSuccess(user);
        else onNavigate('dashboard');
      }}
    />
  );
};

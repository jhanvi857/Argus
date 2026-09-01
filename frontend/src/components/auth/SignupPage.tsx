import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { AppRoute, UserProfile } from '../../types';
import { AuthService } from '../../services/auth';

interface SignupPageProps {
  onNavigate: (route: AppRoute) => void;
  onSignupSuccess: (user: UserProfile) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  onNavigate,
  onSignupSuccess
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Please fill out all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const newUser = AuthService.signup({
      full_name: fullName.trim(),
      email: email.trim()
    });

    onSignupSuccess(newUser);
  };

  return (
    <div className="auth-page">
      {/* Decorative background blobs */}
      <div className="decorative-blob" style={{
        width: '500px', height: '500px', top: '-150px', right: '-100px', position: 'absolute'
      }} />
      <div className="decorative-blob" style={{
        width: '350px', height: '350px', bottom: '-80px', left: '-80px', position: 'absolute'
      }} />

      <div className="auth-card" style={{ maxWidth: '460px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--gray-900)',
              marginBottom: '10px',
              cursor: 'pointer'
            }}
            onClick={() => onNavigate('landing')}
          >
            Argus
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--gray-500)', lineHeight: 1.5 }}>
            Create your account and start
            <br />tracking opportunities.
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(173, 40, 49, 0.08)',
            border: '1px solid rgba(173, 40, 49, 0.15)',
            borderRadius: 'var(--border-radius-sm)',
            color: 'var(--primary)',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Full name</label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a password"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirm password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>

          {/* Benefits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {[
              'Monitor official career pages directly',
              'AI-powered project matching',
              'Track all your applications in one place'
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--gray-600)' }}>
                <CheckCircle2 size={14} color="var(--color-success)" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '14.5px', borderRadius: 'var(--border-radius-sm)', marginTop: '8px' }}
          >
            <span>Create account</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--gray-500)' }}>
          Already have an account?{' '}
          <button
            onClick={() => onNavigate('login')}
            style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );
};

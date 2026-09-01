import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AppRoute, UserProfile } from '../../types';
import { AuthService } from '../../services/auth';

interface LoginPageProps {
  onNavigate: (route: AppRoute) => void;
  onLoginSuccess: (user: UserProfile) => void;
  allUsers: UserProfile[];
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigate,
  onLoginSuccess,
  allUsers
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    const user = AuthService.login(email.trim(), password);
    if (user) {
      onLoginSuccess(user);
    } else {
      setErrorMsg('Account not found. Sign up to create a new profile.');
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    const newUser = AuthService.signup({
      full_name: fullName.trim(),
      email: email.trim()
    });
    onLoginSuccess(newUser);
  };

  const handleSelectUser = (user: UserProfile) => {
    AuthService.switchUser(user.id);
    onLoginSuccess(user);
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

      <div className="auth-card">
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--gray-900)',
              marginBottom: '8px',
              cursor: 'pointer'
            }}
            onClick={() => onNavigate('landing')}
          >
            Argus
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--gray-500)', lineHeight: 1.5 }}>
            Your next opportunity is closer
            <br />than you think.
          </p>
          <p style={{ fontSize: '12.5px', color: 'var(--gray-400)', marginTop: '6px' }}>
            Track jobs, get AI-powered matches, and build
            <br />your dream career.
          </p>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
          >
            Log in
          </button>
          <button
            className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => { setActiveTab('signup'); setErrorMsg(''); }}
          >
            Sign up
          </button>
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(173, 40, 49, 0.08)',
            border: '1px solid rgba(173, 40, 49, 0.15)',
            borderRadius: 'var(--border-radius-sm)',
            color: 'var(--primary)',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {errorMsg}
          </div>
        )}

        {/* ── Login Form ── */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ width: '100%', paddingRight: '40px' }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--gray-400)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--gray-600)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                Remember me
              </label>
              <button
                type="button"
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  cursor: 'pointer'
                }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14.5px', borderRadius: 'var(--border-radius-sm)' }}
            >
              Log in
            </button>
          </form>
        )}

        {/* ── Signup Form ── */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14.5px', borderRadius: 'var(--border-radius-sm)' }}
            >
              Create account
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="auth-divider">or</div>

        {/* Social Login */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="auth-social-btn" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span>Continue with Google</span>
          </button>
          <button className="auth-social-btn" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            <span>Continue with GitHub</span>
          </button>
        </div>

        {/* Saved Profiles (Quick Switch) */}
        {allUsers.length > 0 && activeTab === 'login' && (
          <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: '20px', paddingTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              Saved Profiles
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {allUsers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUser(u)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--gray-200)',
                    backgroundColor: 'var(--bg-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'var(--primary)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700
                    }}>
                      {u.full_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-900)' }}>
                        {u.full_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                        {u.email}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                    Select →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer text */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--gray-500)' }}>
          {activeTab === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setActiveTab('signup'); setErrorMsg(''); }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

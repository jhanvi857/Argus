import React, { useState } from 'react';
import { Eye, EyeOff, Mail, CheckCircle2, RefreshCw } from 'lucide-react';
import { AppRoute, UserProfile } from '../../types';
import { AuthService } from '../../services/auth';

interface LoginPageProps {
  onNavigate: (route: AppRoute) => void;
  onLoginSuccess: (user: UserProfile) => void;
  initialTab?: 'login' | 'signup';
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigate,
  onLoginSuccess,
  initialTab = 'login'
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Signup & OTP verification state
  const [fullName, setFullName] = useState('');
  const [signupStep, setSignupStep] = useState<'details' | 'otp'>('details');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    try {
      const user = AuthService.login(email.trim(), password);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(
        err.message || 'No verified account found for this email. Please sign up and verify your email first via OTP.'
      );
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setDevOtpHint(null);

    if (!fullName.trim() || !email.trim()) {
      setErrorMsg('Please provide your full name and genuine email address.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await AuthService.sendOtp(email.trim(), fullName.trim());
      setSuccessMsg(res.message);
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
      setSignupStep('otp');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code. Please check your email and try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      await AuthService.verifyOtpAndRegister(email.trim(), otpCode.trim());
      // Upon successful verification:
      // User is inserted into DB, now redirect to login tab so they sign in with verified credentials
      setSignupStep('details');
      setOtpCode('');
      setDevOtpHint(null);
      setActiveTab('login');
      setSuccessMsg('Email verified successfully! Your account is active. Please log in.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSendingOtp(true);
    try {
      const res = await AuthService.sendOtp(email.trim(), fullName.trim());
      setSuccessMsg(`New code dispatched: ${res.message}`);
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSocialClick = (provider: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setErrorMsg(
      `${provider} Single Sign-On requires domain OAuth setup. Please enter your email address to sign in or register with a one-time verification code.`
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF7F2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      padding: '40px 20px'
    }}>
      {/* Background Organic Curved Waves (Matching Right Panel) */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '55%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
        viewBox="0 0 700 800"
        fill="none"
        preserveAspectRatio="none"
      >
        {/* Soft Warm Peach/Sand Layer */}
        <path
          d="M320 0 C450 180 380 420 520 580 C600 680 660 740 700 800 L700 0 Z"
          fill="#F5E4D4"
          opacity="0.5"
        />
        {/* Deep Crimson/Burgundy Flowing Bottom-Right Wave */}
        <path
          d="M440 800 C470 650 560 520 700 480 L700 800 Z"
          fill="#8B1E2D"
        />
        <path
          d="M480 800 C500 660 580 540 700 500 L700 800 Z"
          fill="#9E1B32"
        />
      </svg>

      {/* Watermark text in bottom-right corner over the crimson curve */}
      <div style={{
        position: 'absolute',
        bottom: '36px',
        right: '42px',
        color: '#ffffff',
        fontSize: '13px',
        lineHeight: 1.45,
        fontWeight: 600,
        opacity: 0.95,
        textAlign: 'right',
        zIndex: 3,
        pointerEvents: 'none'
      }}>
        <div>Better</div>
        <div>opportunities.</div>
        <div style={{ marginTop: '2px' }}>Smarter</div>
        <div>matches.</div>
      </div>

      {/* Centered Auth Form Container */}
      <div style={{
        width: '100%',
        maxWidth: '430px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1
            onClick={() => onNavigate('landing')}
            style={{
              fontFamily: "'Newsreader', 'Lora', serif",
              fontSize: '40px',
              fontWeight: 700,
              color: '#ad2831',
              margin: '0 0 8px',
              cursor: 'pointer',
              letterSpacing: '-0.5px'
            }}
          >
            Argus
          </h1>

          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#1a1a16',
            margin: '0 0 6px'
          }}>
            Your next opportunity is closer than you think.
          </h2>

          <p style={{
            fontSize: '13.5px',
            color: '#6b6b5e',
            margin: 0,
            lineHeight: 1.45
          }}>
            Track jobs, get AI-powered matches, and build your dream career.
          </p>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(173, 40, 49, 0.08)',
            border: '1px solid rgba(173, 40, 49, 0.25)',
            borderRadius: '8px',
            color: '#ad2831',
            fontSize: '13px',
            lineHeight: 1.4,
            marginBottom: '16px'
          }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(46, 117, 89, 0.09)',
            border: '1px solid rgba(46, 117, 89, 0.25)',
            borderRadius: '8px',
            color: '#1e5e45',
            fontSize: '13px',
            lineHeight: 1.4,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Dev OTP Helper Banner */}
        {devOtpHint && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            color: '#92400e',
            fontSize: '12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span><strong>Development OTP:</strong> {devOtpHint}</span>
            <button
              type="button"
              onClick={() => setOtpCode(devOtpHint)}
              style={{
                border: 'none', background: '#fef3c7', color: '#78350f',
                padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '11px'
              }}
            >
              Auto-fill
            </button>
          </div>
        )}

        {/* Tab Switcher: Log in | Sign up */}
        {signupStep === 'details' && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '40px',
            borderBottom: '1px solid #ede8de',
            marginBottom: '22px'
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'login' ? '2.5px solid #ad2831' : '2.5px solid transparent',
                padding: '8px 16px',
                fontSize: '15px',
                fontWeight: activeTab === 'login' ? 700 : 500,
                color: activeTab === 'login' ? '#ad2831' : '#6b6b5e',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'signup' ? '2.5px solid #ad2831' : '2.5px solid transparent',
                padding: '8px 16px',
                fontSize: '15px',
                fontWeight: activeTab === 'signup' ? 700 : 500,
                color: activeTab === 'signup' ? '#ad2831' : '#6b6b5e',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Sign up
            </button>
          </div>
        )}

        {/* ── 1. LOG IN FORM ── */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#33332d', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1px solid #ede8de',
                  backgroundColor: '#ffffff',
                  fontSize: '14px',
                  color: '#1a1a16',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#33332d', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 14px',
                    borderRadius: '8px',
                    border: '1px solid #ede8de',
                    backgroundColor: '#ffffff',
                    fontSize: '14px',
                    color: '#1a1a16',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#8c8c7f',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#55554b' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#ad2831' }}
                />
                Remember me
              </label>
              <button
                type="button"
                style={{ border: 'none', background: 'transparent', color: '#6b6b5e', fontSize: '13px', cursor: 'pointer' }}
                onClick={() => alert('Password recovery instructions are dispatched to your verified email address.')}
              >
                Forgot password?
              </button>
            </div>

            {/* Solid Crimson Button */}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '13px 24px',
                backgroundColor: '#ad2831',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(173, 40, 49, 0.25)',
                marginTop: '4px',
                transition: 'background-color 0.15s ease'
              }}
            >
              Log in
            </button>

            {/* Divider: or */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ede8de' }} />
              <span style={{ fontSize: '12.5px', color: '#8c8c7f' }}>or</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ede8de' }} />
            </div>

            {/* Social Login Buttons */}
            <button
              type="button"
              onClick={() => handleSocialClick('Google')}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: '#ffffff',
                border: '1px solid #ede8de',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '14.5px',
                fontWeight: 500,
                color: '#1a1a16',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialClick('GitHub')}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: '#ffffff',
                border: '1px solid #ede8de',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '14.5px',
                fontWeight: 500,
                color: '#1a1a16',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#181717">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span>Continue with GitHub</span>
            </button>

            {/* Footer toggle */}
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#6b6b5e' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setActiveTab('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{ border: 'none', background: 'transparent', color: '#ad2831', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign up
              </button>
            </div>
          </form>
        )}

        {/* ── 2. SIGN UP STEP 1: Details ── */}
        {activeTab === 'signup' && signupStep === 'details' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#33332d', marginBottom: '6px' }}>
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Candidate name"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1px solid #ede8de',
                  backgroundColor: '#ffffff',
                  fontSize: '14px',
                  color: '#1a1a16',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#33332d', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1px solid #ede8de',
                  backgroundColor: '#ffffff',
                  fontSize: '14px',
                  color: '#1a1a16',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '11.5px', color: '#8c8c7f', marginTop: '4px', display: 'block' }}>
                We will send a 6-digit OTP to verify your email.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#33332d', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Create a password"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1px solid #ede8de',
                  backgroundColor: '#ffffff',
                  fontSize: '14px',
                  color: '#1a1a16',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSendingOtp}
              style={{
                width: '100%',
                padding: '13px 24px',
                backgroundColor: '#ad2831',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(173, 40, 49, 0.25)',
                marginTop: '4px'
              }}
            >
              {isSendingOtp ? 'Sending Verification Code...' : 'Sign up'}
            </button>

            {/* Divider: or */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ede8de' }} />
              <span style={{ fontSize: '12.5px', color: '#8c8c7f' }}>or</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ede8de' }} />
            </div>

            {/* Social Login Buttons */}
            <button
              type="button"
              onClick={() => handleSocialClick('Google')}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: '#ffffff',
                border: '1px solid #ede8de',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '14.5px',
                fontWeight: 500,
                color: '#1a1a16',
                cursor: 'pointer'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialClick('GitHub')}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: '#ffffff',
                border: '1px solid #ede8de',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '14.5px',
                fontWeight: 500,
                color: '#1a1a16',
                cursor: 'pointer'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#181717">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span>Continue with GitHub</span>
            </button>

            {/* Footer toggle */}
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#6b6b5e' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{ border: 'none', background: 'transparent', color: '#ad2831', fontWeight: 600, cursor: 'pointer' }}
              >
                Log in
              </button>
            </div>
          </form>
        )}

        {/* ── 3. SIGN UP STEP 2: OTP Verification ── */}
        {activeTab === 'signup' && signupStep === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              textAlign: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #ede8de',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                backgroundColor: 'rgba(173, 40, 49, 0.1)', color: '#ad2831',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px'
              }}>
                <Mail size={20} />
              </div>
              <p style={{ fontSize: '13px', color: '#55554b', margin: 0 }}>
                We sent a 6-digit verification code to<br />
                <strong style={{ color: '#1a1a16' }}>{email}</strong>
              </p>
            </div>

            <div>
              <label style={{ textAlign: 'center', display: 'block', fontSize: '13px', fontWeight: 500, color: '#33332d', marginBottom: '6px' }}>
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                maxLength={6}
                autoFocus
                required
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '24px',
                  letterSpacing: '8px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ede8de',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isVerifyingOtp || otpCode.length !== 6}
              style={{
                width: '100%',
                padding: '13px 24px',
                backgroundColor: '#ad2831',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(173, 40, 49, 0.25)'
              }}
            >
              {isVerifyingOtp ? 'Verifying & Creating Account...' : 'Verify Email & Continue to Login'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => { setSignupStep('details'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{ border: 'none', background: 'transparent', color: '#6b6b5e', cursor: 'pointer' }}
              >
                ← Change email
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isSendingOtp}
                style={{
                  border: 'none', background: 'transparent', color: '#ad2831',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <RefreshCw size={12} className={isSendingOtp ? 'animate-spin' : ''} />
                <span>Resend Code</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

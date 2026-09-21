import React, { useState } from 'react';
import { Eye, EyeOff, Mail, CheckCircle2, RefreshCw, Briefcase, Globe, GraduationCap, Check, X, Sliders } from 'lucide-react';
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

  // User Preferences State during Signup
  const [roleLevel, setRoleLevel] = useState<'all' | 'intern' | 'new_grad'>('all');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([
    'Software Engineer Intern',
    'Software Engineer New Grad'
  ]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([
    'India',
    'Remote / Anywhere'
  ]);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [customLocationInput, setCustomLocationInput] = useState('');

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter(r => r !== role));
      }
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleAddCustomRole = () => {
    const trimmed = customRoleInput.trim();
    if (trimmed && !selectedRoles.includes(trimmed)) {
      setSelectedRoles([...selectedRoles, trimmed]);
      setCustomRoleInput('');
    }
  };

  const toggleLocation = (loc: string) => {
    if (selectedLocations.includes(loc)) {
      if (selectedLocations.length > 1) {
        setSelectedLocations(selectedLocations.filter(l => l !== loc));
      }
    } else {
      setSelectedLocations([...selectedLocations, loc]);
    }
  };

  const handleAddCustomLocation = () => {
    const trimmed = customLocationInput.trim();
    if (trimmed && !selectedLocations.includes(trimmed)) {
      setSelectedLocations([...selectedLocations, trimmed]);
      setCustomLocationInput('');
    }
  };

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
      const preferences = {
        role_level: roleLevel,
        preferred_roles: selectedRoles,
        locations: selectedLocations,
        focus_areas: ['Backend', 'Infrastructure', 'Distributed Systems'],
        email_notifications_enabled: true,
        notification_email: email.trim()
      };
      const res = await AuthService.sendOtp(email.trim(), fullName.trim(), preferences);
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
      const preferences = {
        role_level: roleLevel,
        preferred_roles: selectedRoles,
        locations: selectedLocations,
        focus_areas: ['Backend', 'Infrastructure', 'Distributed Systems'],
        email_notifications_enabled: true,
        notification_email: email.trim()
      };
      await AuthService.verifyOtpAndRegister(email.trim(), otpCode.trim(), preferences);
      // Upon successful verification:
      // User is inserted into DB with custom preferences
      setSignupStep('details');
      setOtpCode('');
      setDevOtpHint(null);
      setActiveTab('login');
      setSuccessMsg('Email verified successfully! Your profile & preferences are registered. Please log in.');
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

            {/* ── Job & Matching Preferences ── */}
            <div style={{
              backgroundColor: '#faf8f5',
              border: '1px solid #ede8de',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              marginTop: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={16} color="#ad2831" />
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1a1a16' }}>
                    Job & Matching Preferences
                  </span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#8c8c7f', textTransform: 'uppercase' }}>
                  Customizable
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#6b6b5e', margin: 0, lineHeight: 1.4 }}>
                Argus scans official ATS pages matching only the roles and locations you specify.
              </p>

              {/* 1. Target Role Level */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#33332d', marginBottom: '8px' }}>
                  <GraduationCap size={14} color="#ad2831" />
                  <span>Target Role Level</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'all', label: 'All Levels' },
                    { id: 'intern', label: 'Internship' },
                    { id: 'new_grad', label: 'New Grad' }
                  ].map(lvl => {
                    const isSel = roleLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setRoleLevel(lvl.id as any)}
                        style={{
                          padding: '7px 8px',
                          borderRadius: '6px',
                          border: isSel ? '1.5px solid #ad2831' : '1px solid #ede8de',
                          backgroundColor: isSel ? 'rgba(173, 40, 49, 0.08)' : '#ffffff',
                          color: isSel ? '#ad2831' : '#55554b',
                          fontSize: '11.5px',
                          fontWeight: isSel ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {lvl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Target Roles */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#33332d', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Briefcase size={14} color="#ad2831" />
                    <span>Preferred Roles</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#8c8c7f', fontWeight: 400 }}>({selectedRoles.length} selected)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    'Software Engineer Intern',
                    'Software Engineer New Grad',
                    'Backend Engineer',
                    'Infrastructure / Systems',
                    'Full Stack Engineer',
                    'Site Reliability (SRE)'
                  ].map(role => {
                    const isSel = selectedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '9999px',
                          border: isSel ? '1.5px solid #ad2831' : '1px solid #ede8de',
                          backgroundColor: isSel ? 'rgba(173, 40, 49, 0.08)' : '#ffffff',
                          color: isSel ? '#ad2831' : '#55554b',
                          fontSize: '11.5px',
                          fontWeight: isSel ? 600 : 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSel && <Check size={12} strokeWidth={2.5} />}
                        <span>{role}</span>
                      </button>
                    );
                  })}
                  {/* Custom roles */}
                  {selectedRoles.filter(r => ![
                    'Software Engineer Intern',
                    'Software Engineer New Grad',
                    'Backend Engineer',
                    'Infrastructure / Systems',
                    'Full Stack Engineer',
                    'Site Reliability (SRE)'
                  ].includes(r)).map(r => (
                    <span
                      key={r}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '9999px',
                        border: '1.5px solid #ad2831',
                        backgroundColor: 'rgba(173, 40, 49, 0.08)',
                        color: '#ad2831',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Check size={12} strokeWidth={2.5} />
                      <span>{r}</span>
                      <X
                        size={12}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleRole(r)}
                      />
                    </span>
                  ))}
                </div>

                {/* Add Custom Role Input */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <input
                    type="text"
                    value={customRoleInput}
                    onChange={e => setCustomRoleInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomRole();
                      }
                    }}
                    placeholder="Add custom role..."
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #ede8de',
                      fontSize: '12px',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomRole}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #ede8de',
                      backgroundColor: '#ffffff',
                      color: '#1a1a16',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* 3. Target Locations */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#33332d', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Globe size={14} color="#ad2831" />
                    <span>Target Locations</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#8c8c7f', fontWeight: 400 }}>({selectedLocations.length} selected)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    'India',
                    'Remote / Anywhere',
                    'United States',
                    'United Kingdom',
                    'Singapore',
                    'Europe'
                  ].map(loc => {
                    const isSel = selectedLocations.includes(loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => toggleLocation(loc)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '9999px',
                          border: isSel ? '1.5px solid #ad2831' : '1px solid #ede8de',
                          backgroundColor: isSel ? 'rgba(173, 40, 49, 0.08)' : '#ffffff',
                          color: isSel ? '#ad2831' : '#55554b',
                          fontSize: '11.5px',
                          fontWeight: isSel ? 600 : 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSel && <Check size={12} strokeWidth={2.5} />}
                        <span>{loc}</span>
                      </button>
                    );
                  })}
                  {/* Custom locations */}
                  {selectedLocations.filter(l => ![
                    'India',
                    'Remote / Anywhere',
                    'United States',
                    'United Kingdom',
                    'Singapore',
                    'Europe'
                  ].includes(l)).map(l => (
                    <span
                      key={l}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '9999px',
                        border: '1.5px solid #ad2831',
                        backgroundColor: 'rgba(173, 40, 49, 0.08)',
                        color: '#ad2831',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Check size={12} strokeWidth={2.5} />
                      <span>{l}</span>
                      <X
                        size={12}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleLocation(l)}
                      />
                    </span>
                  ))}
                </div>

                {/* Add Custom Location Input */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <input
                    type="text"
                    value={customLocationInput}
                    onChange={e => setCustomLocationInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomLocation();
                      }
                    }}
                    placeholder="Add custom location (e.g. Canada, Germany, Bengaluru)..."
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #ede8de',
                      fontSize: '12px',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomLocation}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #ede8de',
                      backgroundColor: '#ffffff',
                      color: '#1a1a16',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
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

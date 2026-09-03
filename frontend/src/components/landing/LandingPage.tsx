import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  Play,
  Building2,
  Sparkles,
  ListChecks,
  Filter,
  Target,
  Wand2,
  BarChart3,
  Check,
  X,
  Send,
  ShieldCheck,
  Clock,
  Lock,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { AppRoute, UserProfile } from '../../types';
import { AuthService } from '../../services/auth';

interface LandingPageProps {
  onNavigate: (route: AppRoute) => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  currentUser: propUser,
  onLogout
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeUser = propUser || (AuthService.isAuthenticated() ? AuthService.getCurrentUser() : null);
  const userInitial = activeUser
    ? (activeUser.full_name || activeUser.email || 'C').charAt(0).toUpperCase()
    : '';

  const [mcpInput, setMcpInput] = useState<string>("What's pending for Goldman Sachs?");

  const handleMcpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcpInput.trim()) return;
    setMcpInput('');
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', color: '#1a1a16', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* 1. Top Navigation Bar */}
      <nav style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('landing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            textDecoration: 'none'
          }}
        >
          <span style={{
            fontFamily: "'Newsreader', 'Lora', serif",
            fontSize: '32px',
            fontWeight: 700,
            color: '#ad2831',
            letterSpacing: '-0.5px'
          }}>
            Argus
          </span>
        </div>

        {/* Center Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
          <a href="#hero" style={{ color: '#4a4a42', fontSize: '14.5px', fontWeight: 500, textDecoration: 'none' }}>
            Home
          </a>
          <a href="#features" style={{ color: '#4a4a42', fontSize: '14.5px', fontWeight: 500, textDecoration: 'none' }}>
            Features
          </a>
          <a href="#how-it-works" style={{ color: '#4a4a42', fontSize: '14.5px', fontWeight: 500, textDecoration: 'none' }}>
            How It Works
          </a>
          <a href="#about" style={{ color: '#4a4a42', fontSize: '14.5px', fontWeight: 500, textDecoration: 'none' }}>
            About
          </a>
        </div>

        {/* Right CTA / Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {activeUser ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 14px 6px 8px',
                  borderRadius: '9999px',
                  border: '1px solid #ede8de',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: userDropdownOpen ? '0 0 0 2px rgba(173, 40, 49, 0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease'
                }}
                aria-expanded={userDropdownOpen}
                aria-label="User menu"
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#ad2831',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif"
                }}>
                  {userInitial}
                </div>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1a1a16' }}>
                  {activeUser.full_name || activeUser.email.split('@')[0]}
                </span>
                <ChevronDown
                  size={15}
                  color="#737367"
                  style={{
                    transform: userDropdownOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease'
                  }}
                />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '240px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ede8de',
                  borderRadius: '12px',
                  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
                  padding: '8px',
                  zIndex: 1000
                }}>
                  <div style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #f2ede4',
                    marginBottom: '6px'
                  }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1a1a16' }}>
                      {activeUser.full_name || 'Candidate'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#737367', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeUser.email}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('dashboard');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '9px 12px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '6px',
                      color: '#1a1a16',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#faf6ee')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <LayoutDashboard size={16} color="#ad2831" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('settings');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '9px 12px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '6px',
                      color: '#1a1a16',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#faf6ee')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Settings size={16} color="#55554b" />
                    <span>Settings</span>
                  </button>

                  <div style={{ height: '1px', backgroundColor: '#f2ede4', margin: '6px 0' }} />

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onLogout) {
                        onLogout();
                      } else {
                        AuthService.logout();
                        onNavigate('landing');
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '9px 12px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '6px',
                      color: '#ad2831',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(173, 40, 49, 0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <LogOut size={16} color="#ad2831" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => onNavigate('login')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#33332d',
                  fontSize: '14.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Log In
              </button>

              <button
                onClick={() => onNavigate('signup')}
                style={{
                  backgroundColor: '#ad2831',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '9px 22px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(173, 40, 49, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section id="hero" style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '60px 32px 80px',
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        gap: '48px',
        alignItems: 'center',
        position: 'relative',
        height: '90vh'
      }}>
        {/* Left Hero Text */}
        <div>
          <div style={{
            fontSize: '12px',
            fontWeight: 800,
            color: '#ad2831',
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            marginBottom: '16px'
          }}>
            YOUR CAREER. OUR MONITOR.
          </div>

          <h1 style={{
            fontFamily: "'Newsreader', 'Lora', serif",
            fontSize: 'clamp(42px, 5vw, 62px)',
            fontWeight: 700,
            lineHeight: 1.12,
            color: '#1a1a16',
            letterSpacing: '-0.02em',
            marginBottom: '22px'
          }}>
            Track the right job openings. Match your skills. <span style={{ color: '#ad2831' }}>Move forward.</span>
          </h1>

          <p style={{
            fontSize: '16px',
            lineHeight: 1.6,
            color: '#616155',
            maxWidth: '520px',
            marginBottom: '36px'
          }}>
            Argus monitors official career pages, finds relevant opportunities, and uses AI to match them with your projects, skills and experience. So you can focus on what matters — getting hired.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate(activeUser ? 'dashboard' : 'signup')}
              style={{
                backgroundColor: '#ad2831',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '13px 26px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(173, 40, 49, 0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{activeUser ? 'Go to Dashboard' : 'Get Started Free'}</span>
              <ArrowRight size={16} />
            </button>

            <a
              href="#how-it-works"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#1a1a16',
                textDecoration: 'none',
                fontSize: '14.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#ad2831',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Play size={13} fill="white" style={{ marginLeft: '2px' }} />
              </div>
              <span>How It Works</span>
            </a>
          </div>
        </div>

        {/* Right Hero Graphic: Warm Aura Blob + Floating Card with Top Tab Badge */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {/* Warm Cream Peach Aura Blob */}
          <div style={{
            position: 'absolute',
            width: '460px',
            height: '440px',
            backgroundColor: '#fbf0dc',
            borderRadius: '52% 48% 60% 40% / 45% 55% 45% 55%',
            zIndex: 1,
            opacity: 0.85
          }} />

          {/* Radiating Sunburst Accent Lines Top Right */}
          <div style={{
            position: 'absolute',
            top: '-15px',
            right: '25px',
            width: '40px',
            height: '40px',
            zIndex: 2,
            opacity: 0.65
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <line x1="20" y1="5" x2="20" y2="1" stroke="#ad2831" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="31" y1="9" x2="34" y2="6" stroke="#ad2831" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="35" y1="20" x2="39" y2="20" stroke="#ad2831" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Main Floating Card Container */}
          <div style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: '430px',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0,0,0,0.04)'
          }}>
            {/* Top Red Pill Tab: New Relevant Posting */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '-8px',
              paddingRight: '20px',
              position: 'relative',
              zIndex: 12
            }}>
              <div style={{
                backgroundColor: '#ad2831',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                padding: '5px 14px',
                borderRadius: '14px',
                boxShadow: '0 2px 8px rgba(173, 40, 49, 0.3)',
                letterSpacing: '0.3px'
              }}>
                New Relevant Posting
              </div>
            </div>

            {/* Window Card Frame */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #ede8de',
              overflow: 'hidden'
            }}>
              {/* Window Header Bar (Dark Crimson) */}
              <div style={{
                backgroundColor: '#ad2831',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff', opacity: 0.9 }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff', opacity: 0.9 }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff', opacity: 0.9 }} />
              </div>

              {/* Job Listings List inside card */}
              <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column' }}>
                {/* 1. Google Listing */}
                <div
                  onClick={() => onNavigate('opportunities')}
                  style={{
                    padding: '14px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    borderBottom: '1px solid #f2eee6',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #eae5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ffffff',
                    flexShrink: 0
                  }}>
                    {/* Google G Logo */}
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1a1a16' }}>
                      Software Engineer Intern
                    </div>
                    <div style={{ fontSize: '12px', color: '#737367' }}>
                      Google • Mountain View, CA
                    </div>
                  </div>
                </div>

                {/* 2. Stripe Listing */}
                <div
                  onClick={() => onNavigate('opportunities')}
                  style={{
                    padding: '14px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    borderBottom: '1px solid #f2eee6',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#635bff',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '18px',
                    flexShrink: 0
                  }}>
                    S
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1a1a16' }}>
                      Backend Developer Intern
                    </div>
                    <div style={{ fontSize: '12px', color: '#737367' }}>
                      Stripe • Remote
                    </div>
                  </div>
                </div>

                {/* 3. Amazon Listing */}
                <div
                  onClick={() => onNavigate('opportunities')}
                  style={{
                    padding: '14px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #eae5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ffffff',
                    flexShrink: 0
                  }}>
                    {/* Amazon 'a' Logo */}
                    <span style={{ fontWeight: 800, fontSize: '18px', color: '#111111' }}>
                      a
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1a1a16' }}>
                      Software Engineer
                    </div>
                    <div style={{ fontSize: '12px', color: '#737367' }}>
                      Amazon • Seattle, WA
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. "Built for students, new grads and professionals" Highlight Bar */}
      <section style={{
        backgroundColor: '#faf5ec',
        borderTop: '1px solid #ebe5d8',
        borderBottom: '1px solid #ebe5d8',
        padding: '70px 32px'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: '23px',
            fontWeight: 800,
            color: '#1a1a16',
            marginBottom: '10px'
          }}>
            Built for students, new grads and professionals
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#6b6b5e',
            maxWidth: '680px',
            margin: '0 auto 48px',
            lineHeight: 1.5
          }}>
            Whether you're looking for an internship or a full-time role, Argus helps you stay ahead with the right opportunities and personalized recommendations.
          </p>

          {/* 3 Pill Highlight Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '28px',
            textAlign: 'left'
          }}>
            {/* Card 1: Monitor Official Career Pages */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#f6e4e6',
                color: '#ad2831',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Building2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a16', marginBottom: '4px' }}>
                  Monitor Official Career Pages
                </h3>
                <p style={{ fontSize: '13px', color: '#737367', lineHeight: 1.4 }}>
                  No aggregators. No stale data.
                </p>
              </div>
            </div>

            {/* Card 2: AI-Powered Matching */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#f6e4e6',
                color: '#ad2831',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a16', marginBottom: '4px' }}>
                  AI-Powered Matching
                </h3>
                <p style={{ fontSize: '13px', color: '#737367', lineHeight: 1.4 }}>
                  Get project and skill recommendations for each job.
                </p>
              </div>
            </div>

            {/* Card 3: Track Your Applications */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#f6e4e6',
                color: '#ad2831',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ListChecks size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a16', marginBottom: '4px' }}>
                  Track Your Applications
                </h3>
                <p style={{ fontSize: '13px', color: '#737367', lineHeight: 1.4 }}>
                  Stay organized and never miss an update.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "From job hunting to job intelligence" (Problem vs Argus Comparison) */}
      <section id="features" style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '90px 32px 80px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.3fr',
          gap: '56px',
          alignItems: 'center'
        }}>
          {/* Left Description & Stats */}
          <div>
            <h2 style={{
              fontFamily: "'Newsreader', 'Lora', serif",
              fontSize: '38px',
              fontWeight: 700,
              color: '#1a1a16',
              lineHeight: 1.15,
              marginBottom: '16px'
            }}>
              From job hunting<br />
              to <span style={{ color: '#ad2831' }}>job intelligence.</span>
            </h2>

            <p style={{
              fontSize: '15px',
              color: '#6b6b5e',
              lineHeight: 1.6,
              marginBottom: '40px',
              maxWidth: '420px'
            }}>
              Argus automates the tedious parts of your job search and gives you clarity on what truly matters.
            </p>

            {/* 3 Stats Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#ad2831', fontFamily: "'Newsreader', 'Lora', serif" }}>
                  15+
                </div>
                <div style={{ fontSize: '12.5px', color: '#737367', marginTop: '2px' }}>
                  Companies monitored
                </div>
              </div>

              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#ad2831', fontFamily: "'Newsreader', 'Lora', serif" }}>
                  24/7
                </div>
                <div style={{ fontSize: '12.5px', color: '#737367', marginTop: '2px' }}>
                  Monitoring & updates
                </div>
              </div>

              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#ad2831', fontFamily: "'Newsreader', 'Lora', serif" }}>
                  100%
                </div>
                <div style={{ fontSize: '12.5px', color: '#737367', marginTop: '2px' }}>
                  Official sources only
                </div>
              </div>
            </div>
          </div>

          {/* Right Comparison Box: The Old Way vs With Argus */}
          <div style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            {/* The Old Way Card */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #ede8de',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#8c8c7e',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                marginBottom: '18px'
              }}>
                THE OLD WAY
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  'Open multiple career pages',
                  'Find new postings',
                  'Read every JD',
                  'Decide if it\'s relevant',
                  'Pick projects manually',
                  'Choose a resume',
                  'Track everything separately'
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#737367' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#f5e4e4',
                      color: '#ad2831',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      <X size={10} strokeWidth={3} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Central Argus Icon Badge Connector */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#ad2831',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(173, 40, 49, 0.4)',
              border: '3px solid #ffffff'
            }}>
              <span style={{ fontFamily: "'Newsreader', serif", fontWeight: 700, fontSize: '16px' }}>
                A
              </span>
            </div>

            {/* With Argus Card */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #ad2831',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(173, 40, 49, 0.08)'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#ad2831',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                marginBottom: '18px'
              }}>
                WITH ARGUS
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  'Official ATS monitored',
                  'New relevant opportunity',
                  'Interested',
                  'Portfolio match',
                  'Recommended projects & skills',
                  'Apply with confidence',
                  'Track in one place'
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1a1a16', fontWeight: 500 }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#eaf4eb',
                      color: '#2e7d32',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. "How Argus works" 5-Step Process Section */}
      <section id="how-it-works" style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '60px 32px 90px',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontFamily: "'Newsreader', 'Lora', serif",
          fontSize: '36px',
          fontWeight: 700,
          color: '#1a1a16',
          marginBottom: '56px'
        }}>
          How <span style={{ color: '#ad2831' }}>Argus</span> works
        </h2>

        {/* 5 Steps Connected with Dotted Lines */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
          alignItems: 'flex-start',
          position: 'relative'
        }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#faf2f3',
              border: '1px solid #f0d5d7',
              color: '#ad2831',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Building2 size={22} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a16', marginBottom: '6px' }}>
              1. Monitor
            </h3>
            <p style={{ fontSize: '12.5px', color: '#737367', lineHeight: 1.45, maxWidth: '180px' }}>
              We monitor official career portals and ATS systems for new job postings.
            </p>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#faf2f3',
              border: '1px solid #f0d5d7',
              color: '#ad2831',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Filter size={22} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a16', marginBottom: '6px' }}>
              2. Filter
            </h3>
            <p style={{ fontSize: '12.5px', color: '#737367', lineHeight: 1.45, maxWidth: '180px' }}>
              We filter every posting against your preferences and surface only what matters.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#faf2f3',
              border: '1px solid #f0d5d7',
              color: '#ad2831',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Target size={22} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a16', marginBottom: '6px' }}>
              3. Interested
            </h3>
            <p style={{ fontSize: '12.5px', color: '#737367', lineHeight: 1.45, maxWidth: '180px' }}>
              You mark roles you're interested in with one simple click.
            </p>
          </div>

          {/* Step 4 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#faf2f3',
              border: '1px solid #f0d5d7',
              color: '#ad2831',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Wand2 size={22} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a16', marginBottom: '6px' }}>
              4. Match
            </h3>
            <p style={{ fontSize: '12.5px', color: '#737367', lineHeight: 1.45, maxWidth: '180px' }}>
              Argus analyzes the JD against your projects, experience, skills and recommends what to lead with.
            </p>
          </div>

          {/* Step 5 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#faf2f3',
              border: '1px solid #f0d5d7',
              color: '#ad2831',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <BarChart3 size={22} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a16', marginBottom: '6px' }}>
              5. Track
            </h3>
            <p style={{ fontSize: '12.5px', color: '#737367', lineHeight: 1.45, maxWidth: '180px' }}>
              Track every application stage, OA, interviews and outcomes — in one place.
            </p>
          </div>
        </div>
      </section>

      {/* 6. "Your tracker can answer back" (MCP Conversational Intelligence) */}
      <section id="mcp" style={{
        maxWidth: '1160px',
        margin: '0 auto 80px',
        padding: '0 32px'
      }}>
        <div style={{
          backgroundColor: '#faf6ee',
          borderRadius: '24px',
          border: '1px solid #eee8dc',
          padding: '48px 56px',
          display: 'grid',
          gridTemplateColumns: '1fr 1.35fr',
          gap: '48px',
          alignItems: 'center'
        }}>
          {/* Left Text */}
          <div>
            <h2 style={{
              fontFamily: "'Newsreader', 'Lora', serif",
              fontSize: '34px',
              fontWeight: 700,
              color: '#1a1a16',
              lineHeight: 1.18,
              marginBottom: '14px'
            }}>
              Your tracker can<br />
              <span style={{ color: '#ad2831' }}>answer back.</span>
            </h2>

            <p style={{
              fontSize: '14.5px',
              color: '#6b6b5e',
              lineHeight: 1.55,
              marginBottom: '24px',
              maxWidth: '380px'
            }}>
              Ask your AI assistant for real-time updates from Argus using natural language.
            </p>

            <a
              href="#mcp"
              onClick={(e) => {
                e.preventDefault();
                alert('Argus MCP Server exposes get_pending(), get_recent_postings(), get_match() as callable tools.');
              }}
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#ad2831',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Learn about MCP integration</span>
              <ArrowRight size={14} />
            </a>
          </div>

          {/* Right Chat Bubble Simulation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Bubble 1: You (User) */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '14px 18px',
              border: '1px solid #ede8de',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#355e8c',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  A
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#8c8c7e', marginRight: '8px' }}>You</span>
                  <span style={{ fontSize: '13.5px', color: '#1a1a16', fontWeight: 500 }}>
                    What's pending for Goldman Sachs?
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#a8a89b' }}>10:42 AM</span>
            </div>

            {/* Bubble 2: Argus Bot Response */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '18px 20px',
              border: '1px solid #ede8de',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#ad2831',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    fontFamily: "'Newsreader', serif"
                  }}>
                    A
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a16' }}>Argus</span>
                </div>
                <span style={{ fontSize: '11px', color: '#a8a89b' }}>10:43 AM</span>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a16', marginBottom: '8px' }}>
                3 relevant opportunities.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px', color: '#525246', marginBottom: '12px' }}>
                <div>• SWE Summer Analyst — <strong style={{ color: '#ad2831' }}>New</strong></div>
                <div>• Software Engineering Intern — <strong>Interested</strong></div>
                <div>• Technology Analyst — <strong>Applied</strong></div>
              </div>

              <div style={{
                fontSize: '12.5px',
                color: '#1a1a16',
                borderTop: '1px solid #f2ede4',
                paddingTop: '8px'
              }}>
                <strong>Next action:</strong> Complete the SWE Summer Analyst application.
              </div>
            </div>

            {/* Interactive Query Input Bar */}
            <form onSubmit={handleMcpSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={mcpInput}
                onChange={e => setMcpInput(e.target.value)}
                placeholder="Ask Argus anything about your applications..."
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  border: '1px solid #ede8de',
                  borderRadius: '8px',
                  padding: '9px 14px',
                  fontSize: '12.5px',
                  color: '#1a1a16',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#ad2831',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 7. About Section (What this website is doing & background) */}
      <section id="about" style={{
        backgroundColor: '#faf5ec',
        borderTop: '1px solid #ebe5d8',
        borderBottom: '1px solid #ebe5d8',
        padding: '80px 32px'
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#ad2831',
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>
              ABOUT ARGUS
            </div>
            <h2 style={{
              fontFamily: "'Newsreader', 'Lora', serif",
              fontSize: '36px',
              fontWeight: 700,
              color: '#1a1a16',
              lineHeight: 1.2
            }}>
              Vigilance on Official Career Pages. <span style={{ color: '#ad2831' }}>Zero Aggregator Noise.</span>
            </h2>
            <p style={{
              fontSize: '15px',
              color: '#6b6b5e',
              maxWidth: '720px',
              margin: '14px auto 0',
              lineHeight: 1.6
            }}>
              Argus was built to eliminate the tedious manual cycle of checking dozens of company career portals, wading through stale aggregators, and guessing how to tailor applications.
            </p>
          </div>

          {/* 3 Core Pillars */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '26px'
          }}>
            {/* Pillar 1 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '30px 26px',
              border: '1px solid #ebe5d8',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#f6e4e6',
                color: '#ad2831',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Building2 size={22} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a16', margin: 0 }}>
                Direct ATS Vigilance
              </h3>
              <p style={{ fontSize: '13.5px', color: '#6b6b5e', lineHeight: 1.6, margin: 0 }}>
                Argus monitors official career pages (Workday, Greenhouse, Lever, and custom APIs) on a scheduled cadence — bypassing stale job boards, duplicate postings, and recruiter spam.
              </p>
            </div>

            {/* Pillar 2 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '30px 26px',
              border: '1px solid #ebe5d8',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#f6e4e6',
                color: '#ad2831',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={22} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a16', margin: 0 }}>
                Grounded Portfolio Matcher
              </h3>
              <p style={{ fontSize: '13.5px', color: '#6b6b5e', lineHeight: 1.6, margin: 0 }}>
                When you find an opportunity, our LangGraph AI analyzes the JD against your actual verified projects and skills — recommending exactly which bullets and keywords to emphasize with zero hallucination.
              </p>
            </div>

            {/* Pillar 3 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '30px 26px',
              border: '1px solid #ebe5d8',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#f6e4e6',
                color: '#ad2831',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ListChecks size={22} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a16', margin: 0 }}>
                Interview & Prep Intelligence
              </h3>
              <p style={{ fontSize: '13.5px', color: '#6b6b5e', lineHeight: 1.6, margin: 0 }}>
                Track every stage from OA to Offer, log technical questions, and view verified peer debriefs alongside curated external prep from LeetCode Discuss and TeamBlind.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Culminating CTA Page Banner & Guarantees */}
      <section style={{
        maxWidth: '1160px',
        margin: '80px auto 80px',
        padding: '0 32px'
      }}>
        <div style={{
          backgroundColor: '#faf5ec',
          borderRadius: '24px',
          border: '1px solid #eee8dc',
          padding: '56px 60px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '40px',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle Warm Background Blur Glow Accent */}
          <div style={{
            position: 'absolute',
            right: '-60px',
            bottom: '-60px',
            width: '280px',
            height: '280px',
            backgroundColor: '#fce4c4',
            borderRadius: '50%',
            opacity: 0.6,
            zIndex: 1,
            pointerEvents: 'none'
          }} />

          {/* Left Heading */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h2 style={{
              fontFamily: "'Newsreader', 'Lora', serif",
              fontSize: '36px',
              fontWeight: 700,
              color: '#1a1a16',
              lineHeight: 1.15
            }}>
              Spend less time searching.<br />
              Spend more time <span style={{ color: '#ad2831' }}>applying.</span>
            </h2>
          </div>

          {/* Right Action & Value Callouts */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p style={{
              fontSize: '14.5px',
              color: '#616155',
              marginBottom: '20px',
              lineHeight: 1.4
            }}>
              Let Argus watch the career pages.<br />
              You focus on getting the role.
            </p>

            <button
              onClick={() => onNavigate(activeUser ? 'dashboard' : 'signup')}
              style={{
                backgroundColor: '#ad2831',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '13px 26px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(173, 40, 49, 0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px'
              }}
            >
              <span>{activeUser ? 'Go to Dashboard' : 'Start tracking jobs'}</span>
              <ArrowRight size={16} />
            </button>

            {/* 3 Guarantees row below button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '12px',
              color: '#737367',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} color="#8c8c7e" />
                <span>Free to set up</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} color="#8c8c7e" />
                <span>Cancel anytime</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} color="#8c8c7e" />
                <span>Your data, your control</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Comprehensive Footer */}
      <footer style={{
        borderTop: '1px solid #ebe5d8',
        backgroundColor: '#ffffff',
        padding: '64px 32px 40px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr',
            gap: '40px',
            marginBottom: '48px'
          }}>
            {/* Brand Column */}
            <div>
              <div style={{
                fontFamily: "'Newsreader', 'Lora', serif",
                fontSize: '26px',
                fontWeight: 700,
                color: '#ad2831',
                marginBottom: '12px'
              }}>
                Argus
              </div>
              <p style={{ fontSize: '13px', color: '#737367', lineHeight: 1.5, maxWidth: '280px', marginBottom: '16px' }}>
                The official career ATS vigilance monitor & JD-to-portfolio matcher for software engineers.
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="btn-secondary btn-sm"
                style={{ fontSize: '11.5px', padding: '6px 12px' }}
              >
                Sign In to Platform →
              </button>
            </div>

            {/* Product */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1a1a16', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
                Product
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#737367' }}>
                <a href="#hero" style={{ color: 'inherit', textDecoration: 'none' }}>ATS Monitor</a>
                <a href="#how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>Portfolio Matcher</a>
                <a href="#how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>Application Tracker</a>
                <a href="#mcp" style={{ color: 'inherit', textDecoration: 'none' }}>MCP Server Tools</a>
              </div>
            </div>

            {/* Target ATS Portals */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1a1a16', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
                Monitored Portals
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#737367' }}>
                <span>Citadel (Greenhouse)</span>
                <span>Goldman Sachs (Custom)</span>
                <span>Stripe (Greenhouse)</span>
                <span>Google (Career API)</span>
                <span>Tower Research (Lever)</span>
              </div>
            </div>

            {/* Resources */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1a1a16', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
                Resources
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#737367' }}>
                <a href="#about" style={{ color: 'inherit', textDecoration: 'none' }}>About Argus</a>
                <a href="#how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>How it works</a>
                <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Ground Truth Grounding</a>
                <a href="#mcp" style={{ color: 'inherit', textDecoration: 'none' }}>MCP Integration</a>
                <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('login')}>Candidate Sign in</span>
              </div>
            </div>

            {/* Security & Data */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1a1a16', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
                Privacy & Data
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#737367' }}>
                <span>Local Database Storage</span>
                <span>Zero Hallucination Policy</span>
                <span>Isolated Candidate Profiles</span>
                <span>Terms of Service</span>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Row */}
          <div style={{
            borderTop: '1px solid #f2eee6',
            paddingTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12.5px',
            color: '#8c8c7e'
          }}>
            <div>
              © 2026 Argus Systems. All rights reserved.
            </div>
            <div>
              Built for students, interns & new-grads aiming for top-tier SWE roles.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

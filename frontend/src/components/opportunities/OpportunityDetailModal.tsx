import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ArrowLeft,
  MapPin,
  Loader2,
  RotateCw,
  ExternalLink,
  Check,
  MessageSquare,
  FileText
} from 'lucide-react';
import { Posting, MatchResult, UserProfile, PostingStatus, Application, ApplicationStage, ReferralStatus, ExperienceLogVisibility, AuthorDisplayMode } from '../../types';
import { ArgusDataService } from '../../services/api';
import { ExperiencesPanel } from '../experiences/ExperiencesPanel';

const formatLocation = (loc: any): string => {
  if (!loc) return 'Multiple Locations';
  const str = typeof loc === 'string' ? loc : loc.name || '';
  if (!str.trim()) return 'Multiple Locations';

  // Format long location lists (e.g. "Berkeley, California, United States; San Francisco, California, United States")
  const parts = str.split(';').map((p: string) => p.trim()).filter(Boolean);
  const cleanParts = parts.map((p: string) =>
    p.replace(/,\s*United States/gi, '')
      .replace(/,\s*California/gi, ', CA')
      .replace(/,\s*New York/gi, ', NY')
      .replace(/,\s*Washington/gi, ', WA')
      .replace(/,\s*Texas/gi, ', TX')
      .replace(/,\s*Massachusetts/gi, ', MA')
      .replace(/,\s*Illinois/gi, ', IL')
  );

  if (cleanParts.length > 2) {
    return `${cleanParts[0]} +${cleanParts.length - 1} locations`;
  }
  return cleanParts.join(' · ');
};

const FormattedRationale: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const parseInlineMarkdown = (str: string) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} style={{ color: 'var(--gray-900)', fontWeight: 600 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--gray-700)', lineHeight: 1.55 }}>
      {lines.map((line, idx) => {
        const isBullet = line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ');
        const cleanText = isBullet ? line.replace(/^[-*•]\s+/, '') : line;

        if (isBullet) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 800, lineHeight: 1.4 }}>•</span>
              <div style={{ flex: 1 }}>{parseInlineMarkdown(cleanText)}</div>
            </div>
          );
        }
        return <p key={idx} style={{ margin: 0 }}>{parseInlineMarkdown(cleanText)}</p>;
      })}
    </div>
  );
};

const getCompanyLogoClass = (name: string) => {
  const key = name.toLowerCase().replace(/\s+/g, '');
  const map: Record<string, string> = {
    google: 'company-logo-google',
    stripe: 'company-logo-stripe',
    amazon: 'company-logo-amazon',
    microsoft: 'company-logo-microsoft',
    'goldmansachs': 'company-logo-goldman',
    'jpmorganchase': 'company-logo-jpmorgan',
    citadel: 'company-logo-citadel',
  };
  return map[key] || 'company-logo-default';
};

interface OpportunityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  posting: Posting | null;
  currentUser: UserProfile;
  initialTab?: 'jd' | 'matcher' | 'application';
  onOpenPortfolio?: () => void;
  onApplicationSaved: () => void;
  onStatusChange: (postingId: number, status: PostingStatus) => void;
}

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  isOpen,
  onClose,
  posting,
  currentUser,
  initialTab: _initialTab = 'matcher',
  onOpenPortfolio,
  onApplicationSaved,
  onStatusChange
}) => {
  if (!isOpen || !posting) return null;

  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matchStep, setMatchStep] = useState<string>('idle');
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'experiences'>('details');

  // Application State
  const [currentApp, setCurrentApp] = useState<Application | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [appStage, setAppStage] = useState<ApplicationStage>('applied');
  const [appReferral, setAppReferral] = useState<ReferralStatus>('none');
  const [appResume, setAppResume] = useState<string>('');
  const [appOaDate, setAppOaDate] = useState<string>('');
  const [appInterviewDate, setAppInterviewDate] = useState<string>('');
  const [appInterviewRound, setAppInterviewRound] = useState<string>('');
  const [appInterviewQuestions, setAppInterviewQuestions] = useState<string>('');
  const [appExperienceReflection, setAppExperienceReflection] = useState<string>('');
  const [appOfferDetails, setAppOfferDetails] = useState<string>('');
  const [appNotes, setAppNotes] = useState<string>('');
  const [appVisibility, setAppVisibility] = useState<ExperienceLogVisibility>('private');
  const [appAuthorDisplayMode, setAppAuthorDisplayMode] = useState<AuthorDisplayMode>('named');
  const [appConfidentialityAck, setAppConfidentialityAck] = useState<boolean>(false);
  const [isSavedToast, setIsSavedToast] = useState<boolean>(false);

  useEffect(() => {
    if (!posting) return;
    const existing = ArgusDataService.getApplication(posting.id);
    if (existing) {
      setCurrentApp(existing);
      setAppStage(existing.stage);
      setAppReferral(existing.referral_status);
      setAppResume(existing.resume_version || '');
      setAppOaDate(existing.oa_date || '');
      setAppInterviewDate(existing.interview_date || '');
      setAppInterviewRound(existing.interview_round || '');
      setAppInterviewQuestions(existing.interview_questions || '');
      setAppExperienceReflection(existing.experience_reflection || '');
      setAppOfferDetails(existing.offer_details || '');
      setAppNotes(existing.notes || '');
      setAppVisibility(existing.visibility || 'private');
      setAppAuthorDisplayMode(existing.author_display_mode || 'named');
      setAppConfidentialityAck(existing.confidentiality_ack || false);
    } else {
      setCurrentApp(null);
      setAppStage('applied');
      setAppReferral('none');
      setAppResume('');
      setAppOaDate('');
      setAppInterviewDate('');
      setAppInterviewRound('');
      setAppInterviewQuestions('');
      setAppExperienceReflection('');
      setAppOfferDetails('');
      setAppNotes('');
      setAppVisibility('private');
      setAppAuthorDisplayMode('named');
      setAppConfidentialityAck(false);
    }
  }, [posting?.id]);

  useEffect(() => {
    runMatchComputation(false);
  }, [posting?.id]);

  const runMatchComputation = async (force = false) => {
    if (!posting) return;

    if (!force) {
      const cached = ArgusDataService.getCachedMatchForPosting(posting.id);
      if (cached) {
        setMatchResult(cached);
        setIsMatching(false);
        return;
      }
    }

    setIsMatching(true);
    setMatchStep('Synthesizing fit with Groq LLM against portfolio...');

    const result = await ArgusDataService.getMatchForPostingAsync(posting, force);
    setMatchResult(result);
    setIsMatching(false);
  };

  const handleQuickStageChange = (newStage: ApplicationStage) => {
    if (!posting) return;
    setAppStage(newStage);

    const saved = ArgusDataService.saveApplication({
      posting_id: posting.id,
      user_id: currentUser.id,
      stage: newStage,
      referral_status: appReferral,
      resume_version: appResume,
      oa_date: appOaDate || null,
      interview_date: appInterviewDate || null,
      interview_round: appInterviewRound,
      interview_questions: appInterviewQuestions,
      experience_reflection: appExperienceReflection,
      offer_details: appOfferDetails,
      notes: appNotes,
      visibility: appVisibility,
      author_display_mode: appAuthorDisplayMode,
      confidentiality_ack: appConfidentialityAck,
      applied_date: currentApp?.applied_date || new Date().toISOString().split('T')[0]
    });

    setCurrentApp(saved);
    onStatusChange(posting.id, newStage === 'interested' ? 'reviewed' : 'applied');
    onApplicationSaved();
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const handleSaveExperienceLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posting) return;

    if (appVisibility === 'shared' && !appConfidentialityAck) {
      alert('Sharing with community requires confirming that this does not violate any confidentiality agreement (NDA).');
      return;
    }

    const saved = ArgusDataService.saveApplication({
      posting_id: posting.id,
      user_id: currentUser.id,
      stage: appStage,
      referral_status: appReferral,
      resume_version: appResume,
      oa_date: appOaDate || null,
      interview_date: appInterviewDate || null,
      interview_round: appInterviewRound,
      interview_questions: appInterviewQuestions,
      experience_reflection: appExperienceReflection,
      offer_details: appOfferDetails,
      notes: appNotes,
      visibility: appVisibility,
      author_display_mode: appAuthorDisplayMode,
      confidentiality_ack: appConfidentialityAck,
      applied_date: currentApp?.applied_date || new Date().toISOString().split('T')[0]
    });

    // Also push to experience_logs
    try {
      await ArgusDataService.saveExperienceLog({
        company_id: posting.company_id,
        posting_id: posting.id,
        stage: appStage,
        technical_questions: appInterviewQuestions,
        takeaways: appExperienceReflection,
        offer_details: appOfferDetails,
        oa_date: appOaDate || null,
        interview_date: appInterviewDate || null,
        interview_round: appInterviewRound,
        visibility: appVisibility,
        author_display_mode: appAuthorDisplayMode,
        verified_applicant: true,
        confidentiality_ack: appConfidentialityAck
      });
    } catch (err) {
      console.warn('Experience log save error:', err);
    }

    setCurrentApp(saved);
    onStatusChange(posting.id, appStage === 'interested' ? 'reviewed' : 'applied');
    onApplicationSaved();
    setIsLogModalOpen(false);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const requiredSkills = posting.required_skills || ['Backend', 'Distributed Systems', 'Go', 'Linux', 'Cloud'];

  const jdText = posting.raw_description || `We are looking for a passionate software engineer intern to join our infrastructure team. You will work on scalable systems that power ${posting.company_name}'s products and services, and collaborate with experienced engineers to build solutions that impact millions of users.`;

  const responsibilities = [
    'Design and implement scalable backend services',
    'Work with cross-functional teams',
    'Write clean, maintainable and testable code',
    'Participate in code reviews and design discussions'
  ];

  const formattedLocation = formatLocation(posting.location);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '1080px', height: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Close Button */}
        <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
          <button className="btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top Bar: Back Link & Quick Confirmation Toast */}
          <div style={{ padding: '16px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="back-link" onClick={onClose} style={{ margin: 0 }}>
              <ArrowLeft size={14} />
              <span>Back to Opportunities</span>
            </button>
            {isSavedToast && (
              <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} /> Application status updated!
              </span>
            )}
          </div>

          {/* Main content area - scrollable */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 28px 28px' }}>
            {/* ── UNIFIED CLEAN HEADER ── */}
            <div style={{
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--gray-200)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {/* Row 1: Company Badge, Location, Team, and Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div className={`company-logo company-logo-sm ${getCompanyLogoClass(posting.company_name)}`}
                    style={{ borderRadius: 'var(--border-radius-sm)', width: '32px', height: '32px', fontSize: '14px' }}>
                    {posting.company_name.charAt(0)}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--gray-900)' }}>
                    {posting.company_name}
                  </span>
                  <span style={{ color: 'var(--gray-300)' }}>•</span>
                  <span style={{ fontSize: '13px', color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} color="var(--gray-400)" />
                    {formattedLocation}
                  </span>
                  {posting.team && (
                    <>
                      <span style={{ color: 'var(--gray-300)' }}>•</span>
                      <span className="badge-tag" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {posting.team}
                      </span>
                    </>
                  )}
                </div>

                {/* Primary Action Buttons on Right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {posting.url && (
                    <a
                      href={posting.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="btn-secondary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        borderRadius: 'var(--border-radius-full)',
                        fontSize: '12.5px',
                        padding: '6px 14px'
                      }}
                    >
                      <span>Apply on ATS</span>
                      <ExternalLink size={13} />
                    </a>
                  )}

                  <button
                    className="btn-primary btn-sm"
                    onClick={() => {
                      onStatusChange(posting.id, 'reviewed');
                      runMatchComputation(true);
                    }}
                    style={{ borderRadius: 'var(--border-radius-full)', fontSize: '12.5px', padding: '6px 14px' }}
                  >
                    <span>Run AI Match</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Full-width Clean Job Title */}
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gray-900)', margin: '0', lineHeight: 1.3 }}>
                {posting.title}
              </h1>

              {/* Row 3: Sleek Stage Tracker Strip */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                background: 'var(--gray-50)',
                padding: '8px 12px',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--gray-200)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)' }}>
                    Application Stage:
                  </span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'applied', label: 'Applied' },
                      { id: 'oa', label: 'OA Assessment' },
                      { id: 'interview', label: 'Interview' },
                      { id: 'offer', label: 'Offer 🎉' }
                    ].map(s => {
                      const isSelected = currentApp?.stage === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleQuickStageChange(s.id as ApplicationStage)}
                          style={{
                            padding: '3px 10px',
                            borderRadius: 'var(--border-radius-full)',
                            border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--gray-200)',
                            background: isSelected ? 'var(--primary)' : 'var(--bg-white)',
                            color: isSelected ? '#ffffff' : 'var(--gray-600)',
                            fontSize: '11.5px',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer'
                          }}
                        >
                          {isSelected && '✓ '}{s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setActiveModalTab('experiences');
                      setIsLogModalOpen(true);
                    }}
                    className="btn-ghost btn-sm"
                    style={{
                      fontSize: '12px',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px'
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>{currentApp?.interview_questions ? 'Edit Interview Log' : '+ Log Interview Experience'}</span>
                  </button>
                </div>
              </div>

              {/* Row 4: View Tab Switcher (Details vs Experiences) */}
              <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid var(--gray-200)',
                paddingBottom: '2px',
                marginTop: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('details')}
                  style={{
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeModalTab === 'details' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                    color: activeModalTab === 'details' ? 'var(--primary)' : 'var(--gray-500)',
                    fontWeight: activeModalTab === 'details' ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Sparkles size={13} />
                  <span>Role Overview & AI Portfolio Match</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('experiences')}
                  style={{
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeModalTab === 'experiences' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                    color: activeModalTab === 'experiences' ? 'var(--primary)' : 'var(--gray-500)',
                    fontWeight: activeModalTab === 'experiences' ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <MessageSquare size={13} />
                  <span>Company Experiences & Prep</span>
                </button>
              </div>
            </div>

            {/* Content Tabs */}
            {activeModalTab === 'experiences' ? (
              <ExperiencesPanel
                company={{ id: posting.company_id, name: posting.company_name }}
                currentUser={currentUser}
                onOpenLogModal={() => setIsLogModalOpen(true)}
              />
            ) : (
              /* ── TWO-COLUMN GRID (Job Info Left, AI Match Right) ── */
              <div className="opportunity-detail-grid">
                {/* ── LEFT: Clean Job Details ── */}
                <div>
                  {/* Skill Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                    {requiredSkills.map((skill, i) => (
                      <span key={i} className="badge-tag-navy" style={{
                        fontSize: '11.5px',
                        padding: '3px 10px',
                        borderRadius: 'var(--border-radius-full)'
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Logged Interview & Experience Callout if exists */}
                  {currentApp && (currentApp.interview_questions || currentApp.experience_reflection || currentApp.offer_details) && (
                    <div style={{
                      marginBottom: '20px',
                      padding: '12px 14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 'var(--border-radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FileText size={13} color="var(--primary)" />
                          Your Interview Notes & Logged Questions
                        </span>
                        <button
                          onClick={() => setIsLogModalOpen(true)}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Edit
                        </button>
                      </div>
                      {currentApp.interview_questions && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                          <strong>Questions:</strong> {currentApp.interview_questions}
                        </p>
                      )}
                      {currentApp.experience_reflection && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                          <strong>Takeaways:</strong> {currentApp.experience_reflection}
                        </p>
                      )}
                      {currentApp.offer_details && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                          🎉 <strong>Offer:</strong> {currentApp.offer_details}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Job Description */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '8px' }}>
                      Job Description
                    </h3>
                    <p style={{ fontSize: '13.5px', color: 'var(--gray-600)', lineHeight: 1.7, margin: 0 }}>
                      {jdText}
                    </p>
                  </div>

                  {/* Key Responsibilities */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '8px' }}>
                      Key Responsibilities
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: 'var(--gray-600)', lineHeight: 1.7 }}>
                      {responsibilities.map((resp, i) => (
                        <li key={i}>{resp}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* ── RIGHT: Ground Truth AI Match & Project Recommendations ── */}
                <div>
                  <div className="card-surface" style={{ padding: '20px', borderRadius: 'var(--border-radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={16} color="var(--primary)" />
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>
                          AI Portfolio Match
                        </h3>
                      </div>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => runMatchComputation(true)}
                        disabled={isMatching}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        <RotateCw size={12} className={isMatching ? 'spin-animation' : ''} />
                        <span>{isMatching ? 'Matching...' : 'Re-run Match'}</span>
                      </button>
                    </div>

                    {isMatching ? (
                      <div style={{ textAlign: 'center', padding: '36px 12px' }}>
                        <Loader2 size={24} className="spin-animation" color="var(--primary)" style={{ margin: '0 auto 12px' }} />
                        <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0 }}>
                          {matchStep}
                        </p>
                      </div>
                    ) : matchResult ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Overall Fit Score */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          background: 'var(--gray-50)',
                          borderRadius: 'var(--border-radius-sm)',
                          border: '1px solid var(--gray-200)'
                        }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--gray-700)' }}>
                            Portfolio Fit Score
                          </span>
                          <span style={{
                            fontSize: '18px',
                            fontWeight: 800,
                            color: matchResult.overall_fit_score >= 80 ? '#15803d' : matchResult.overall_fit_score >= 60 ? '#b45309' : '#dc2626'
                          }}>
                            {matchResult.overall_fit_score}%
                          </span>
                        </div>

                        {/* Rationale */}
                        {matchResult.overall_fit_summary && (
                          <div>
                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '6px' }}>
                              Strategic Rationale:
                            </div>
                            <FormattedRationale text={matchResult.overall_fit_summary} />
                          </div>
                        )}

                        {/* Recommended Projects */}
                        {matchResult.recommendations && matchResult.recommendations.length > 0 && (
                          <div>
                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '8px' }}>
                              Recommended Projects to Lead With:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {matchResult.recommendations.map((rec, index) => (
                                <div
                                  key={rec.projectId}
                                  style={{
                                    padding: '12px 14px',
                                    borderRadius: 'var(--border-radius-sm)',
                                    border: '1px solid var(--gray-200)',
                                    background: '#ffffff'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <span style={{
                                      fontFamily: 'var(--font-mono)',
                                      fontSize: '12px',
                                      fontWeight: 800,
                                      color: 'var(--primary)',
                                      minWidth: '16px'
                                    }}>
                                      {index + 1}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--gray-900)' }}>
                                        {rec.project.name}
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', margin: '3px 0' }}>
                                        {rec.project.tech_stack.slice(0, 3).map((t, i) => (
                                          <span key={i} className="badge-tag" style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                      <p style={{ fontSize: '11px', color: 'var(--gray-600)', lineHeight: 1.35, margin: '2px 0 4px' }}>
                                        {rec.rationale}
                                      </p>

                                      {/* Quantified Resume Bullets */}
                                      {rec.recommendedBullets && rec.recommendedBullets.length > 0 && (
                                        <div style={{
                                          marginTop: '4px',
                                          padding: '6px 8px',
                                          background: 'var(--gray-50)',
                                          borderRadius: 'var(--border-radius-sm)',
                                          border: '1px solid var(--gray-200)'
                                        }}>
                                          <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '2px' }}>
                                            Featured Resume Bullet:
                                          </div>
                                          <ul style={{ margin: 0, paddingLeft: '12px', fontSize: '10.5px', color: 'var(--gray-700)', lineHeight: 1.35 }}>
                                            {rec.recommendedBullets.slice(0, 2).map((b, bi) => (
                                              <li key={bi}>{b}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          className="btn-primary"
                          onClick={onOpenPortfolio}
                          style={{
                            width: '100%',
                            marginTop: '14px',
                            borderRadius: 'var(--border-radius-full)',
                            padding: '9px',
                            fontSize: '13px'
                          }}
                        >
                          View Full Match in Portfolio
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px' }}>
                        <Sparkles size={20} color="var(--gray-400)" style={{ margin: '0 auto 6px' }} />
                        <p style={{ fontSize: '12.5px', color: 'var(--gray-500)' }}>
                          Click "Run AI Match" to evaluate your portfolio fit.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DEDICATED CLEAN EXPERIENCE LOG MODAL ── */}
      {isLogModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setIsLogModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--gray-900)' }}>
                  Log Interview Experience: {posting.company_name}
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                  {posting.title}
                </div>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => setIsLogModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExperienceLog}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px 24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--gray-800)', margin: 0 }}>
                    Application Stage
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { id: 'applied', label: 'Applied' },
                      { id: 'oa', label: 'OA Assessment' },
                      { id: 'interview', label: 'Interview' },
                      { id: 'offer', label: 'Offer 🎉' },
                      { id: 'rejected', label: 'Rejected' }
                    ].map(s => {
                      const isSelected = appStage === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setAppStage(s.id as ApplicationStage)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 'var(--border-radius-full)',
                            border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--gray-300)',
                            background: isSelected ? 'rgba(173, 40, 49, 0.1)' : 'var(--bg-white)',
                            color: isSelected ? 'var(--primary)' : 'var(--gray-700)',
                            fontSize: '12px',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected && '✓ '}{s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--gray-800)', margin: 0 }}>
                    Technical Questions Asked (OA / Interview)
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={appInterviewQuestions}
                    onChange={e => setAppInterviewQuestions(e.target.value)}
                    placeholder="e.g. 1. LeetCode 42 Trapping Rain Water. 2. System design for rate limiting. 3. Concurrency lock-free queue in Go."
                    style={{ fontSize: '12.5px', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--gray-800)', margin: 0 }}>
                    Interview Experience & Key Takeaways
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={appExperienceReflection}
                    onChange={e => setAppExperienceReflection(e.target.value)}
                    placeholder="e.g. Interview went great! Interviewer liked the NioFlow project architecture. Need to practice write-ahead log compaction before Round 2."
                    style={{ fontSize: '12.5px', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                {appStage === 'offer' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                    <label className="form-label" style={{ color: '#15803d', fontWeight: 700, fontSize: '12.5px', margin: 0 }}>
                      🎉 Offer Details & Compensation
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={appOfferDetails}
                      onChange={e => setAppOfferDetails(e.target.value)}
                      placeholder="e.g. $65/hr stipend, $2,500/mo housing allowance, deadline Nov 15"
                      style={{ fontSize: '12.5px', border: '1.5px solid #86efac', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--gray-800)', margin: 0 }}>
                      OA Assessment Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={appOaDate}
                      onChange={e => setAppOaDate(e.target.value)}
                      style={{ fontSize: '12.5px', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--gray-800)', margin: 0 }}>
                      Interview Date / Round
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={appInterviewRound}
                      onChange={e => setAppInterviewRound(e.target.value)}
                      placeholder="e.g. Oct 14 - Technical Round 1"
                      style={{ fontSize: '12.5px', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* ── CONSENT & COMMUNITY SHARING FLOW ── */}
                <div style={{
                  padding: '12px 14px',
                  background: appVisibility === 'shared' ? 'rgba(173,40,49,0.03)' : 'var(--gray-50)',
                  borderRadius: 'var(--border-radius-md)',
                  border: appVisibility === 'shared' ? '1.5px solid rgba(173,40,49,0.25)' : '1px solid var(--gray-200)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={appVisibility === 'shared'}
                      onChange={e => {
                        const isShared = e.target.checked;
                        setAppVisibility(isShared ? 'shared' : 'private');
                        if (!isShared) {
                          setAppConfidentialityAck(false);
                        }
                      }}
                      style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }}
                    />
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--gray-900)' }}>
                      Share with Argus community (helps other candidates prepare)
                    </span>
                  </label>

                  {appVisibility === 'shared' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '22px' }}>
                      <div>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '4px' }}>
                          Post as:
                        </span>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer', color: 'var(--gray-800)' }}>
                            <input
                              type="radio"
                              name="authorDisplayMode"
                              checked={appAuthorDisplayMode === 'named'}
                              onChange={() => setAppAuthorDisplayMode('named')}
                              style={{ accentColor: 'var(--primary)' }}
                            />
                            <span>{currentUser.full_name || 'My Name'} (Named)</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer', color: 'var(--gray-800)' }}>
                            <input
                              type="radio"
                              name="authorDisplayMode"
                              checked={appAuthorDisplayMode === 'anonymous'}
                              onChange={() => setAppAuthorDisplayMode('anonymous')}
                              style={{ accentColor: 'var(--primary)' }}
                            />
                            <span>Anonymous</span>
                          </label>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>
                          Your raw email address is never exposed publicly.
                        </div>
                      </div>

                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        cursor: 'pointer',
                        background: '#ffffff',
                        padding: '8px 10px',
                        borderRadius: 'var(--border-radius-sm)',
                        border: !appConfidentialityAck ? '1px solid #fca5a5' : '1px solid #86efac'
                      }}>
                        <input
                          type="checkbox"
                          checked={appConfidentialityAck}
                          onChange={e => setAppConfidentialityAck(e.target.checked)}
                          style={{ accentColor: 'var(--primary)', marginTop: '2px', width: '14px', height: '14px' }}
                          required={appVisibility === 'shared'}
                        />
                        <span style={{ fontSize: '11.5px', color: 'var(--gray-700)', lineHeight: 1.4 }}>
                          I confirm sharing this doesn't violate any confidentiality agreement or NDA I signed with {posting.company_name}.
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsLogModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={appVisibility === 'shared' && !appConfidentialityAck}
                  style={{
                    opacity: (appVisibility === 'shared' && !appConfidentialityAck) ? 0.6 : 1,
                    cursor: (appVisibility === 'shared' && !appConfidentialityAck) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span>Save Experience Log</span>
                  <Check size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

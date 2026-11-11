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
  FileText,
  Download,
  AlertCircle
} from 'lucide-react';
import { Posting, MatchResult, UserProfile, PostingStatus, Application, ApplicationStage, ReferralStatus, ExperienceLogVisibility, AuthorDisplayMode, ResumeVersion } from '../../types';
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
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'ats_fit' | 'experiences'>('details');

  // ATS Score & Rankings State
  const [atsScoreData, setAtsScoreData] = useState<any | null>(null);
  const [atsRankings, setAtsRankings] = useState<any[]>([]);
  const [bulletSuggestions, setBulletSuggestions] = useState<any[]>([]);
  const [selectedAtsResumeId, setSelectedAtsResumeId] = useState<number | string | ''>('');
  const [loadingAts, setLoadingAts] = useState<boolean>(false);

  // Application State
  const [currentApp, setCurrentApp] = useState<Application | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [appStage, setAppStage] = useState<ApplicationStage>('applied');
  const [appReferral, setAppReferral] = useState<ReferralStatus>('none');
  const [appResume, setAppResume] = useState<string>('');
  const [appResumeVersionId, setAppResumeVersionId] = useState<number | null>(null);
  const [availableResumes, setAvailableResumes] = useState<ResumeVersion[]>([]);
  const [isBackfillMode, setIsBackfillMode] = useState<boolean>(false);
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
    setAvailableResumes(ArgusDataService.getResumes());
    ArgusDataService.fetchResumes().then(res => setAvailableResumes(res)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!posting) return;
    const existing = ArgusDataService.getApplication(posting.id);
    if (existing) {
      setCurrentApp(existing);
      setAppStage(existing.stage);
      setAppReferral(existing.referral_status);
      setAppResume(existing.resume_version || '');
      setAppResumeVersionId(existing.resume_version_id || null);
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
      setIsBackfillMode(false);
    } else {
      setCurrentApp(null);
      setAppStage('applied');
      setAppReferral('none');
      const defaultRes = availableResumes[0];
      setAppResume(defaultRes?.label || defaultRes?.name || '');
      setAppResumeVersionId(defaultRes ? Number(defaultRes.id) : null);
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
      setIsBackfillMode(false);
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

  const loadAtsScoreAndRankings = async (resumeId?: number | string, force = false) => {
    if (!posting) return;
    setLoadingAts(true);
    try {
      const [scoreRes, rankingsRes, suggRes] = await Promise.all([
        ArgusDataService.fetchAtsScore(posting.id, resumeId, force),
        ArgusDataService.fetchAtsRankings(posting.id),
        ArgusDataService.fetchBulletSuggestions(posting.id, resumeId)
      ]);
      if (scoreRes) {
        setAtsScoreData(scoreRes);
        if (!selectedAtsResumeId && scoreRes.resume_id) {
          setSelectedAtsResumeId(scoreRes.resume_id);
        }
      }
      if (rankingsRes) setAtsRankings(rankingsRes);
      if (suggRes?.suggestions) setBulletSuggestions(suggRes.suggestions);
    } catch (e) {
      console.warn('Failed to load ATS scoring data:', e);
    } finally {
      setLoadingAts(false);
    }
  };

  useEffect(() => {
    if (posting && activeModalTab === 'ats_fit' && !atsScoreData) {
      loadAtsScoreAndRankings();
    }
  }, [posting, activeModalTab]);

  const handleQuickStageChange = (newStage: ApplicationStage) => {
    if (!posting) return;

    if (newStage === 'applied' && !currentApp?.resume_version_id && !appResumeVersionId) {
      setAppStage('applied');
      setIsLogModalOpen(true);
      return;
    }

    setAppStage(newStage);

    const targetResumeId = appResumeVersionId || currentApp?.resume_version_id;
    const targetResumeLabel = appResume || currentApp?.resume_version;

    const saved = ArgusDataService.saveApplication({
      posting_id: posting.id,
      user_id: currentUser.id,
      stage: newStage,
      referral_status: appReferral,
      resume_version_id: targetResumeId,
      resume_version: targetResumeLabel,
      ats_score_at_apply: currentApp?.ats_score_at_apply || (matchResult ? matchResult.overall_fit_score : null),
      applied_at: currentApp?.applied_at || (newStage === 'applied' ? new Date().toISOString() : null),
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

    if (['applied', 'oa', 'interview', 'offer'].includes(appStage) && !appResumeVersionId && !currentApp?.resume_version_id) {
      alert('Please select a resume version from your library to pin to this application.');
      return;
    }

    const targetResumeId = isBackfillMode 
      ? appResumeVersionId 
      : (currentApp?.resume_version_id || appResumeVersionId);
    const targetResumeLabel = isBackfillMode
      ? appResume
      : (currentApp?.resume_version || appResume);

    const saved = ArgusDataService.saveApplication({
      posting_id: posting.id,
      user_id: currentUser.id,
      stage: appStage,
      referral_status: appReferral,
      resume_version_id: targetResumeId,
      resume_version: targetResumeLabel,
      ats_score_at_apply: currentApp?.ats_score_at_apply || (matchResult ? matchResult.overall_fit_score : null),
      applied_at: currentApp?.applied_at || (['applied', 'oa', 'interview', 'offer'].includes(appStage) ? new Date().toISOString() : null),
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
                      { id: 'offer', label: 'Offer' }
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

              {/* Row 3.5: Pinned Application Submission Status */}
              {currentApp && ['applied', 'oa', 'interview', 'offer'].includes(currentApp.stage) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'rgba(173,40,49,0.04)',
                  padding: '9px 14px',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid rgba(173,40,49,0.18)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-navy)' }}>
                      Submitted: <strong>{currentApp.resume_version || 'Resume Version'}</strong>
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                      ({currentApp.applied_at ? new Date(currentApp.applied_at).toLocaleDateString() : (currentApp.applied_date || 'Recently')})
                    </span>
                    {currentApp.ats_score_at_apply !== undefined && currentApp.ats_score_at_apply !== null && (
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        color: 'var(--primary)',
                        background: 'rgba(173,40,49,0.08)',
                        padding: '2px 8px',
                        borderRadius: 'var(--border-radius-full)'
                      }}>
                        ATS est. {currentApp.ats_score_at_apply}/100
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {currentApp.resume_version_id ? (
                      <a
                        href={ArgusDataService.getResumeDownloadUrl(currentApp.resume_version_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary btn-sm"
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 10px' }}
                      >
                        <Download size={13} />
                        <span>Download Pinned PDF</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        style={{ color: '#b45309', background: '#fef3c7', fontSize: '11.5px', padding: '3px 8px' }}
                        onClick={() => {
                          setIsBackfillMode(true);
                          setIsLogModalOpen(true);
                        }}
                      >
                        Backfill Resume
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                  onClick={() => {
                    setActiveModalTab('ats_fit');
                    if (!atsScoreData) loadAtsScoreAndRankings();
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeModalTab === 'ats_fit' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                    color: activeModalTab === 'ats_fit' ? 'var(--primary)' : 'var(--gray-500)',
                    fontWeight: activeModalTab === 'ats_fit' ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FileText size={13} />
                  <span>ATS-Fit Score & Suggestions</span>
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
            ) : activeModalTab === 'ats_fit' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 1. Transparent Disclaimer */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertCircle size={18} color="#0284c7" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.45 }}>
                    <strong>Estimate Only:</strong> {atsScoreData?.disclaimer || "This ATS-fit score is an ESTIMATE based on heuristic formatting checks and keyword extraction. It does not represent any specific company's proprietary ATS screening algorithm."}
                  </div>
                </div>

                {/* 2. Resume Selection & Recompute Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'var(--bg-white)',
                  padding: '14px 18px',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--gray-200)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-800)' }}>Active Resume:</label>
                    <select
                      className="form-select"
                      value={selectedAtsResumeId ? String(selectedAtsResumeId) : ''}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedAtsResumeId(val);
                        loadAtsScoreAndRankings(val);
                      }}
                      style={{ fontSize: '12.5px', minWidth: '220px' }}
                    >
                      {availableResumes.map(r => (
                        <option key={r.id} value={String(r.id)}>
                          {r.label || r.file_name} {r.file_size ? `(${r.file_size})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => loadAtsScoreAndRankings(selectedAtsResumeId, true)}
                    disabled={loadingAts}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RotateCw size={13} className={loadingAts ? 'animate-spin' : ''} />
                    <span>{loadingAts ? 'Computing...' : 'Recompute Score'}</span>
                  </button>
                </div>

                {loadingAts && !atsScoreData ? (
                  <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--gray-500)' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>Evaluating ATS-fit against Job Description...</p>
                  </div>
                ) : atsScoreData ? (
                  <>
                    {/* 3. High-level Score Overview */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '14px'
                    }}>
                      <div className="card-surface" style={{ padding: '18px', borderLeft: '4px solid var(--primary)', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
                          Overall ATS Est. Score
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--primary)', marginTop: '4px' }}>
                          {atsScoreData.score}
                          <span style={{ fontSize: '18px', color: 'var(--gray-400)', fontWeight: 500 }}>/100</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: atsScoreData.score >= 75 ? '#15803d' : atsScoreData.score >= 50 ? '#b45309' : '#b91c1c', marginTop: '4px' }}>
                          {atsScoreData.score >= 75 ? 'Strong ATS Alignment' : atsScoreData.score >= 50 ? 'Moderate Fit (Needs Tailoring)' : 'Low Keyword Fit'}
                        </div>
                      </div>

                      <div className="card-surface" style={{ padding: '18px', borderLeft: '4px solid #2563eb' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
                          Deterministic Checks (30%)
                        </div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>
                          {atsScoreData.breakdown?.deterministic?.score ?? 0}
                          <span style={{ fontSize: '15px', color: 'var(--gray-400)', fontWeight: 500 }}>/30</span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--gray-600)', marginTop: '4px' }}>
                          Layout, headings, contact info & bullet metrics
                        </div>
                      </div>

                      <div className="card-surface" style={{ padding: '18px', borderLeft: '4px solid #16a34a' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
                          Keyword Alignment (70%)
                        </div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                          {atsScoreData.breakdown?.keywords?.score ?? 0}
                          <span style={{ fontSize: '15px', color: 'var(--gray-400)', fontWeight: 500 }}>/70</span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--gray-600)', marginTop: '4px' }}>
                          Req: {atsScoreData.breakdown?.keywords?.required_score ?? 0}/50 • Pref: {atsScoreData.breakdown?.keywords?.preferred_score ?? 0}/20
                        </div>
                      </div>
                    </div>

                    {/* 4. Detailed Breakdown Sections */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                      {/* Left: Deterministic Rules */}
                      <div className="card-surface" style={{ padding: '16px 18px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>
                          Deterministic ATS Quality Checks
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <span><strong>Parse & Density:</strong></span>
                              <span>{atsScoreData.breakdown?.deterministic?.parse_quality?.score ?? 0}/10 pts</span>
                            </div>
                            {(atsScoreData.breakdown?.deterministic?.parse_quality?.warnings || []).length > 0 ? (
                              <ul style={{ margin: '4px 0 0 16px', padding: 0, color: '#b45309', fontSize: '11.5px' }}>
                                {atsScoreData.breakdown.deterministic.parse_quality.warnings.map((w: string, i: number) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: '#15803d' }}>Clean extractable text structure</span>
                            )}
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <span><strong>Core Sections:</strong></span>
                              <span>{atsScoreData.breakdown?.deterministic?.sections?.score ?? 0}/8 pts</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {(atsScoreData.breakdown?.deterministic?.sections?.found || []).map((sec: string) => (
                                <span key={sec} style={{ fontSize: '11px', background: '#f0fdf4', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  ✓ {sec}
                                </span>
                              ))}
                              {(atsScoreData.breakdown?.deterministic?.sections?.missing || []).map((sec: string) => (
                                <span key={sec} style={{ fontSize: '11px', background: '#fef2f2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  ✗ Missing {sec}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <span><strong>Contact Info:</strong></span>
                              <span>{atsScoreData.breakdown?.deterministic?.contact_info?.score ?? 0}/4 pts</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {(atsScoreData.breakdown?.deterministic?.contact_info?.found || []).map((c: string) => (
                                <span key={c} style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  ✓ {c}
                                </span>
                              ))}
                              {(atsScoreData.breakdown?.deterministic?.contact_info?.missing || []).map((c: string) => (
                                <span key={c} style={{ fontSize: '11px', background: '#fef2f2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  ✗ Missing {c}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <span><strong>Bullet Quantification:</strong></span>
                              <span>{atsScoreData.breakdown?.deterministic?.quantification?.score ?? 0}/8 pts</span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--gray-600)' }}>
                              {Math.round((atsScoreData.breakdown?.deterministic?.quantification?.ratio ?? 0) * 100)}% of bullets include metrics ({atsScoreData.breakdown?.deterministic?.quantification?.quantified_bullets ?? 0}/{atsScoreData.breakdown?.deterministic?.quantification?.total_bullets ?? 0})
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Keyword Match */}
                      <div className="card-surface" style={{ padding: '16px 18px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>
                          Required & Preferred Keywords
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', marginBottom: '6px' }}>
                              Matched Required Keywords ({atsScoreData.breakdown?.keywords?.required_matched?.length ?? 0}):
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {(atsScoreData.breakdown?.keywords?.required_matched || []).map((kw: string) => (
                                <span key={kw} style={{ fontSize: '11.5px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                  {kw}
                                </span>
                              ))}
                              {(!atsScoreData.breakdown?.keywords?.required_matched || atsScoreData.breakdown.keywords.required_matched.length === 0) && (
                                <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>None matched</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c', marginBottom: '6px' }}>
                              Missing Required Keywords ({atsScoreData.breakdown?.keywords?.required_missing?.length ?? 0}):
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {(atsScoreData.breakdown?.keywords?.required_missing || []).map((kw: string) => (
                                <span key={kw} style={{ fontSize: '11.5px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                  MISSING: {kw}
                                </span>
                              ))}
                              {(!atsScoreData.breakdown?.keywords?.required_missing || atsScoreData.breakdown.keywords.required_missing.length === 0) && (
                                <span style={{ fontSize: '12px', color: '#15803d' }}>All required keywords present!</span>
                              )}
                            </div>
                          </div>

                          {Object.keys(atsScoreData.breakdown?.keywords?.synonym_matches || {}).length > 0 && (
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                Synonyms Detected:
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {Object.entries(atsScoreData.breakdown.keywords.synonym_matches).map(([target, syn]: any) => (
                                  <span key={target} style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>
                                    {target} ↔ {syn}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 5. Phase D Read-only Bullet Suggestions */}
                    {bulletSuggestions.length > 0 && (
                      <div className="card-surface" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
                        <div style={{ marginBottom: '14px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--gray-900)' }}>
                            Suggested Bullet Rewrites for Missing Keywords
                          </h4>
                          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--gray-600)' }}>
                            Rephrased strictly from your candidate portfolio ground truth. Never adds unverified skills or metrics.
                          </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {bulletSuggestions.map((sug, idx) => (
                            <div key={idx} style={{
                              background: '#fffbeb',
                              border: '1px solid #fde68a',
                              borderRadius: 'var(--border-radius-sm)',
                              padding: '12px 14px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: '#b45309' }}>
                                  Missing Keyword: {sug.keyword}
                                </span>
                                <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  Source: {sug.source_project}
                                </span>
                              </div>

                              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                <em>Original:</em> "{sug.original_bullet}"
                              </div>

                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', lineHeight: 1.45, background: '#fff', padding: '8px 10px', borderRadius: '4px', border: '1px dashed #d97706' }}>
                                <strong>Suggested Rewrite:</strong> {sug.suggested_rewrite}
                              </div>

                              {sug.confirmation_needed && (
                                <div style={{ fontSize: '11px', color: '#b45309', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <AlertCircle size={12} />
                                  <span>{sug.confirmation_needed}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 6. All Resumes Ranked vs This Posting */}
                    {atsRankings.length > 0 && (
                      <div className="card-surface" style={{ padding: '18px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>
                          Resume Library Rankings for this Job Posting
                        </h4>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1.5px solid var(--gray-200)', textAlign: 'left', color: 'var(--gray-500)' }}>
                                <th style={{ padding: '8px' }}>Rank</th>
                                <th style={{ padding: '8px' }}>Resume Version</th>
                                <th style={{ padding: '8px' }}>Est. ATS Score</th>
                                <th style={{ padding: '8px' }}>Required Matched</th>
                                <th style={{ padding: '8px' }}>Required Missing</th>
                                <th style={{ padding: '8px' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {atsRankings.map((r, i) => (
                                <tr key={r.resume_version_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                                  <td style={{ padding: '8px', fontWeight: 800, color: i === 0 ? 'var(--primary)' : 'var(--gray-600)' }}>
                                    #{i + 1}
                                  </td>
                                  <td style={{ padding: '8px', fontWeight: 600 }}>
                                    {r.label}
                                  </td>
                                  <td style={{ padding: '8px', fontWeight: 800, color: r.score >= 70 ? '#15803d' : '#b45309' }}>
                                    {r.score} / 100
                                  </td>
                                  <td style={{ padding: '8px', color: '#15803d' }}>
                                    {r.required_matched_count}
                                  </td>
                                  <td style={{ padding: '8px', color: r.required_missing_count > 0 ? '#b91c1c' : 'inherit' }}>
                                    {r.required_missing_count}
                                  </td>
                                  <td style={{ padding: '8px' }}>
                                    <button
                                      type="button"
                                      className="btn-secondary btn-sm"
                                      style={{ fontSize: '11px', padding: '3px 8px' }}
                                      onClick={() => {
                                        setSelectedAtsResumeId(r.resume_version_id);
                                        loadAtsScoreAndRankings(r.resume_version_id);
                                      }}
                                    >
                                      View Breakdown
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-500)' }}>
                    No ATS evaluation data available. Click "Recompute Score" above.
                  </div>
                )}
              </div>
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
                          <strong>Offer:</strong> {currentApp.offer_details}
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
                      { id: 'offer', label: 'Offer' },
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

                {/* Resume Version Pinning Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--gray-800)', margin: 0 }}>
                    Resume Version {['applied', 'oa', 'interview', 'offer'].includes(appStage) && <span style={{ color: 'var(--primary)' }}>* (Required upon applying)</span>}
                  </label>
                  {currentApp?.resume_version_id && !isBackfillMode ? (
                    <div style={{
                      padding: '8px 12px',
                      background: 'var(--gray-50)',
                      border: '1px solid var(--gray-200)',
                      borderRadius: 'var(--border-radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--gray-800)' }}>
                        🔒 Pinned: {currentApp.resume_version}
                      </span>
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => setIsBackfillMode(true)}
                        style={{ fontSize: '11px', color: 'var(--primary)', padding: '2px 6px' }}
                      >
                        Re-pin / Backfill
                      </button>
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      value={appResumeVersionId || ''}
                      onChange={e => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setAppResumeVersionId(val);
                        const found = availableResumes.find(r => r.id === val);
                        if (found) setAppResume(found.label || found.name || found.file_name);
                      }}
                      required={['applied', 'oa', 'interview', 'offer'].includes(appStage)}
                      style={{ fontSize: '12.5px', width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="">Select Resume Version from Library...</option>
                      {availableResumes.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.label || r.name} ({r.file_name})
                        </option>
                      ))}
                    </select>
                  )}
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
                      Offer Details & Compensation
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

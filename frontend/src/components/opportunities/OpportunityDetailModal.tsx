import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ArrowLeft,
  Bookmark,
  MapPin,
  Loader2
} from 'lucide-react';
import { Posting, MatchResult, UserProfile, PostingStatus } from '../../types';
import { ArgusDataService } from '../../services/api';

interface OpportunityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  posting: Posting | null;
  currentUser: UserProfile;
  initialTab?: 'jd' | 'matcher' | 'application';
  onOpenPortfolio: () => void;
  onApplicationSaved: () => void;
  onStatusChange: (postingId: number, status: PostingStatus) => void;
}

const getCompanyLogoClass = (name: string) => {
  const key = name.toLowerCase().replace(/\s+/g, '');
  const map: Record<string, string> = {
    google: 'company-logo-google',
    stripe: 'company-logo-stripe',
    amazon: 'company-logo-amazon',
    microsoft: 'company-logo-microsoft',
    'goldmansachs': 'company-logo-goldman',
  };
  return map[key] || 'company-logo-default';
};

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  isOpen,
  onClose,
  posting,
  currentUser,
  initialTab: _initialTab = 'matcher',
  onOpenPortfolio,
  onApplicationSaved: _onApplicationSaved,
  onStatusChange
}) => {
  if (!isOpen || !posting) return null;

  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matchStep, setMatchStep] = useState<string>('idle');

  useEffect(() => {
    runMatchComputation();
  }, [posting, currentUser]);

  const runMatchComputation = async () => {
    setIsMatching(true);
    setMatchStep('Reviewing saved projects in candidate portfolio...');
    await new Promise(r => setTimeout(r, 200));

    setMatchStep('Evaluating technical stack, tags, and quantified bullets...');
    await new Promise(r => setTimeout(r, 200));

    setMatchStep('Synthesizing ground-truth fit score and recommended evidence...');
    await new Promise(r => setTimeout(r, 150));

    const result = ArgusDataService.getMatchForPosting(posting, true);
    setMatchResult(result);
    setIsMatching(false);
  };

  const requiredSkills = posting.required_skills || ['Backend', 'Distributed Systems', 'Go', 'Linux', 'Cloud'];

  const jdText = posting.raw_description || `We are looking for a passionate software engineer intern to join our infrastructure team. You will work on scalable systems that power ${posting.company_name}'s products and services, and collaborate with experienced engineers to build solutions that impact millions of users.`;

  const responsibilities = [
    'Design and implement scalable backend services',
    'Work with cross-functional teams',
    'Write clean, maintainable and testable code',
    'Participate in code reviews and design discussions'
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '1060px', height: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <div style={{
          position: 'absolute', top: '16px', right: '16px', zIndex: 10
        }}>
          <button className="btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Back link */}
          <div style={{ padding: '20px 28px 0' }}>
            <button className="back-link" onClick={onClose}>
              <ArrowLeft size={14} />
              <span>Back to Jobs</span>
            </button>
          </div>

          {/* Main content area - scrollable */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 28px 28px' }}>
            <div className="opportunity-detail-grid">
              {/* ── LEFT: Job Details ── */}
              <div>
                {/* Job Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
                  <div className={`company-logo ${getCompanyLogoClass(posting.company_name)}`}
                    style={{ borderRadius: 'var(--border-radius-md)' }}>
                    {posting.company_name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '4px' }}>
                      {posting.title}
                    </h1>
                    <div style={{ fontSize: '13px', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{posting.company_name}</span>
                      <span>·</span>
                      <span>{posting.location}</span>
                      <span>·</span>
                      <span>{posting.team || 'Internship'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => onStatusChange(posting.id, 'applied')}
                      style={{ borderRadius: 'var(--border-radius-full)' }}
                    >
                      Interested
                    </button>
                    <button className="btn-ghost btn-sm" style={{ padding: '6px' }}>
                      <Bookmark size={16} />
                    </button>
                  </div>
                </div>

                {/* Skill Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
                  {requiredSkills.map((skill, i) => (
                    <span key={i} className="badge-tag-navy" style={{
                      fontSize: '12px',
                      padding: '4px 12px',
                      borderRadius: 'var(--border-radius-full)'
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Job Description */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '10px' }}>
                    Job description
                  </h3>
                  <p style={{ fontSize: '13.5px', color: 'var(--gray-600)', lineHeight: 1.7 }}>
                    {jdText}
                  </p>
                </div>

                {/* Key Responsibilities */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '10px' }}>
                    Key responsibilities
                  </h3>
                  <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {responsibilities.map((r, i) => (
                      <li key={i} style={{ fontSize: '13.5px', color: 'var(--gray-600)', lineHeight: 1.5 }}>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Location */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '8px' }}>
                    Location
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: 'var(--gray-600)' }}>
                    <MapPin size={14} />
                    <span>{posting.location} (Hybrid)</span>
                  </div>
                </div>
              </div>

              {/* ── RIGHT: AI Match Recommendation ── */}
              <div>
                <div className="card-surface" style={{ padding: '24px', position: 'sticky', top: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)' }}>
                      AI Match Recommendation
                    </h3>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, color: 'var(--primary)',
                      background: 'rgba(173, 40, 49, 0.1)',
                      padding: '2px 8px', borderRadius: 'var(--border-radius-full)',
                      textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>
                      Beta
                    </span>
                  </div>

                  {isMatching ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                      <Loader2 size={28} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 12px' }} />
                      <div style={{ fontSize: '13px', color: 'var(--gray-600)', fontFamily: 'var(--font-mono)' }}>
                        {matchStep}
                      </div>
                    </div>
                  ) : matchResult && matchResult.recommendations.length > 0 ? (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-500)', marginBottom: '14px' }}>
                        Recommended Projects
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {matchResult.recommendations.slice(0, 3).map((rec, index) => (
                          <div key={rec.projectId} style={{
                            padding: '14px',
                            border: '1px solid var(--gray-200)',
                            borderRadius: 'var(--border-radius-md)',
                            background: 'var(--bg-white)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                              <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '14px',
                                fontWeight: 800,
                                color: 'var(--primary)',
                                minWidth: '20px'
                              }}>
                                {index + 1}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>
                                  {rec.project.name}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                                  {rec.project.tech_stack.slice(0, 3).map((t, i) => (
                                    <span key={i} className="badge-tag" style={{ fontSize: '10.5px', padding: '2px 6px' }}>
                                      {t}
                                    </span>
                                  ))}
                                  {rec.matchingKeywords.length > 0 && (
                                    <span style={{ fontSize: '10.5px', color: 'var(--primary)', fontWeight: 600 }}>
                                      +{rec.matchingKeywords.length}
                                    </span>
                                  )}
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--gray-500)', lineHeight: 1.4 }}>
                                  {rec.rationale}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        className="btn-primary"
                        onClick={onOpenPortfolio}
                        style={{
                          width: '100%',
                          marginTop: '16px',
                          borderRadius: 'var(--border-radius-sm)',
                          padding: '10px'
                        }}
                      >
                        View Full Match Details
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px' }}>
                      <Sparkles size={24} color="var(--gray-400)" style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                        Add projects to your portfolio to see match recommendations.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Briefcase,
  Trash2,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Calendar,
  MessageSquare,
  FileText,
  Search,
  ChevronRight
} from 'lucide-react';
import { Application, ApplicationStage, Posting, ReferralStatus, UserProfile } from '../../types';
import { ArgusDataService } from '../../services/api';

interface ApplicationsViewProps {
  applications: Application[];
  currentUser: UserProfile;
  onSelectPosting: (posting: Posting, tab?: 'jd' | 'matcher' | 'application') => void;
  onRefresh: () => void;
}

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

const stageConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  interested: { label: 'Interested', bg: 'var(--gray-100)', color: 'var(--gray-600)', border: 'var(--gray-200)' },
  applied: { label: 'Applied', bg: 'rgba(173,40,49,0.08)', color: 'var(--primary)', border: 'rgba(173,40,49,0.2)' },
  oa: { label: 'OA Assessment', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  interview: { label: 'Interviewing', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  offer: { label: 'Offer Received 🎉', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  rejected: { label: 'Rejected', bg: 'var(--gray-100)', color: 'var(--gray-500)', border: 'var(--gray-200)' },
  withdrawn: { label: 'Withdrawn', bg: 'var(--gray-100)', color: 'var(--gray-500)', border: 'var(--gray-200)' }
};

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  currentUser,
  onSelectPosting,
  onRefresh
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Form State for editing application & interview experience
  const [stage, setStage] = useState<ApplicationStage>('applied');
  const [referralStatus, setReferralStatus] = useState<ReferralStatus>('none');
  const [resumeVersion, setResumeVersion] = useState<string>('');
  const [oaDate, setOaDate] = useState<string>('');
  const [interviewDate, setInterviewDate] = useState<string>('');
  const [interviewRound, setInterviewRound] = useState<string>('');
  const [interviewQuestions, setInterviewQuestions] = useState<string>('');
  const [experienceReflection, setExperienceReflection] = useState<string>('');
  const [offerDetails, setOfferDetails] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const stages: { id: ApplicationStage; label: string }[] = [
    { id: 'interested', label: 'Interested' },
    { id: 'applied', label: 'Applied' },
    { id: 'oa', label: 'OA Assessment' },
    { id: 'interview', label: 'Interview Round' },
    { id: 'offer', label: 'Offer Received 🎉' },
    { id: 'rejected', label: 'Rejected / Closed' }
  ];

  // Pipeline Metrics
  const totalCount = applications.length;
  const appliedCount = applications.filter(a => a.stage === 'applied').length;
  const oaCount = applications.filter(a => a.stage === 'oa').length;
  const interviewCount = applications.filter(a => a.stage === 'interview').length;
  const offerCount = applications.filter(a => a.stage === 'offer').length;

  const filters = [
    { id: 'all', label: 'All Applications', count: totalCount },
    { id: 'applied', label: 'Applied', count: appliedCount },
    { id: 'oa', label: 'OA Stage', count: oaCount },
    { id: 'interview', label: 'Interviewing', count: interviewCount },
    { id: 'offer', label: 'Offers 🎉', count: offerCount },
    { id: 'rejected', label: 'Archived', count: applications.filter(a => a.stage === 'rejected' || a.stage === 'withdrawn').length }
  ];

  const filteredApps = applications.filter(app => {
    const matchesFilter = activeFilter === 'all' ? true : app.stage === activeFilter;
    const company = app.posting?.company_name || '';
    const title = app.posting?.title || '';
    const questions = app.interview_questions || '';
    const notesStr = app.notes || '';
    const matchesSearch = !searchQuery.trim() || 
      `${company} ${title} ${questions} ${notesStr}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleOpenEdit = (app: Application) => {
    setSelectedApp(app);
    setStage(app.stage);
    setReferralStatus(app.referral_status);
    setResumeVersion(app.resume_version || '');
    setOaDate(app.oa_date || '');
    setInterviewDate(app.interview_date || '');
    setInterviewRound(app.interview_round || '');
    setInterviewQuestions(app.interview_questions || '');
    setExperienceReflection(app.experience_reflection || '');
    setOfferDetails(app.offer_details || '');
    setNotes(app.notes || '');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    ArgusDataService.saveApplication({
      ...selectedApp,
      stage,
      referral_status: referralStatus,
      resume_version: resumeVersion,
      oa_date: oaDate || null,
      interview_date: interviewDate || null,
      interview_round: interviewRound,
      interview_questions: interviewQuestions,
      experience_reflection: experienceReflection,
      offer_details: offerDetails,
      notes
    });

    setModalOpen(false);
    onRefresh();
  };

  const handleDelete = (postingId: number) => {
    if (confirm('Remove this application from tracker?')) {
      ArgusDataService.deleteApplication(postingId);
      setModalOpen(false);
      onRefresh();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header-container">
        <div>
          <h1 className="page-title">Application Tracker & Interview Experience</h1>
          <p className="page-subtitle">
            Manage your hiring pipeline, log technical questions asked, and record your interview reflections.
          </p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '3px solid var(--gray-400)' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
            Total Pipeline
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gray-900)', marginTop: '4px' }}>
            {totalCount}
          </div>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '3px solid var(--primary)' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
            Applied
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gray-900)', marginTop: '4px' }}>
            {appliedCount}
          </div>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
            OA Assessments
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gray-900)', marginTop: '4px' }}>
            {oaCount}
          </div>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '3px solid #2563eb' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
            Interviewing
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gray-900)', marginTop: '4px' }}>
            {interviewCount}
          </div>
        </div>

        <div className="card-surface" style={{ padding: '16px 18px', borderLeft: '3px solid #16a34a' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
            Offers Received
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
            {offerCount} 🎉
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {/* Stage Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--border-radius-full)',
                border: activeFilter === f.id ? '1.5px solid var(--primary)' : '1px solid var(--gray-300)',
                background: activeFilter === f.id ? 'rgba(173, 40, 49, 0.08)' : 'var(--bg-white)',
                color: activeFilter === f.id ? 'var(--primary)' : 'var(--gray-600)',
                fontSize: '12.5px',
                fontWeight: activeFilter === f.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={14} color="var(--gray-400)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search company, questions, notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '32px', fontSize: '12.5px', height: '32px' }}
          />
        </div>
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="card-surface" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Briefcase size={36} color="var(--gray-400)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>
            No applications found
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--gray-500)', maxWidth: '400px', margin: '0 auto' }}>
            Browse discovered jobs in the Opportunities Feed, click on any role, and select "Track Application" to log your progress!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredApps.map(app => {
            const companyName = app.posting?.company_name || 'Company';
            const roleTitle = app.posting?.title || 'Software Engineer';
            const location = typeof app.posting?.location === 'string' ? app.posting.location : (app.posting?.location as any)?.name || 'Multiple Locations';
            const sc = stageConfig[app.stage] || stageConfig.interested;
            const appliedDate = app.applied_date || app.updated_at || '';

            return (
              <div
                key={app.posting_id}
                className="card-surface"
                style={{
                  padding: '18px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  borderLeft: `4px solid ${sc.color}`,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Top Row: Company Info & Stage Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className={`company-logo company-logo-sm ${getCompanyLogoClass(companyName)}`}
                      style={{ borderRadius: 'var(--border-radius-sm)', width: '38px', height: '38px', fontSize: '16px' }}>
                      {companyName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--gray-900)' }}>
                        {companyName}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600 }}>{roleTitle}</span>
                        <span>·</span>
                        <span>{location}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {appliedDate && (
                      <span style={{ fontSize: '12px', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} />
                        <span>{appliedDate}</span>
                      </span>
                    )}
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '4px 14px',
                      borderRadius: 'var(--border-radius-full)',
                      background: sc.bg,
                      color: sc.color,
                      border: `1px solid ${sc.border}`
                    }}>
                      {sc.label}
                    </span>
                  </div>
                </div>

                {/* Middle Row: Logged Interview Questions & Personal Reflection */}
                {(app.interview_questions || app.experience_reflection || app.offer_details) && (
                  <div style={{
                    padding: '12px 14px',
                    background: 'var(--gray-50)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--gray-200)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '12.5px'
                  }}>
                    {app.interview_questions && (
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                          <MessageSquare size={13} color="var(--primary)" />
                          <span>Interview / OA Questions Asked:</span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--gray-600)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                          {app.interview_questions}
                        </p>
                      </div>
                    )}

                    {app.experience_reflection && (
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                          <FileText size={13} color="#2563eb" />
                          <span>Experience & Reflection:</span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--gray-600)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                          {app.experience_reflection}
                        </p>
                      </div>
                    )}

                    {app.offer_details && (
                      <div style={{
                        padding: '6px 10px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 'var(--border-radius-sm)',
                        color: '#15803d',
                        fontWeight: 600
                      }}>
                        🎉 <strong>Offer Details:</strong> {app.offer_details}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Row: Action Buttons */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--gray-100)',
                  paddingTop: '10px',
                  marginTop: '2px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--gray-500)' }}>
                    {app.resume_version && (
                      <span>📄 <strong>Resume:</strong> {app.resume_version}</span>
                    )}
                    {app.referral_status !== 'none' && (
                      <span>🤝 <strong>Referral:</strong> {app.referral_status}</span>
                    )}
                    {app.oa_date && (
                      <span>⏰ <strong>OA Date:</strong> {app.oa_date}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {app.posting?.url && (
                      <a
                        href={app.posting.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="btn-secondary btn-sm"
                        style={{
                          fontSize: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          textDecoration: 'none'
                        }}
                      >
                        <span>Official Portal</span>
                        <ExternalLink size={12} />
                      </a>
                    )}

                    {app.posting && (
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => onSelectPosting(app.posting!)}
                        style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Sparkles size={12} color="var(--primary)" />
                        <span>AI Match & Bullets</span>
                      </button>
                    )}

                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleOpenEdit(app)}
                      style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <span>Update Stage & Log</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Application & Experience Log Modal */}
      {modalOpen && selectedApp && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gray-900)' }}>
                  Update Application: {selectedApp.posting?.company_name}
                </h2>
                <div style={{ fontSize: '12.5px', color: 'var(--gray-500)' }}>
                  {selectedApp.posting?.title}
                </div>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Stage Stepper Buttons */}
                <div>
                  <label className="form-label">Application Stage</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {stages.map(s => {
                      const isSelected = stage === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStage(s.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--border-radius-full)',
                            border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--gray-300)',
                            background: isSelected ? 'rgba(173, 40, 49, 0.08)' : 'var(--bg-white)',
                            color: isSelected ? 'var(--primary)' : 'var(--gray-700)',
                            fontSize: '12px',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer'
                          }}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Technical Questions Asked */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, fontSize: '12.5px', margin: 0 }}>
                    <span>Technical Interview / OA Questions</span>
                    <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 400 }}>Coding, System Design, Concurrency</span>
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={interviewQuestions}
                    onChange={e => setInterviewQuestions(e.target.value)}
                    placeholder="e.g. 1. Implement a lock-free RingBuffer in Java/C++. 2. System Design: Rate limiter with Token Bucket algorithm. 3. LeetCode 295 Find Median from Data Stream."
                    style={{ fontSize: '12.5px', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Personal Experience Reflection & Takeaways */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, fontSize: '12.5px', margin: 0 }}>
                    <span>Experience Reflection & Interview Notes</span>
                    <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 400 }}>Feedback, what went well, next steps</span>
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={experienceReflection}
                    onChange={e => setExperienceReflection(e.target.value)}
                    placeholder="e.g. Interview went great! Interviewer liked the NioFlow project architecture. Need to practice write-ahead log compaction before Round 2."
                    style={{ fontSize: '12.5px', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Offer Details if stage === 'offer' */}
                {stage === 'offer' && (
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                    <label className="form-label" style={{ color: '#15803d', fontWeight: 700, fontSize: '12.5px', margin: 0 }}>
                      🎉 Offer Details & Compensation
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={offerDetails}
                      onChange={e => setOfferDetails(e.target.value)}
                      placeholder="e.g. $65/hr stipend, $2,500/mo housing allowance, deadline Nov 15"
                      style={{ fontSize: '12.5px', border: '1.5px solid #86efac', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                {/* Meta details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', margin: 0 }}>Resume Version Used</label>
                    <select
                      className="form-select"
                      value={resumeVersion}
                      onChange={e => setResumeVersion(e.target.value)}
                      style={{ fontSize: '12.5px', width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="">Select Resume Version...</option>
                      {(currentUser.resumes || []).map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                      <option value="Systems & Infrastructure Focus">Systems & Infrastructure Focus</option>
                      <option value="General Software Engineering">General Software Engineering</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', margin: 0 }}>Referral Status</label>
                    <select
                      className="form-select"
                      value={referralStatus}
                      onChange={e => setReferralStatus(e.target.value as ReferralStatus)}
                      style={{ fontSize: '12.5px', width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="none">None</option>
                      <option value="requested">Requested</option>
                      <option value="pending">Pending</option>
                      <option value="referred">Referred</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', margin: 0 }}>OA Assessment Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={oaDate}
                      onChange={e => setOaDate(e.target.value)}
                      style={{ fontSize: '12.5px', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', margin: 0 }}>Interview Date / Round</label>
                    <input
                      type="text"
                      className="form-input"
                      value={interviewRound}
                      onChange={e => setInterviewRound(e.target.value)}
                      placeholder="e.g. Oct 14 - Technical Round 1"
                      style={{ fontSize: '12.5px', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => handleDelete(selectedApp.posting_id)}
                  style={{ color: 'var(--primary)', marginRight: 'auto' }}
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <span>Save Application & Experience</span>
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

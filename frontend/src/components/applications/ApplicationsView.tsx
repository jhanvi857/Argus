import React, { useState } from 'react';
import {
  Briefcase,
  Trash2,
  Check,
  X
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
  applied: { label: 'Applied', bg: 'rgba(173,40,49,0.1)', color: 'var(--primary)', border: 'rgba(173,40,49,0.2)' },
  oa: { label: 'OA', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: 'var(--color-warning-border)' },
  interview: { label: 'Interview', bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
  offer: { label: 'Offer', bg: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'var(--color-success-border)' },
  rejected: { label: 'Rejected', bg: 'var(--gray-100)', color: 'var(--gray-500)', border: 'var(--gray-200)' },
  withdrawn: { label: 'Withdrawn', bg: 'var(--gray-100)', color: 'var(--gray-500)', border: 'var(--gray-200)' }
};

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  onSelectPosting: _onSelectPosting,
  onRefresh
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Form State
  const [stage, setStage] = useState<ApplicationStage>('applied');
  const [referralStatus, setReferralStatus] = useState<ReferralStatus>('none');
  const [resumeVersion, setResumeVersion] = useState<string>('');
  const [oaDate, setOaDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const filters = [
    { id: 'all', label: 'All', count: applications.length },
    { id: 'applied', label: 'Applied', count: applications.filter(a => a.stage === 'applied').length },
    { id: 'interview', label: 'Interview', count: applications.filter(a => a.stage === 'interview').length },
    { id: 'offer', label: 'Offer', count: applications.filter(a => a.stage === 'offer').length }
  ];

  const filteredApps = activeFilter === 'all'
    ? applications
    : applications.filter(a => a.stage === activeFilter);

  const handleOpenEdit = (app: Application) => {
    setSelectedApp(app);
    setStage(app.stage);
    setReferralStatus(app.referral_status);
    setResumeVersion(app.resume_version || '');
    setOaDate(app.oa_date || '');
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
      notes
    });

    setModalOpen(false);
    onRefresh();
  };

  const handleDelete = (postingId: number) => {
    if (confirm('Remove this application from tracker?')) {
      ArgusDataService.deleteApplication(postingId);
      onRefresh();
    }
  };

  const stages: { id: ApplicationStage; label: string }[] = [
    { id: 'interested', label: 'Interested' },
    { id: 'applied', label: 'Applied' },
    { id: 'oa', label: 'OA Assessment' },
    { id: 'interview', label: 'Interview' },
    { id: 'offer', label: 'Offer' },
    { id: 'rejected', label: 'Rejected' }
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header-container">
        <div>
          <h1 className="page-title">My Applications</h1>
          <p className="page-subtitle">
            Track your applications and stay updated.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px'
      }}>
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            style={{
              padding: '7px 16px',
              borderRadius: 'var(--border-radius-full)',
              border: activeFilter === f.id ? '1.5px solid var(--primary)' : '1px solid var(--gray-300)',
              background: activeFilter === f.id ? 'rgba(173, 40, 49, 0.08)' : 'var(--bg-white)',
              color: activeFilter === f.id ? 'var(--primary)' : 'var(--gray-600)',
              fontSize: '13px',
              fontWeight: activeFilter === f.id ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="card-surface" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Briefcase size={36} color="var(--gray-400)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>
            No applications tracked yet.
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--gray-500)' }}>
            Click "Interested" on any discovered role to start tracking.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredApps.map(app => {
            const companyName = app.posting?.company_name || 'Company';
            const roleTitle = app.posting?.title || 'Software Engineer';
            const sc = stageConfig[app.stage] || stageConfig.interested;
            const appliedDate = app.applied_date || app.updated_at || '';

            return (
              <div
                key={app.posting_id}
                className="application-list-item"
                onClick={() => handleOpenEdit(app)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                  <div className={`company-logo company-logo-sm ${getCompanyLogoClass(companyName)}`}
                    style={{ borderRadius: 'var(--border-radius-sm)' }}>
                    {companyName.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)' }}>
                      {companyName}
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--gray-500)' }}>
                      {roleTitle}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {appliedDate && (
                    <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                      {appliedDate}
                    </span>
                  )}
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: 'var(--border-radius-full)',
                    background: sc.bg,
                    color: sc.color,
                    border: `1px solid ${sc.border}`
                  }}>
                    {sc.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Application Modal */}
      {modalOpen && selectedApp && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--gray-900)' }}>
                  Update Application: {selectedApp.posting?.company_name}
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                  {selectedApp.posting?.title}
                </div>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Application Stage</label>
                  <select
                    className="form-select"
                    value={stage}
                    onChange={e => setStage(e.target.value as ApplicationStage)}
                  >
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Referral Status</label>
                    <select
                      className="form-select"
                      value={referralStatus}
                      onChange={e => setReferralStatus(e.target.value as ReferralStatus)}
                    >
                      <option value="none">None</option>
                      <option value="requested">Requested</option>
                      <option value="pending">Pending</option>
                      <option value="referred">Referred</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">OA Assessment Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={oaDate}
                      onChange={e => setOaDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Resume Version Used</label>
                  <input
                    type="text"
                    className="form-input"
                    value={resumeVersion}
                    onChange={e => setResumeVersion(e.target.value)}
                    placeholder="Backend & Infrastructure v3"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Interview stages, questions asked, follow-up dates..."
                  />
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
                  <span>Save Updates</span>
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

import React, { useState } from 'react';
import { Check, CheckCircle2, RotateCcw } from 'lucide-react';
import { UserProfile, AppRoute } from '../../types';
import { AuthService } from '../../services/auth';
import { ArgusDataService } from '../../services/api';

interface SettingsViewProps {
  currentUser: UserProfile;
  onNavigate: (route: AppRoute) => void;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onNavigate,
  onRefresh
}) => {
  const [fullName, setFullName] = useState(currentUser.full_name || '');
  const [headline, setHeadline] = useState(currentUser.headline || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    AuthService.updateCurrentUser({
      full_name: fullName.trim(),
      headline: headline.trim(),
      email: email.trim(),
      bio: bio.trim()
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    onRefresh();
  };

  const handleResetData = () => {
    if (confirm('Clear browser-stored Argus data and return to an empty profile?')) {
      ArgusDataService.resetAllData();
      onRefresh();
      onNavigate('dashboard');
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header-container">
        <div>
          <h1 className="page-title">Account Settings</h1>
          <p className="page-subtitle">
            Manage your personal profile details, credentials, and application storage settings.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--color-success-bg)',
          border: '1px solid var(--color-success-border)',
          borderRadius: 'var(--border-radius-sm)',
          color: 'var(--color-success)',
          fontSize: '13.5px',
          fontWeight: 600,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span>Account details successfully saved.</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Profile Details */}
        <div className="card-surface" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '16px' }}>
            Personal Details
          </h3>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Professional Headline</label>
              <input
                type="text"
                className="form-input"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Biography & Research Focus</label>
              <textarea
                className="form-textarea"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="A brief summary of your technical interests..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary">
                <Check size={14} />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>

        {/* Security & Password */}
        <div className="card-surface" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '6px' }}>
            Security & Password
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--gray-600)', marginBottom: '16px' }}>
            Update your account password or session preferences.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••••••"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button className="btn-secondary btn-sm" onClick={() => alert('Password successfully updated (simulated).')}>
            Update Password
          </button>
        </div>

        {/* Danger Zone */}
        <div className="card-surface" style={{ padding: '24px', borderColor: '#fed7d7' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-crimson)', marginBottom: '6px' }}>
            Database & Reset Zone
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--gray-600)', marginBottom: '16px' }}>
            Clear browser-stored user profiles, matches, and application records.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-800)' }}>
                Reset Database to Clean Snapshot
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--gray-500)' }}>
                Returns the frontend to an empty local profile with no seeded records.
              </div>
            </div>

            <button className="btn-secondary btn-sm" onClick={handleResetData} style={{ color: 'var(--accent-crimson)', borderColor: '#fed7d7' }}>
              <RotateCcw size={13} />
              <span>Reset Database</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

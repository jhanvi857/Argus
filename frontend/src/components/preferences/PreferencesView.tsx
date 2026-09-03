import React, { useState } from 'react';
import { 
  Check, 
  CheckCircle2
} from 'lucide-react';
import { UserProfile, UserPreferences, Company } from '../../types';
import { ArgusDataService } from '../../services/api';

interface PreferencesViewProps {
  currentUser: UserProfile;
  companies: Company[];
  onRefresh: () => void;
}

export const PreferencesView: React.FC<PreferencesViewProps> = ({
  currentUser,
  companies,
  onRefresh
}) => {
  const [preferredRoles, setPreferredRoles] = useState<string[]>(
    currentUser.preferences?.preferred_roles || ['Software Engineer Intern', 'Software Engineer New Grad', 'Backend Engineer']
  );
  const [focusAreas, setFocusAreas] = useState<string[]>(
    currentUser.preferences?.focus_areas || ['Backend', 'Infrastructure', 'Distributed Systems']
  );
  const [locations, setLocations] = useState<string[]>(
    currentUser.preferences?.locations || ['India', 'Remote', 'United States']
  );
  const [emailAlerts, setEmailAlerts] = useState<boolean>(
    currentUser.preferences?.email_notifications_enabled ?? true
  );
  const [notificationEmail, setNotificationEmail] = useState<string>(
    currentUser.preferences?.notification_email || currentUser.email || ''
  );
  const [companySearch, setCompanySearch] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const targetCompanyIds = new Set(currentUser.preferences?.target_company_ids || []);

  const handleToggleCompany = (companyId: number) => {
    const isEnabled = targetCompanyIds.has(companyId);
    ArgusDataService.toggleCompany(companyId, !isEnabled);
    onRefresh();
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPref: UserPreferences = {
      target_company_ids: Array.from(targetCompanyIds),
      preferred_roles: preferredRoles,
      focus_areas: focusAreas,
      locations: locations,
      email_notifications_enabled: emailAlerts,
      notification_email: notificationEmail.trim()
    };

    ArgusDataService.savePreferences(updatedPref);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    onRefresh();
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(companySearch.toLowerCase()) || 
    c.category.toLowerCase().includes(companySearch.toLowerCase())
  );

  return (
    <div>
      <div className="page-header-container">
        <div>
          <h1 className="page-title">Job Search Preferences</h1>
          <p className="page-subtitle">
            Configure your target company watchlist, preferred role titles, focus domains, and differential notification rules.
          </p>
        </div>

        <button className="btn-primary" onClick={handleSavePreferences}>
          <Check size={14} />
          <span>Save Preferences</span>
        </button>
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
          <span>Preferences updated and synchronized across Argus differential crawler.</span>
        </div>
      )}

      <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* 1. Target Company Watchlist */}
        <div className="card-surface" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                Target Companies Watchlist ({targetCompanyIds.size} active)
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--gray-600)' }}>
                Argus monitors these official career portals directly via ATS APIs.
              </p>
            </div>

            <div style={{ width: '260px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Filter company list..."
                value={companySearch}
                onChange={e => setCompanySearch(e.target.value)}
                style={{ fontSize: '12.5px', padding: '6px 10px' }}
              />
            </div>
          </div>

          <div style={{
            maxHeight: '280px',
            overflowY: 'auto',
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--border-radius-sm)',
            padding: '10px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
              {filteredCompanies.map(c => {
                const isChecked = targetCompanyIds.has(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleToggleCompany(c.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--border-radius-sm)',
                      border: isChecked ? '1.5px solid var(--primary-navy)' : '1px solid var(--gray-200)',
                      backgroundColor: isChecked ? 'var(--primary-navy-tint)' : 'var(--bg-white)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-navy)' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'capitalize' }}>
                        {c.ats_type} • {c.total_postings_count} roles
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ accentColor: 'var(--primary-navy)' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Preferred Roles & Domains */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Roles */}
          <div className="card-surface" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '4px' }}>
              Preferred Role Titles
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--gray-600)', marginBottom: '14px' }}>
              Select all role categories you wish to pursue.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                'Software Engineer Intern',
                'Software Engineer New Grad',
                'Backend Engineer',
                'Infrastructure Engineer',
                'Systems Engineer',
                'Full Stack Engineer',
                'AI/ML Engineer',
                'Quantitative Developer',
                'Security Engineer'
              ].map(role => {
                const isSelected = preferredRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      if (isSelected) setPreferredRoles(preferredRoles.filter(r => r !== role));
                      else setPreferredRoles([...preferredRoles, role]);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: isSelected ? '1.5px solid var(--primary-navy)' : '1px solid var(--gray-300)',
                      backgroundColor: isSelected ? 'var(--primary-navy)' : 'var(--bg-white)',
                      color: isSelected ? 'white' : 'var(--gray-800)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isSelected && '✓ '} {role}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Focus Areas */}
          <div className="card-surface" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '4px' }}>
              Technical Focus Areas
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--gray-600)', marginBottom: '14px' }}>
              Prioritize roles matching your core domain competencies.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                'Backend',
                'Infrastructure',
                'Distributed Systems',
                'Systems',
                'Low Latency',
                'Cloud',
                'Databases',
                'AI/ML',
                'Frontend',
                'Security'
              ].map(area => {
                const isSelected = focusAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => {
                      if (isSelected) setFocusAreas(focusAreas.filter(a => a !== area));
                      else setFocusAreas([...focusAreas, area]);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: isSelected ? '1.5px solid var(--accent-crimson)' : '1px solid var(--gray-300)',
                      backgroundColor: isSelected ? 'var(--accent-crimson)' : 'var(--bg-white)',
                      color: isSelected ? 'white' : 'var(--gray-800)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isSelected && '✓ '} {area}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Locations & Notification Settings */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Locations */}
          <div className="card-surface" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '4px' }}>
              Target Locations
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--gray-600)', marginBottom: '14px' }}>
              Geographic regions for opportunity filtering.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['United States (US)', 'India', 'United Kingdom (UK)', 'Ireland', 'Germany', 'Switzerland', 'Canada', 'Singapore', 'Netherlands', 'France', 'Australia', 'Japan', 'Poland', 'Israel', 'UAE', 'Remote / Virtual'].map(loc => {
                const isSelected = locations.includes(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      if (isSelected) setLocations(locations.filter(l => l !== loc));
                      else setLocations([...locations, loc]);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: isSelected ? '1.5px solid var(--primary-navy)' : '1px solid var(--gray-300)',
                      backgroundColor: isSelected ? 'var(--primary-navy-tint)' : 'var(--bg-white)',
                      color: isSelected ? 'var(--primary-navy)' : 'var(--gray-800)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isSelected && '✓ '} {loc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Notifications */}
          <div className="card-surface" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '4px' }}>
              Notification Rules
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--gray-600)', marginBottom: '14px' }}>
              Argus only triggers an email when a <strong>genuinely new relevant</strong> opportunity is detected.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                id="emailAlerts"
                checked={emailAlerts}
                onChange={e => setEmailAlerts(e.target.checked)}
                style={{ accentColor: 'var(--primary-navy)', width: '16px', height: '16px' }}
              />
              <label htmlFor="emailAlerts" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--primary-navy)', cursor: 'pointer' }}>
                Enable email notifications (via SMTP daemon)
              </label>
            </div>

            {emailAlerts && (
              <div className="form-group">
                <label className="form-label">Alerts Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={notificationEmail}
                  onChange={e => setNotificationEmail(e.target.value)}
                  placeholder="alex.chen@example.com"
                />
              </div>
            )}
          </div>
        </div>

        {/* Save CTA */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary" style={{ padding: '10px 24px' }}>
            <Check size={15} />
            <span>Save All Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};

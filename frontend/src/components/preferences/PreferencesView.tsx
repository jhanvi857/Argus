import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  GraduationCap,
  Layers,
  Globe,
  Search,
  CheckSquare,
  Square,
  Briefcase,
  UserCheck,
  Plus,
  X
} from 'lucide-react';

import { UserProfile, UserPreferences, Company } from '../../types';
import { ArgusDataService } from '../../services/api';
import { AuthService } from '../../services/auth';
import { GLOBAL_COUNTRIES, TOP_TECH_HUB_IDS } from '../../data/countries';

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
  const [roleLevel, setRoleLevel] = useState<'all' | 'intern' | 'new_grad' | 'experienced'>(
    currentUser.preferences?.role_level || 'all'
  );
  const [candidateStatus, setCandidateStatus] = useState<UserProfile['current_status']>(
    currentUser.current_status || 'student'
  );
  const [preferredRoles, setPreferredRoles] = useState<string[]>(
    currentUser.preferences?.preferred_roles || ['Software Engineer Intern', 'Software Engineer New Grad', 'Backend Engineer']
  );
  const [focusAreas, setFocusAreas] = useState<string[]>(
    currentUser.preferences?.focus_areas || ['Backend', 'Infrastructure', 'Distributed Systems']
  );
  const [locations, setLocations] = useState<string[]>(
    currentUser.preferences?.locations || ['United States', 'India', 'Remote / Anywhere']
  );
  const [emailAlerts, setEmailAlerts] = useState<boolean>(
    currentUser.preferences?.email_notifications_enabled ?? true
  );
  const [notificationEmail, setNotificationEmail] = useState<string>(
    currentUser.preferences?.notification_email || currentUser.email || ''
  );
  const [companySearch, setCompanySearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [customLocationInput, setCustomLocationInput] = useState('');
  const [customRoleInput, setCustomRoleInput] = useState('');
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
      role_level: roleLevel,
      email_notifications_enabled: emailAlerts,
      notification_email: notificationEmail.trim()
    };

    // Update candidate status and preferences in user profile and DB
    AuthService.updateCurrentUser({
      current_status: candidateStatus,
      preferences: updatedPref
    });
    ArgusDataService.savePreferences(updatedPref);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    onRefresh();
  };


  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.category.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredCountries = GLOBAL_COUNTRIES.filter(c => {
    if (selectedRegion !== 'All' && c.region !== selectedRegion) return false;
    if (countrySearch.trim()) {
      const q = countrySearch.toLowerCase().trim();
      const matchName = c.name.toLowerCase().includes(q);
      const matchCode = c.code.toLowerCase().includes(q);
      const matchKeywords = c.keywords.some(k => k.includes(q));
      return matchName || matchCode || matchKeywords;
    }
    return true;
  });

  const toggleLocation = (countryName: string) => {
    if (locations.includes(countryName)) {
      setLocations(locations.filter(l => l !== countryName));
    } else {
      setLocations([...locations, countryName]);
    }
  };

  const selectTopTechHubs = () => {
    const hubNames = GLOBAL_COUNTRIES
      .filter(c => TOP_TECH_HUB_IDS.includes(c.id))
      .map(c => c.name);
    const merged = Array.from(new Set([...locations, ...hubNames]));
    setLocations(merged);
  };

  const selectAllFiltered = () => {
    const names = filteredCountries.map(c => c.name);
    const merged = Array.from(new Set([...locations, ...names]));
    setLocations(merged);
  };

  const clearAllLocations = () => {
    setLocations([]);
  };

  const handleAddCustomLocation = () => {
    const val = customLocationInput.trim();
    if (val && !locations.includes(val)) {
      setLocations([...locations, val]);
      setCustomLocationInput('');
    }
  };

  const handleAddCustomRole = () => {
    const val = customRoleInput.trim();
    if (val && !preferredRoles.includes(val)) {
      setPreferredRoles([...preferredRoles, val]);
      setCustomRoleInput('');
    }
  };


  return (
    <div>
      <div className="page-header-container">
        <div>
          <h1 className="page-title">Job Search Preferences & Differential Filters</h1>
          <p className="page-subtitle">
            Configure your target career stage (Intern vs. New Grad), worldwide target countries, company watchlist, and email alert criteria.
          </p>
        </div>

        <button className="btn-primary" onClick={handleSavePreferences}>
          <Check size={14} />
          <span>Save Preferences</span>
        </button>
      </div>

      {saveSuccess && (
        <div style={{
          padding: '14px 18px',
          backgroundColor: 'var(--color-success-bg)',
          border: '1.5px solid var(--color-success-border)',
          borderRadius: 'var(--border-radius-sm)',
          color: 'var(--color-success)',
          fontSize: '13.5px',
          fontWeight: 700,
          marginBottom: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
        }}>
          <CheckCircle2 size={18} />
          <span>Preferences saved! Argus differential ingestion engine and email daemon will now enforce your exact role level &amp; location filters.</span>
        </div>
      )}

      <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* 0. Current Candidate Status / Stage */}
        <div className="card-surface" style={{ padding: '24px', borderLeft: '4px solid var(--accent-crimson)' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={20} color="var(--accent-crimson)" />
              My Current Status / Professional Background
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '4px' }}>
              Update your background anytime as your career progresses. Argus tunes match justification, project recommendations, and OA timelines to your profile.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { id: 'student', label: 'College Student', desc: 'Seeking internships & co-ops', icon: '' },
              { id: 'intern', label: 'Current Intern', desc: 'Transitioning to next role', icon: '' },
              { id: 'new_grad', label: 'New / Upcoming Grad', desc: 'Targeting 2025/2026 entry level', icon: '' },
              { id: 'swe', label: 'Software Engineer', desc: 'Currently in industry (SDE I)', icon: '' },
              { id: 'experienced', label: 'Experienced Engineer', desc: 'In industry (SDE II+ / 2+ yrs)', icon: '' },
            ].map(status => (
              <div
                key={status.id}
                onClick={() => setCandidateStatus(status.id as any)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--border-radius-md)',
                  border: candidateStatus === status.id ? '2px solid var(--accent-crimson)' : '1.5px solid var(--gray-200)',
                  backgroundColor: candidateStatus === status.id ? '#fdf2f2' : 'var(--bg-white)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{status.icon}</span>
                    <span style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--primary-navy)' }}>{status.label}</span>
                  </div>
                  <input
                    type="radio"
                    name="candidate_status"
                    checked={candidateStatus === status.id}
                    onChange={() => setCandidateStatus(status.id as any)}
                    style={{ accentColor: 'var(--accent-crimson)', cursor: 'pointer' }}
                  />
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--gray-600)', margin: 0 }}>
                  {status.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 1. Target Career Stage & Role Level */}
        <div className="card-surface" style={{ padding: '24px', borderLeft: '4px solid var(--primary-navy)' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={20} color="var(--primary-navy)" />
              Target Role Level &amp; Career Stage (Strict Ingestion &amp; Alert Filter)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '4px' }}>
              Argus uses this to classify relevance. Selecting a specific stage guarantees only those matching positions are marked relevant and emailed.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {/* All Roles */}
            <div
              onClick={() => setRoleLevel('all')}
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--border-radius-md)',
                border: roleLevel === 'all' ? '2px solid var(--primary-navy)' : '1.5px solid var(--gray-200)',
                backgroundColor: roleLevel === 'all' ? 'var(--primary-navy-tint)' : 'var(--bg-white)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color={roleLevel === 'all' ? 'var(--primary-navy)' : 'var(--gray-500)'} />
                  <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--primary-navy)' }}>All Career Levels</span>
                </div>
                <input
                  type="radio"
                  name="role_level"
                  checked={roleLevel === 'all'}
                  onChange={() => setRoleLevel('all')}
                  style={{ accentColor: 'var(--primary-navy)', cursor: 'pointer' }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0 }}>
                Alert and display all relevant opportunities across internships, new-grad, and early industry positions.
              </p>
            </div>

            {/* Intern Only */}
            <div
              onClick={() => setRoleLevel('intern')}
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--border-radius-md)',
                border: roleLevel === 'intern' ? '2px solid #2563eb' : '1.5px solid var(--gray-200)',
                backgroundColor: roleLevel === 'intern' ? '#eff6ff' : 'var(--bg-white)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#1d4ed8' }}>Internships Only</span>
                </div>
                <input
                  type="radio"
                  name="role_level"
                  checked={roleLevel === 'intern'}
                  onChange={() => setRoleLevel('intern')}
                  style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0 }}>
                <strong>Mail &amp; show only intern/co-op roles.</strong> Discards all full-time new-grad and experienced roles.
              </p>
            </div>

            {/* New Grad Only */}
            <div
              onClick={() => setRoleLevel('new_grad')}
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--border-radius-md)',
                border: roleLevel === 'new_grad' ? '2px solid #059669' : '1.5px solid var(--gray-200)',
                backgroundColor: roleLevel === 'new_grad' ? '#ecfdf5' : 'var(--bg-white)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#047857' }}>New Grad Only</span>
                </div>
                <input
                  type="radio"
                  name="role_level"
                  checked={roleLevel === 'new_grad'}
                  onChange={() => setRoleLevel('new_grad')}
                  style={{ accentColor: '#059669', cursor: 'pointer' }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0 }}>
                <strong>Mail &amp; show only full-time new-grad roles.</strong> Discards all student internships, summer analyst, and co-op roles.
              </p>
            </div>

            {/* Experienced / In Industry */}
            <div
              onClick={() => setRoleLevel('experienced')}
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--border-radius-md)',
                border: roleLevel === 'experienced' ? '2px solid #b45309' : '1.5px solid var(--gray-200)',
                backgroundColor: roleLevel === 'experienced' ? '#fffbeb' : 'var(--bg-white)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Briefcase size={18} color={roleLevel === 'experienced' ? '#b45309' : 'var(--gray-500)'} />
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#b45309' }}>Experienced / Industry (SDE I-II)</span>
                </div>
                <input
                  type="radio"
                  name="role_level"
                  checked={roleLevel === 'experienced'}
                  onChange={() => setRoleLevel('experienced')}
                  style={{ accentColor: '#b45309', cursor: 'pointer' }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0 }}>
                <strong>Mail &amp; show full-time SWE / SDE I-II roles.</strong> Discards student internships, co-ops, and summer analyst postings.
              </p>
            </div>
          </div>
        </div>


        {/* 2. Global Target Locations (50+ Countries) */}
        <div className="card-surface" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={18} color="var(--primary-navy)" />
                Global Target Countries &amp; Locations ({locations.length} selected)
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--gray-600)', marginTop: '2px' }}>
                Choose the countries you want to receive alerts and opportunities for. Leave empty or select all for unrestricted global search.
              </p>
            </div>

            {/* Presets & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={selectTopTechHubs}
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                Top Tech Hubs (11)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={selectAllFiltered}
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                Select Filtered ({filteredCountries.length})
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={clearAllLocations}
                style={{ fontSize: '12px', padding: '5px 12px', color: 'var(--accent-crimson)' }}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Region Tabs & Country Search */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['All', 'Americas', 'Europe', 'Asia Pacific', 'Middle East & Africa', 'Remote'].map(reg => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setSelectedRegion(reg)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    border: selectedRegion === reg ? '1.5px solid var(--primary-navy)' : '1px solid var(--gray-300)',
                    backgroundColor: selectedRegion === reg ? 'var(--primary-navy)' : 'var(--bg-white)',
                    color: selectedRegion === reg ? 'white' : 'var(--gray-700)',
                    cursor: 'pointer'
                  }}
                >
                  {reg}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search 55+ countries & cities..."
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 10px 6px 30px' }}
              />
            </div>
          </div>

          {/* Country Selection Grid */}
          <div style={{
            maxHeight: '320px',
            overflowY: 'auto',
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--border-radius-sm)',
            padding: '12px',
            backgroundColor: 'var(--gray-50)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
              {filteredCountries.map(country => {
                const isSelected = locations.includes(country.name);
                return (
                  <div
                    key={country.id}
                    onClick={() => toggleLocation(country.name)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--border-radius-sm)',
                      border: isSelected ? '1.5px solid var(--primary-navy)' : '1px solid var(--gray-200)',
                      backgroundColor: isSelected ? 'var(--primary-navy-tint)' : 'var(--bg-white)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: isSelected ? 700 : 500, color: 'var(--primary-navy)' }}>
                          {country.name}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--gray-500)' }}>
                          {country.region}
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <CheckSquare size={16} color="var(--primary-navy)" />
                    ) : (
                      <Square size={16} color="var(--gray-300)" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Location adder & Selected pills */}
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--gray-200)' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Add custom city or country (e.g. Austin, TX, Berlin, Tokyo)..."
                value={customLocationInput}
                onChange={e => setCustomLocationInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomLocation();
                  }
                }}
                style={{ fontSize: '12.5px', padding: '6px 12px', maxWidth: '380px' }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddCustomLocation}
                style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} />
                <span>Add Location</span>
              </button>
            </div>

            {locations.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--gray-600)', marginRight: '4px' }}>
                  Active Locations ({locations.length}):
                </span>
                {locations.map(loc => (
                  <span
                    key={loc}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--primary-navy-tint)',
                      border: '1px solid var(--primary-navy)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: 'var(--primary-navy)'
                    }}
                  >
                    <span>{loc}</span>
                    <X
                      size={11}
                      style={{ cursor: 'pointer', opacity: 0.7 }}
                      onClick={() => setLocations(locations.filter(l => l !== loc))}
                    />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>


        {/* 3. Target Company Watchlist */}
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
            maxHeight: '260px',
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
                      onChange={() => { }}
                      style={{ accentColor: 'var(--primary-navy)' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Preferred Roles & Domains */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Roles */}
          <div className="card-surface" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '4px' }}>
              Preferred Role Titles
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--gray-600)', marginBottom: '14px' }}>
              Select specific title keywords you target.
            </p>

            {/* Custom Role Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Add custom role (e.g. Distributed Systems Engineer)..."
                value={customRoleInput}
                onChange={e => setCustomRoleInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomRole();
                  }
                }}
                style={{ fontSize: '12px', padding: '6px 10px' }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddCustomRole}
                style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} />
                <span>Add Role</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Array.from(new Set([
                'Software Engineer Intern',
                'Software Engineer New Grad',
                'Software Engineer (SDE I)',
                'Software Engineer (SDE II)',
                'Backend Engineer',
                'Infrastructure Engineer',
                'Systems Engineer',
                'Full Stack Engineer',
                'AI/ML Engineer',
                'Quantitative Developer',
                'Security Engineer',
                'Cloud Engineer',
                'Site Reliability Engineer (SRE)',
                ...preferredRoles
              ])).map(role => {
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
                'Security',
                'Operating Systems'
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

        {/* 5. Notification Rules */}
        <div className="card-surface" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '4px' }}>
            Email Notification Daemon
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--gray-600)', marginBottom: '14px' }}>
            Argus triggers an email notification only when a <strong>genuinely new relevant</strong> opportunity matching your role level and locations is detected.
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
              Enable email notifications (via SMTP background cron)
            </label>
          </div>

          {emailAlerts && (
            <div className="form-group" style={{ maxWidth: '400px' }}>
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

        {/* Save CTA */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary" style={{ padding: '12px 28px', fontSize: '14px' }}>
            <Check size={16} />
            <span>Save All Preferences &amp; Sync Daemon</span>
          </button>
        </div>
      </form>
    </div>
  );
};

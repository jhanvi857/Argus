import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Briefcase,
  Globe,
  Building2,
  Mail,
  ChevronRight,
  Clock,
  Check,
  X,
  Search,
  Target
} from 'lucide-react';
import { UserProfile, UserPreferences, Company } from '../../types';
import { ArgusDataService } from '../../services/api';
import { AuthService } from '../../services/auth';
import { GLOBAL_COUNTRIES } from '../../data/countries';

interface PreferencesViewProps {
  currentUser: UserProfile;
  companies: Company[];
  onRefresh: () => void;
}

const DEFAULT_COMPANIES_SEED = [
  'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple',
  'Goldman Sachs', 'Citadel', 'Stripe', 'Salesforce', 'PayPal',
  'Walmart Global Tech', 'Razorpay', 'Wells Fargo', 'JPMorgan Chase', 'Flipkart',
  'Netflix', 'Uber', 'Airbnb', 'Spotify', 'Twitter',
  'Databricks', 'Snowflake', 'Palantir', 'Nvidia'
];

const DEFAULT_COUNTRIES_SEED = [
  'India', 'United States', 'Canada', 'United Kingdom',
  'Germany', 'Singapore', 'Ireland', 'Netherlands',
  'Australia', 'Switzerland', 'France', 'Japan'
];

const STAGE_OPTIONS = [
  { stage: 'College Student', detail: 'Seeking internships & co-ops' },
  { stage: 'Recent Graduate', detail: 'Targeting entry-level & full-time' },
  { stage: 'Early Career', detail: 'Software Engineer (1-3 years experience)' },
  { stage: 'Experienced Engineer', detail: 'Senior / Staff (3+ years experience)' }
];

export const PreferencesView: React.FC<PreferencesViewProps> = ({
  currentUser,
  companies,
  onRefresh
}) => {
  // Initialize state from existing preferences or defaults matching user profile & DB
  const initialStage = currentUser.preferences?.candidate_stage || 'College Student';
  const initialStageDetail = currentUser.preferences?.candidate_stage_detail || 'Seeking internships & co-ops';
  
  // Target roles pills
  const initialTargetRoles = useMemo(() => {
    if (currentUser.preferences?.target_roles && currentUser.preferences.target_roles.length > 0) {
      return currentUser.preferences.target_roles;
    }
    if (currentUser.preferences?.role_level === 'intern') return ['Internships'];
    if (currentUser.preferences?.role_level === 'new_grad') return ['New Grad'];
    if (currentUser.preferences?.role_level === 'experienced') return ['Experienced'];
    return ['Internships', 'New Grad'];
  }, [currentUser.preferences]);

  // Countries
  const initialLocations = useMemo(() => {
    if (currentUser.preferences?.locations && currentUser.preferences.locations.length > 0) {
      return currentUser.preferences.locations;
    }
    return DEFAULT_COUNTRIES_SEED;
  }, [currentUser.preferences]);

  // Companies
  const initialCompanyIds = useMemo(() => {
    if (currentUser.preferences?.target_company_ids && currentUser.preferences.target_company_ids.length > 0) {
      return currentUser.preferences.target_company_ids;
    }
    // Match IDs from DB companies matching DEFAULT_COMPANIES_SEED
    const matched = companies
      .filter(c => DEFAULT_COMPANIES_SEED.some(seed => c.name.toLowerCase() === seed.toLowerCase()))
      .map(c => c.id);
    if (matched.length > 0) return matched;
    return companies.slice(0, 24).map(c => c.id);
  }, [currentUser.preferences, companies]);

  const [candidateStage, setCandidateStage] = useState<string>(initialStage);
  const [candidateStageDetail, setCandidateStageDetail] = useState<string>(initialStageDetail);
  const [targetRoles, setTargetRoles] = useState<string[]>(initialTargetRoles);
  const [locations, setLocations] = useState<string[]>(initialLocations);
  const [targetCompanyIds, setTargetCompanyIds] = useState<number[]>(initialCompanyIds);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState<boolean>(
    currentUser.preferences?.email_notifications_enabled ?? true
  );
  const [minRelevance, setMinRelevance] = useState<number>(currentUser.preferences?.minimum_relevance ?? 80);
  const [freshnessDays, setFreshnessDays] = useState<number>(currentUser.preferences?.posting_freshness_days ?? 7);
  const [deliveryFreq, setDeliveryFreq] = useState<string>(currentUser.preferences?.delivery_frequency || 'Instant');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(
    currentUser.preferences?.last_updated_at || 'Sep 9, 2026 · 21:42'
  );

  // UI Interactive States
  const [isStagePickerOpen, setIsStagePickerOpen] = useState(false);
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [isCompanyPickerOpen, setIsCompanyPickerOpen] = useState(false);
  const [isAlertsConfigOpen, setIsAlertsConfigOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveBannerMessage, setSaveBannerMessage] = useState<string | null>(null);

  // Initial Sync from Remote Backend on Mount
  useEffect(() => {
    ArgusDataService.syncRemotePreferences().then(remotePref => {
      if (remotePref) {
        if (remotePref.candidate_stage) setCandidateStage(remotePref.candidate_stage);
        if (remotePref.candidate_stage_detail) setCandidateStageDetail(remotePref.candidate_stage_detail);
        if (remotePref.target_roles && remotePref.target_roles.length > 0) setTargetRoles(remotePref.target_roles);
        if (remotePref.locations && remotePref.locations.length > 0) setLocations(remotePref.locations);
        if (remotePref.target_company_ids && remotePref.target_company_ids.length > 0) setTargetCompanyIds(remotePref.target_company_ids);
        if (remotePref.email_notifications_enabled !== undefined) setEmailAlertsEnabled(remotePref.email_notifications_enabled);
        if (remotePref.minimum_relevance !== undefined) setMinRelevance(remotePref.minimum_relevance);
        if (remotePref.posting_freshness_days !== undefined) setFreshnessDays(remotePref.posting_freshness_days);
        if (remotePref.delivery_frequency) setDeliveryFreq(remotePref.delivery_frequency);
        if (remotePref.last_updated_at) setLastUpdatedTime(remotePref.last_updated_at);
      }
    });
  }, []);

  // Dirty State Checker
  const isDirty = useMemo(() => {
    if (candidateStage !== initialStage) return true;
    if (candidateStageDetail !== initialStageDetail) return true;
    if (JSON.stringify(targetRoles.slice().sort()) !== JSON.stringify(initialTargetRoles.slice().sort())) return true;
    if (JSON.stringify(locations.slice().sort()) !== JSON.stringify(initialLocations.slice().sort())) return true;
    if (JSON.stringify(targetCompanyIds.slice().sort()) !== JSON.stringify(initialCompanyIds.slice().sort())) return true;
    if (emailAlertsEnabled !== (currentUser.preferences?.email_notifications_enabled ?? true)) return true;
    if (minRelevance !== (currentUser.preferences?.minimum_relevance ?? 80)) return true;
    if (freshnessDays !== (currentUser.preferences?.posting_freshness_days ?? 7)) return true;
    if (deliveryFreq !== (currentUser.preferences?.delivery_frequency || 'Instant')) return true;
    return false;
  }, [
    candidateStage, candidateStageDetail, targetRoles, locations, targetCompanyIds,
    emailAlertsEnabled, minRelevance, freshnessDays, deliveryFreq,
    initialStage, initialStageDetail, initialTargetRoles, initialLocations, initialCompanyIds,
    currentUser.preferences
  ]);

  // Derived Title for Monitoring Profile Card
  const profileHeadline = useMemo(() => {
    const hasIntern = targetRoles.includes('Internships');
    const hasNewGrad = targetRoles.includes('New Grad');
    const hasExperienced = targetRoles.includes('Experienced');
    if (hasIntern && hasNewGrad) return 'Intern + New Grad';
    if (hasIntern) return 'Internships';
    if (hasNewGrad) return 'New Grad';
    if (hasExperienced) return 'Experienced';
    return 'Custom Profile';
  }, [targetRoles]);

  // Handlers for Target Roles
  const toggleRole = (role: string) => {
    if (targetRoles.includes(role)) {
      if (targetRoles.length === 1) return; // keep at least one
      setTargetRoles(targetRoles.filter(r => r !== role));
    } else {
      setTargetRoles([...targetRoles, role]);
    }
  };

  // Handlers for Locations
  const removeLocation = (name: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLocations(locations.filter(l => l !== name));
  };

  const addLocation = (name: string) => {
    if (!locations.includes(name)) {
      setLocations([...locations, name]);
    }
  };

  // Handlers for Companies
  const removeCompany = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTargetCompanyIds(targetCompanyIds.filter(cid => cid !== id));
  };

  const addCompany = (id: number) => {
    if (!targetCompanyIds.includes(id)) {
      setTargetCompanyIds([...targetCompanyIds, id]);
    }
  };

  // Save Preferences to Database
  const handleSavePreferences = async () => {
    setIsSaving(true);
    const nowStr = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', ' ·');

    // Determine derived role_level
    let derivedRoleLevel: 'all' | 'intern' | 'new_grad' | 'experienced' = 'all';
    if (targetRoles.includes('Internships') && !targetRoles.includes('New Grad') && !targetRoles.includes('Experienced')) {
      derivedRoleLevel = 'intern';
    } else if (targetRoles.includes('New Grad') && !targetRoles.includes('Internships') && !targetRoles.includes('Experienced')) {
      derivedRoleLevel = 'new_grad';
    } else if (targetRoles.includes('Experienced') && !targetRoles.includes('Internships') && !targetRoles.includes('New Grad')) {
      derivedRoleLevel = 'experienced';
    }

    const updatedPref: UserPreferences = {
      ...currentUser.preferences,
      target_company_ids: targetCompanyIds,
      locations: locations,
      target_roles: targetRoles,
      role_level: derivedRoleLevel,
      candidate_stage: candidateStage,
      candidate_stage_detail: candidateStageDetail,
      email_notifications_enabled: emailAlertsEnabled,
      minimum_relevance: minRelevance,
      posting_freshness_days: freshnessDays,
      delivery_frequency: deliveryFreq,
      last_updated_at: nowStr
    };

    try {
      await ArgusDataService.savePreferences(updatedPref);
      AuthService.updateCurrentUser({
        preferences: updatedPref
      });
      setLastUpdatedTime(nowStr);
      setSaveBannerMessage('Preferences saved and synced to monitoring daemon.');
      setTimeout(() => setSaveBannerMessage(null), 3500);
      onRefresh();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Revert / Cancel Changes
  const handleCancel = () => {
    setCandidateStage(initialStage);
    setCandidateStageDetail(initialStageDetail);
    setTargetRoles(initialTargetRoles);
    setLocations(initialLocations);
    setTargetCompanyIds(initialCompanyIds);
    setEmailAlertsEnabled(currentUser.preferences?.email_notifications_enabled ?? true);
    setMinRelevance(currentUser.preferences?.minimum_relevance ?? 80);
    setFreshnessDays(currentUser.preferences?.posting_freshness_days ?? 7);
    setDeliveryFreq(currentUser.preferences?.delivery_frequency || 'Instant');
    setIsCountryPickerOpen(false);
    setIsCompanyPickerOpen(false);
    setIsStagePickerOpen(false);
    setIsAlertsConfigOpen(false);
  };

  // Selected Companies List
  const selectedCompanies = useMemo(() => {
    return targetCompanyIds
      .map(id => companies.find(c => c.id === id))
      .filter((c): c is Company => Boolean(c));
  }, [targetCompanyIds, companies]);

  // Filtered Companies for Picker
  const availableCompaniesFiltered = useMemo(() => {
    const q = companySearch.toLowerCase().trim();
    return companies.filter(c => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    });
  }, [companies, companySearch]);

  // Filtered Countries for Picker
  const availableCountriesFiltered = useMemo(() => {
    const q = countrySearch.toLowerCase().trim();
    return GLOBAL_COUNTRIES.filter(c => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    });
  }, [countrySearch]);

  // Company Brand Icons (vector SVG monograms)
  const renderCompanyIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('google')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', fontWeight: 800, fontSize: '12px', color: '#4285F4' }}>
          G
        </span>
      );
    }
    if (lower.includes('microsoft')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <rect width="7" height="7" fill="#F25022" />
            <rect x="9" width="7" height="7" fill="#7FBA00" />
            <rect y="9" width="7" height="7" fill="#00A4EF" />
            <rect x="9" y="9" width="7" height="7" fill="#FFB900" />
          </svg>
        </span>
      );
    }
    if (lower.includes('amazon')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', fontWeight: 900, fontSize: '13px', color: '#111827', fontFamily: 'serif' }}>
          a
        </span>
      );
    }
    if (lower.includes('meta') || lower.includes('facebook')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', fontWeight: 700, fontSize: '14px', color: '#0668E1' }}>
          M
        </span>
      );
    }
    if (lower.includes('apple')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', fontWeight: 700, fontSize: '11px', color: '#111827' }}>
          A
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '15px',
        height: '15px',
        borderRadius: '3px',
        background: '#e5e7eb',
        color: '#374151',
        fontSize: '10px',
        fontWeight: 700
      }}>
        {name.charAt(0)}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: isDirty ? '100px' : '60px' }}>
      
      {/* Top Header Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#111827',
            margin: 0,
            letterSpacing: '-0.02em',
            fontFamily: 'Plus Jakarta Sans, sans-serif'
          }}>
            Preferences
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginTop: '4px',
            marginBottom: 0
          }}>
            Configure how Argus searches, filters, and alerts you about opportunities.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
            <span style={{ fontSize: '11.5px', color: '#9ca3af', fontWeight: 500 }}>
              Last updated
            </span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12.5px',
              color: '#374151',
              fontWeight: 600
            }}>
              <Clock size={13} color="#6b7280" />
              {lastUpdatedTime}
            </span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '9999px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            fontSize: '12px',
            fontWeight: 600,
            color: '#15803d'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              display: 'inline-block'
            }} />
            <span>Monitoring active</span>
          </div>
        </div>
      </div>

      {saveBannerMessage && (
        <div style={{
          padding: '12px 18px',
          marginBottom: '20px',
          borderRadius: '8px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={16} color="#059669" />
          <span>{saveBannerMessage}</span>
        </div>
      )}

      {/* Main Two-Column Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.7fr) minmax(320px, 1fr)',
        gap: '24px',
        alignItems: 'start'
      }}>

        {/* LEFT COLUMN: 5 Configuration Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* 1. Profile Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            <div
              onClick={() => setIsStagePickerOpen(!isStagePickerOpen)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ color: '#111827', display: 'flex', alignItems: 'center' }}>
                  <User size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    Profile
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    Select your current stage and target roles.
                  </p>
                </div>
              </div>
              <ChevronRight
                size={18}
                color="#9ca3af"
                style={{
                  transform: isStagePickerOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s ease'
                }}
              />
            </div>

            {/* Inner Profile Stage Box */}
            <div
              onClick={() => setIsStagePickerOpen(!isStagePickerOpen)}
              style={{
                marginTop: '16px',
                padding: '14px 18px',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <div>
                <span style={{ fontSize: '11.5px', color: '#9ca3af', fontWeight: 500, display: 'block' }}>
                  Current stage
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', display: 'block', marginTop: '2px' }}>
                  {candidateStage}
                </span>
                <span style={{ fontSize: '12.5px', color: '#6b7280', display: 'block', marginTop: '1px' }}>
                  {candidateStageDetail}
                </span>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </div>

            {/* Stage Selector Dropdown / Tray */}
            {isStagePickerOpen && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '8px'
              }}>
                {STAGE_OPTIONS.map(opt => {
                  const isSelected = candidateStage === opt.stage;
                  return (
                    <div
                      key={opt.stage}
                      onClick={() => {
                        setCandidateStage(opt.stage);
                        setCandidateStageDetail(opt.detail);
                        setIsStagePickerOpen(false);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: isSelected ? '1.5px solid #8b1d2c' : '1px solid #e5e7eb',
                        backgroundColor: isSelected ? '#fdf2f2' : '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#8b1d2c' : '#111827' }}>
                          {opt.stage}
                        </span>
                        {isSelected && <Check size={14} color="#8b1d2c" />}
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#6b7280', display: 'block', marginTop: '2px' }}>
                        {opt.detail}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Target Roles Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ color: '#111827', display: 'flex', alignItems: 'center' }}>
                  <Briefcase size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    Target roles
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    Choose the roles Argus should consider relevant.
                  </p>
                </div>
              </div>
              <ChevronRight size={18} color="#9ca3af" />
            </div>

            {/* Target Role Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
              {[
                { id: 'Internships', label: 'Internships' },
                { id: 'New Grad', label: 'New Grad' },
                { id: 'Experienced', label: 'Experienced' }
              ].map(roleItem => {
                const isSelected = targetRoles.includes(roleItem.id);
                return (
                  <button
                    key={roleItem.id}
                    type="button"
                    onClick={() => toggleRole(roleItem.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 18px',
                      borderRadius: '9999px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: isSelected ? '1px solid #8b1d2c' : '1px solid #d1d5db',
                      backgroundColor: isSelected ? '#8b1d2c' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#374151',
                      boxShadow: isSelected ? '0 1px 2px rgba(139, 29, 44, 0.2)' : 'none'
                    }}
                  >
                    {isSelected ? (
                      <Check size={14} strokeWidth={3} color="#ffffff" />
                    ) : (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#d1d5db',
                        display: 'inline-block'
                      }} />
                    )}
                    <span>{roleItem.label}</span>
                  </button>
                );
              })}
            </div>

            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '14px',
              marginBottom: 0
            }}>
              Strict filtering enabled · Non-matching roles are excluded from alerts.
            </p>
          </div>

          {/* 3. Geography Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            <div
              onClick={() => setIsCountryPickerOpen(!isCountryPickerOpen)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ color: '#111827', display: 'flex', alignItems: 'center' }}>
                  <Globe size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    Geography
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    Select countries and locations to monitor.
                  </p>
                </div>
              </div>
              <ChevronRight
                size={18}
                color="#9ca3af"
                style={{
                  transform: isCountryPickerOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s ease'
                }}
              />
            </div>

            {/* Country Pills Container */}
            <div style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#6b7280',
                marginBottom: '10px'
              }}>
                {locations.length} countries selected
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {locations.slice(0, 4).map(loc => (
                  <span
                    key={loc}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#1f2937'
                    }}
                  >
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#d1d5db'
                    }} />
                    <span>{loc}</span>
                    <button
                      type="button"
                      onClick={(e) => removeLocation(loc, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '0 2px',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={`Remove ${loc}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}

                {locations.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setIsCountryPickerOpen(!isCountryPickerOpen)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#4b5563',
                      cursor: 'pointer'
                    }}
                  >
                    +{locations.length - 4} more
                  </button>
                )}
              </div>
            </div>

            {/* Country Picker Drawer / Modal Tray */}
            {isCountryPickerOpen && (
              <div style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: 1,
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    padding: '6px 12px'
                  }}>
                    <Search size={14} color="#9ca3af" />
                    <input
                      type="text"
                      placeholder="Search countries..."
                      value={countrySearch}
                      onChange={e => setCountrySearch(e.target.value)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        width: '100%',
                        fontSize: '12.5px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {availableCountriesFiltered.map(c => {
                    const isSelected = locations.includes(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => isSelected ? removeLocation(c.name) : addLocation(c.name)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: isSelected ? '1px solid #8b1d2c' : '1px solid #e5e7eb',
                          backgroundColor: isSelected ? '#fdf2f2' : '#ffffff',
                          color: isSelected ? '#8b1d2c' : '#374151',
                          fontSize: '12px',
                          fontWeight: isSelected ? 600 : 400,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {isSelected && <Check size={12} color="#8b1d2c" />}
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. Company Watchlist Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            <div
              onClick={() => setIsCompanyPickerOpen(!isCompanyPickerOpen)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ color: '#111827', display: 'flex', alignItems: 'center' }}>
                  <Building2 size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    Company watchlist
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    Add companies you want to track.
                  </p>
                </div>
              </div>
              <ChevronRight
                size={18}
                color="#9ca3af"
                style={{
                  transform: isCompanyPickerOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s ease'
                }}
              />
            </div>

            {/* Company Pills Container */}
            <div style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#6b7280',
                marginBottom: '10px'
              }}>
                {selectedCompanies.length} companies
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {selectedCompanies.slice(0, 4).map(c => (
                  <span
                    key={c.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#1f2937'
                    }}
                  >
                    {renderCompanyIcon(c.name)}
                    <span>{c.name}</span>
                    <button
                      type="button"
                      onClick={(e) => removeCompany(c.id, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '0 2px',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={`Remove ${c.name}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}

                {selectedCompanies.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setIsCompanyPickerOpen(!isCompanyPickerOpen)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#4b5563',
                      cursor: 'pointer'
                    }}
                  >
                    +{selectedCompanies.length - 4} more
                  </button>
                )}
              </div>
            </div>

            {/* Company Picker Drawer */}
            {isCompanyPickerOpen && (
              <div style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: 1,
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    padding: '6px 12px'
                  }}>
                    <Search size={14} color="#9ca3af" />
                    <input
                      type="text"
                      placeholder="Search companies in database..."
                      value={companySearch}
                      onChange={e => setCompanySearch(e.target.value)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        width: '100%',
                        fontSize: '12.5px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {availableCompaniesFiltered.map(c => {
                    const isSelected = targetCompanyIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => isSelected ? removeCompany(c.id) : addCompany(c.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: isSelected ? '1px solid #8b1d2c' : '1px solid #e5e7eb',
                          backgroundColor: isSelected ? '#fdf2f2' : '#ffffff',
                          color: isSelected ? '#8b1d2c' : '#374151',
                          fontSize: '12px',
                          fontWeight: isSelected ? 600 : 400,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          textAlign: 'left'
                        }}
                      >
                        {renderCompanyIcon(c.name)}
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.name}
                        </span>
                        {isSelected && <Check size={12} color="#8b1d2c" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 5. Email Alerts Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            <div
              onClick={() => setIsAlertsConfigOpen(!isAlertsConfigOpen)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ color: '#111827', display: 'flex', alignItems: 'center' }}>
                  <Mail size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    Email alerts
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    Set when and how you want to be notified.
                  </p>
                </div>
              </div>
              <ChevronRight
                size={18}
                color="#9ca3af"
                style={{
                  transform: isAlertsConfigOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s ease'
                }}
              />
            </div>

            {/* 4-Item Grid */}
            <div style={{
              marginTop: '16px',
              padding: '16px 20px',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px'
            }}>
              {/* Item 1: Email Notifications */}
              <div
                onClick={() => setEmailAlertsEnabled(!emailAlertsEnabled)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title="Click to toggle email notifications"
              >
                <span style={{ fontSize: '11.5px', color: '#9ca3af', fontWeight: 500, display: 'block' }}>
                  Email notifications
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: emailAlertsEnabled ? '#15803d' : '#9ca3af',
                  marginTop: '4px'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: emailAlertsEnabled ? '#22c55e' : '#9ca3af'
                  }} />
                  {emailAlertsEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {/* Item 2: Minimum Relevance */}
              <div
                onClick={() => setIsAlertsConfigOpen(true)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontSize: '11.5px', color: '#9ca3af', fontWeight: 500, display: 'block' }}>
                  Minimum relevance
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', display: 'block', marginTop: '4px' }}>
                  {minRelevance}%
                </span>
              </div>

              {/* Item 3: Posting Freshness */}
              <div
                onClick={() => setIsAlertsConfigOpen(true)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontSize: '11.5px', color: '#9ca3af', fontWeight: 500, display: 'block' }}>
                  Posting freshness
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', display: 'block', marginTop: '4px' }}>
                  {freshnessDays} days
                </span>
              </div>

              {/* Item 4: Delivery */}
              <div
                onClick={() => setIsAlertsConfigOpen(true)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontSize: '11.5px', color: '#9ca3af', fontWeight: 500, display: 'block' }}>
                  Delivery
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', display: 'block', marginTop: '4px' }}>
                  {deliveryFreq}
                </span>
              </div>
            </div>

            {/* Email Alerts Advanced Config */}
            {isAlertsConfigOpen && (
              <div style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px'
              }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Relevance Threshold
                  </label>
                  <select
                    value={minRelevance}
                    onChange={e => setMinRelevance(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '12px'
                    }}
                  >
                    <option value={70}>70% (Broader)</option>
                    <option value={75}>75% (Balanced)</option>
                    <option value={80}>80% (Recommended)</option>
                    <option value={85}>85% (High match)</option>
                    <option value={90}>90% (Strict)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Freshness Window
                  </label>
                  <select
                    value={freshnessDays}
                    onChange={e => setFreshnessDays(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '12px'
                    }}
                  >
                    <option value={1}>1 day (24 hours)</option>
                    <option value={3}>3 days</option>
                    <option value={7}>7 days (Standard)</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Delivery Timing
                  </label>
                  <select
                    value={deliveryFreq}
                    onChange={e => setDeliveryFreq(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '12px'
                    }}
                  >
                    <option value="Instant">Instant (Per Posting)</option>
                    <option value="Daily Digest">Daily Digest (Evening)</option>
                    <option value="Weekly Summary">Weekly Summary</option>
                  </select>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Summary & Monitoring Flow Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          position: 'sticky',
          top: '24px'
        }}>
          {/* Header Profile Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8b1d2c',
              flexShrink: 0
            }}>
              <Target size={22} strokeWidth={2.2} />
            </div>
            <div>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: '#6b7280',
                textTransform: 'uppercase',
                display: 'block'
              }}>
                YOUR MONITORING PROFILE
              </span>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#111827',
                margin: '2px 0 0 0',
                letterSpacing: '-0.01em'
              }}>
                {profileHeadline}
              </h2>
            </div>
          </div>

          {/* 2x2 Metrics Block */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                {locations.length}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Countries
              </div>
            </div>

            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                {selectedCompanies.length}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Companies
              </div>
            </div>

            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                Email
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Alerts
              </div>
            </div>

            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                {deliveryFreq}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Delivery
              </div>
            </div>
          </div>

          {/* Soft Red Callout Box */}
          <div style={{
            backgroundColor: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{ color: '#8b1d2c', marginTop: '1px' }}>
              <Target size={18} />
            </div>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'block' }}>
                Argus will monitor
              </span>
              <span style={{ fontSize: '12px', color: '#4b5563', display: 'block', marginTop: '2px', lineHeight: 1.4 }}>
                Relevant software engineering opportunities matching your profile.
              </span>
            </div>
          </div>

          {/* Stepper Divider */}
          <div style={{
            borderTop: '1px solid #e5e7eb',
            paddingTop: '20px',
            marginBottom: '16px'
          }}>
            <span style={{
              fontSize: '11.5px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: '#6b7280',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '16px'
            }}>
              MONITORING FLOW
            </span>

            {/* Stepper Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              {[
                { step: '1', title: 'Apply profile filters', desc: 'Career stage, roles, geography' },
                { step: '2', title: 'Match with job postings', desc: 'From partnered platforms & ATS' },
                { step: '3', title: 'Apply differential filters', desc: 'Company watchlist, relevance threshold' },
                { step: '4', title: 'Trigger alerts', desc: 'When a match is found' },
                { step: '5', title: 'Deliver via email', desc: 'Instant / digest as per your setting' }
              ].map((item, idx, arr) => (
                <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', position: 'relative' }}>
                  {/* Vertical connecting line */}
                  {idx < arr.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: '11px',
                      top: '22px',
                      bottom: '-16px',
                      width: '2px',
                      backgroundColor: '#e5e7eb',
                      zIndex: 1
                    }} />
                  )}

                  {/* Red Circle Number */}
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#8b1d2c',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 2
                  }}>
                    {item.step}
                  </div>

                  {/* Step Text */}
                  <div style={{ minWidth: 0, marginTop: '2px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '1px' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Floating Bottom Unsaved Changes Bar */}
      {isDirty && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e5e7eb',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
          padding: '14px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          animation: 'slideUp 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>
              Unsaved changes
            </span>
            <span style={{ fontSize: '13.5px', color: '#6b7280' }}>
              Your monitoring configuration has changed.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={isSaving}
              style={{
                padding: '8px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#8b1d2c',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSaving ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(139, 29, 44, 0.3)'
              }}
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { 
  Radio, 
  ArrowRight, 
  Check, 
  Plus, 
  Trash2, 
  ArrowLeft 
} from 'lucide-react';
import { AppRoute, UserProfile, Company, Project } from '../../types';
import { AuthService } from '../../services/auth';
import { ArgusDataService } from '../../services/api';

interface OnboardingFlowProps {
  currentUser: UserProfile;
  onFinish: () => void;
  onNavigate: (route: AppRoute) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  currentUser,
  onFinish
}) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Profile
  const [fullName, setFullName] = useState(currentUser.full_name || '');
  const [headline, setHeadline] = useState(currentUser.headline || 'Systems & Backend Software Engineer');
  const [currentStatus, setCurrentStatus] = useState(currentUser.current_status || 'new_grad');
  const [location, setLocation] = useState(currentUser.location || 'Bengaluru, India');
  const [targetLocation, setTargetLocation] = useState(currentUser.target_location || 'India / Remote / US');

  // Step 2: Job Preferences
  const [preferredRoles, setPreferredRoles] = useState<string[]>(
    currentUser.preferences?.preferred_roles || ['Software Engineer Intern', 'Software Engineer New Grad', 'Backend Engineer']
  );
  const [focusAreas, setFocusAreas] = useState<string[]>(
    currentUser.preferences?.focus_areas || ['Backend', 'Infrastructure', 'Distributed Systems']
  );
  const [locationsList, setLocationsList] = useState<string[]>(
    currentUser.preferences?.locations || ['India', 'Remote', 'United States']
  );

  // Step 3: Companies
  const [allCompanies] = useState<Company[]>(ArgusDataService.getCompanies());
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>(
    currentUser.preferences?.target_company_ids || [1, 2, 3, 4, 9, 10, 11, 13, 17, 18]
  );
  const [companySearch, setCompanySearch] = useState('');

  // Step 4: Quick Portfolio Ground Truth
  const [projects, setProjects] = useState<Project[]>(currentUser.projects || []);
  const [newProjName, setNewProjName] = useState('');
  const [newProjTech, setNewProjTech] = useState('');
  const [newProjSummary, setNewProjSummary] = useState('');

  const handleAddQuickProject = () => {
    if (!newProjName.trim()) return;
    const proj: Project = {
      id: `proj-${Date.now()}`,
      name: newProjName.trim(),
      tech_stack: newProjTech.split(',').map(s => s.trim()).filter(Boolean),
      tags: ['backend', 'systems'],
      summary: newProjSummary.trim() || 'Software engineering project.',
      quantified_bullets: [
        `Engineered core architecture in ${newProjTech || 'Go/Java'} optimizing throughput and system reliability.`
      ],
      resume_variants: {}
    };
    setProjects([...projects, proj]);
    setNewProjName('');
    setNewProjTech('');
    setNewProjSummary('');
  };

  const handleRemoveProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  const handleToggleCompany = (id: number) => {
    if (selectedCompanyIds.includes(id)) {
      setSelectedCompanyIds(selectedCompanyIds.filter(cId => cId !== id));
    } else {
      setSelectedCompanyIds([...selectedCompanyIds, id]);
    }
  };

  const handleSaveAndProceed = () => {
    if (step === 1) {
      AuthService.updateCurrentUser({
        full_name: fullName,
        headline,
        current_status: currentStatus as any,
        location,
        target_location: targetLocation
      });
      setStep(2);
    } else if (step === 2) {
      AuthService.updateCurrentUser({
        preferences: {
          ...currentUser.preferences,
          preferred_roles: preferredRoles,
          focus_areas: focusAreas,
          locations: locationsList
        }
      });
      setStep(3);
    } else if (step === 3) {
      AuthService.updateCurrentUser({
        preferences: {
          ...currentUser.preferences,
          target_company_ids: selectedCompanyIds
        }
      });
      setStep(4);
    } else if (step === 4) {
      AuthService.updateCurrentUser({
        projects
      });
      setStep(5);
    } else if (step === 5) {
      AuthService.updateCurrentUser({
        onboarding_completed: true
      });
      onFinish();
    }
  };

  const filteredCompanies = allCompanies.filter(c => 
    c.name.toLowerCase().includes(companySearch.toLowerCase()) || 
    c.category.toLowerCase().includes(companySearch.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header style={{
        height: '64px',
        backgroundColor: 'var(--bg-white)',
        borderBottom: '1px solid var(--gray-200)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="brand-icon-box" style={{ width: '32px', height: '32px' }}>
            <Radio size={16} color="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 800, color: 'var(--primary-navy)' }}>
            ARGUS
          </span>
          <span style={{ fontSize: '12px', color: 'var(--gray-500)', marginLeft: '6px' }}>
            Setup Wizard
          </span>
        </div>

        <button
          className="btn-ghost btn-sm"
          onClick={() => {
            AuthService.updateCurrentUser({ onboarding_completed: true });
            onFinish();
          }}
          style={{ fontSize: '12.5px' }}
        >
          Skip Setup →
        </button>
      </header>

      {/* Main Stepper Container */}
      <div style={{ flex: 1, maxWidth: '780px', width: '100%', margin: '40px auto', padding: '0 20px' }}>
        {/* Step Progress Pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          {[
            { num: 1, label: 'Profile' },
            { num: 2, label: 'Preferences' },
            { num: 3, label: 'Companies' },
            { num: 4, label: 'Portfolio' },
            { num: 5, label: 'Ready' }
          ].map(s => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: step === s.num ? 'var(--primary-navy)' : step > s.num ? 'var(--color-success)' : 'var(--gray-200)',
                color: step >= s.num ? 'white' : 'var(--gray-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '12px'
              }}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span style={{ fontSize: '13px', fontWeight: step === s.num ? 700 : 500, color: step === s.num ? 'var(--primary-navy)' : 'var(--gray-600)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Card Box */}
        <div className="card-surface" style={{ padding: '36px', boxShadow: 'var(--shadow-md)' }}>
          {/* STEP 1: PROFILE */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '6px' }}>
                  Tell Argus about yourself.
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                  This basic identity anchors your matching evidence and career telemetry.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Professional headline</label>
                  <input
                    type="text"
                    className="form-input"
                    value={headline}
                    onChange={e => setHeadline(e.target.value)}
                    placeholder="e.g. Systems & Infrastructure Software Engineer | Distributed Systems"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Current status</label>
                  <select
                    className="form-select"
                    value={currentStatus}
                    onChange={e => setCurrentStatus(e.target.value as any)}
                  >
                    <option value="student">Student (Undergrad / Master's)</option>
                    <option value="intern">Intern</option>
                    <option value="new_grad">New Graduate (2025/2026/2027)</option>
                    <option value="swe">Software Engineer</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Current location</label>
                    <input
                      type="text"
                      className="form-input"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Bengaluru, India"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target location</label>
                    <input
                      type="text"
                      className="form-input"
                      value={targetLocation}
                      onChange={e => setTargetLocation(e.target.value)}
                      placeholder="India / US / Remote"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: JOB PREFERENCES */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '6px' }}>
                  What roles are you looking for?
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                  Argus only notifies you when a genuinely new posting matches these specific preferences.
                </p>
              </div>

              {/* Roles */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Preferred Role Types
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    'Software Engineer Intern',
                    'Software Engineer New Grad',
                    'Backend Engineer',
                    'Infrastructure Engineer',
                    'Systems Engineer',
                    'Full Stack Engineer',
                    'AI/ML Engineer',
                    'Quantitative Developer'
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
                          padding: '6px 14px',
                          borderRadius: '20px',
                          border: isSelected ? '1.5px solid var(--primary-navy)' : '1px solid var(--gray-300)',
                          backgroundColor: isSelected ? 'var(--primary-navy)' : 'var(--bg-white)',
                          color: isSelected ? 'white' : 'var(--gray-800)',
                          fontSize: '13px',
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
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Focus Areas & Technical Domains
                </label>
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
                    'Frontend'
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
                          padding: '6px 14px',
                          borderRadius: '20px',
                          border: isSelected ? '1.5px solid var(--accent-crimson)' : '1px solid var(--gray-300)',
                          backgroundColor: isSelected ? 'var(--accent-crimson)' : 'var(--bg-white)',
                          color: isSelected ? 'white' : 'var(--gray-800)',
                          fontSize: '13px',
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

              {/* Locations */}
              <div>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Eligible Locations
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['United States (US)', 'India', 'United Kingdom (UK)', 'Ireland', 'Germany', 'Switzerland', 'Canada', 'Singapore', 'Netherlands', 'France', 'Australia', 'Japan', 'Poland', 'Israel', 'UAE', 'Remote / Virtual'].map(loc => {
                    const isSelected = locationsList.includes(loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          if (isSelected) setLocationsList(locationsList.filter(l => l !== loc));
                          else setLocationsList([...locationsList, loc]);
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          border: isSelected ? '1.5px solid var(--primary-navy)' : '1px solid var(--gray-300)',
                          backgroundColor: isSelected ? 'var(--primary-navy-tint)' : 'var(--bg-white)',
                          color: isSelected ? 'var(--primary-navy)' : 'var(--gray-800)',
                          fontSize: '13px',
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
            </div>
          )}

          {/* STEP 3: TARGET COMPANIES */}
          {step === 3 && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '6px' }}>
                  Which companies do you want to watch?
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                  Argus polls official career ATS portals directly. Select companies for your watchlist ({selectedCompanyIds.length} selected).
                </p>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by company name (e.g. Goldman, Citadel, Stripe, Google)..."
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                />
              </div>

              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid var(--gray-200)',
                borderRadius: 'var(--border-radius-sm)',
                padding: '8px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '8px' }}>
                  {filteredCompanies.map(c => {
                    const isSelected = selectedCompanyIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleToggleCompany(c.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--border-radius-sm)',
                          border: isSelected ? '1.5px solid var(--primary-navy)' : '1px solid var(--gray-200)',
                          backgroundColor: isSelected ? 'var(--primary-navy-tint)' : 'var(--bg-white)',
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
                            {c.ats_type} ATS
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ accentColor: 'var(--primary-navy)' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PORTFOLIO GROUND TRUTH */}
          {step === 4 && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '6px' }}>
                  What have you built?
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                  Your projects and verified experience become the <strong>ground truth</strong> for Argus matching.
                </p>
              </div>

              {/* Existing Projects List */}
              {projects.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Your Added Projects ({projects.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {projects.map(p => (
                      <div key={p.id} style={{
                        padding: '12px 14px',
                        border: '1px solid var(--gray-200)',
                        borderRadius: 'var(--border-radius-sm)',
                        backgroundColor: 'var(--gray-25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '14px' }}>
                            {p.name}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--gray-500)', marginLeft: '8px' }}>
                            ({p.tech_stack.join(', ')})
                          </span>
                          <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '2px' }}>
                            {p.summary}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => handleRemoveProject(p.id)}
                          style={{ color: 'var(--accent-crimson)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Add Project Form */}
              <div style={{
                padding: '16px',
                border: '1px dashed var(--gray-300)',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: 'var(--bg-white)',
                marginBottom: '10px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '12px' }}>
                  + Quick Add A Project
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Project Name (e.g. NioFlow, Evora)"
                    value={newProjName}
                    onChange={e => setNewProjName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Tech Stack (comma separated, e.g. Go, Raft, gRPC)"
                    value={newProjTech}
                    onChange={e => setNewProjTech(e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="One sentence summary of what you built and the metrics achieved..."
                  value={newProjSummary}
                  onChange={e => setNewProjSummary(e.target.value)}
                  style={{ marginBottom: '10px' }}
                />
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={handleAddQuickProject}
                >
                  <Plus size={14} />
                  <span>Add Project to Portfolio</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: READY */}
          {step === 5 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success-bg)',
                border: '2px solid var(--color-success-border)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <Check size={32} />
              </div>

              <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '8px' }}>
                Your Argus intelligence layer is ready.
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--gray-600)', maxWidth: '520px', margin: '0 auto 28px' }}>
                Argus is now actively watching your selected official career portals and ready to match incoming postings against your portfolio.
              </p>

              {/* Ready Summary Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                textAlign: 'left',
                maxWidth: '480px',
                margin: '0 auto 32px'
              }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--gray-200)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 600 }}>CANDIDATE PROFILE</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-navy)' }}>{fullName || currentUser.full_name}</div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--gray-200)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 600 }}>TARGET COMPANIES</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-navy)' }}>{selectedCompanyIds.length} Companies</div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--gray-200)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 600 }}>PORTFOLIO GROUND TRUTH</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-navy)' }}>{projects.length} Projects Loaded</div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--gray-200)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 600 }}>DIFFERENTIAL MATCHER</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-success)' }}>Active & Armed</div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--gray-200)',
            paddingTop: '24px',
            marginTop: '28px'
          }}>
            {step > 1 ? (
              <button
                className="btn-secondary"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            ) : <div />}

            <button
              className="btn-primary"
              onClick={handleSaveAndProceed}
              style={{ padding: '10px 24px' }}
            >
              <span>{step === 5 ? 'Open Argus Dashboard' : 'Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

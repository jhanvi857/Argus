import React, { useState, useEffect } from 'react';
import { UserProfile, AppRoute } from '../../types';
import { AuthService } from '../../services/auth';
import { Check, CheckCircle2 } from 'lucide-react';

interface ProfileOverviewViewProps {
  currentUser: UserProfile;
  profileCompletion: { percentage: number; missing: string[] };
  onNavigate: (route: AppRoute) => void;
  onEditProfileModal?: () => void;
  onRefresh?: () => void;
}

export const ProfileOverviewView: React.FC<ProfileOverviewViewProps> = ({
  currentUser,
  profileCompletion: _profileCompletion,
  onNavigate,
  onRefresh
}) => {
  const [fullName, setFullName] = useState(currentUser.full_name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [location, setLocation] = useState(currentUser.location || '');
  const [degree, setDegree] = useState(currentUser.education?.[0]?.degree || '');
  const [university, setUniversity] = useState(currentUser.education?.[0]?.institution || '');
  const [graduationYear, setGraduationYear] = useState(currentUser.education?.[0]?.end_date || '');

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFullName(currentUser.full_name || '');
    setEmail(currentUser.email || '');
    setLocation(currentUser.location || '');
    setDegree(currentUser.education?.[0]?.degree || '');
    setUniversity(currentUser.education?.[0]?.institution || '');
    setGraduationYear(currentUser.education?.[0]?.end_date || '');
  }, [currentUser]);

  const topSkills = currentUser.skills?.slice(0, 10).map(s => s.name) || [];
  const experiences = currentUser.experiences || [];

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    const updatedEducation = currentUser.education && currentUser.education.length > 0
      ? [{
          ...currentUser.education[0],
          degree: degree.trim(),
          institution: university.trim(),
          end_date: graduationYear.trim()
        }, ...currentUser.education.slice(1)]
      : (degree.trim() || university.trim() || graduationYear.trim()
        ? [{
            id: 'edu-1',
            institution: university.trim(),
            degree: degree.trim() || 'Bachelor of Science',
            field_of_study: 'Computer Science',
            start_date: '2022',
            end_date: graduationYear.trim(),
            is_current: false
          }]
        : []);

    AuthService.updateCurrentUser({
      full_name: fullName.trim(),
      email: email.trim(),
      location: location.trim(),
      education: updatedEducation
    });

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header-container">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">
            Tell us about yourself and your goals.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 22px',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            borderRadius: 'var(--border-radius-sm)',
            fontWeight: 600,
            cursor: isSaving ? 'wait' : 'pointer'
          }}
        >
          <Check size={16} />
          <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div style={{
          padding: '12px 18px',
          marginBottom: '20px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--border-radius-sm)',
          color: '#065f46',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} color="#059669" />
          <span>Profile information updated successfully!</span>
        </div>
      )}

      {/* Basic Information Form */}
      <form onSubmit={handleSave} className="card-surface" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
            Basic Information
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
            Editable fields · Click Save Profile to apply
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--gray-700)' }}>
              Full name
            </label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Enter your full name"
              style={{ backgroundColor: '#ffffff' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--gray-700)' }}>
              Email
            </label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email address"
              style={{ backgroundColor: '#ffffff' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--gray-700)' }}>
              Location
            </label>
            <input
              type="text"
              className="form-input"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Ahmedabad, India"
              style={{ backgroundColor: '#ffffff' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--gray-700)' }}>
              Degree
            </label>
            <input
              type="text"
              className="form-input"
              value={degree}
              onChange={e => setDegree(e.target.value)}
              placeholder="e.g. B.Tech in Computer Science"
              style={{ backgroundColor: '#ffffff' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--gray-700)' }}>
              University
            </label>
            <input
              type="text"
              className="form-input"
              value={university}
              onChange={e => setUniversity(e.target.value)}
              placeholder="e.g. National Institute of Technology"
              style={{ backgroundColor: '#ffffff' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--gray-700)' }}>
              Graduation Year
            </label>
            <input
              type="text"
              className="form-input"
              value={graduationYear}
              onChange={e => setGraduationYear(e.target.value)}
              placeholder="e.g. 2026"
              style={{ backgroundColor: '#ffffff' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSaving}
            style={{ padding: '9px 24px', borderRadius: 'var(--border-radius-sm)', fontWeight: 600 }}
          >
            {isSaving ? 'Saving...' : 'Save Basic Info'}
          </button>
        </div>
      </form>

      {/* Skills Section */}
      <div className="card-surface" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)' }}>
            Skills
          </h2>
          <button
            className="btn-ghost btn-sm"
            onClick={() => onNavigate('profile_skills')}
            style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}
          >
            Edit →
          </button>
        </div>

        {topSkills.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--gray-500)', fontStyle: 'italic' }}>
            No skills added yet. Add your skills to improve job matching.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {topSkills.map((skill, i) => (
              <span key={i} className="badge-tag" style={{
                fontSize: '12.5px',
                padding: '5px 14px',
                borderRadius: 'var(--border-radius-full)'
              }}>
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Experience Section */}
      <div className="card-surface" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)' }}>
            Experience
          </h2>
          <button
            className="btn-ghost btn-sm"
            onClick={() => onNavigate('profile_experience')}
            style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}
          >
            Edit →
          </button>
        </div>

        {experiences.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--gray-500)', fontStyle: 'italic' }}>
            No experience added yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {experiences.map((exp) => (
              <div key={exp.id} style={{
                display: 'flex',
                gap: '14px',
                padding: '14px',
                background: 'var(--gray-50)',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--gray-200)'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: 'var(--border-radius-sm)',
                  background: 'var(--primary-tint)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '14px', flexShrink: 0
                }}>
                  {exp.company.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)' }}>
                    {exp.position}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--gray-600)' }}>
                    {exp.company} · {exp.start_date} – {exp.end_date || 'Present'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

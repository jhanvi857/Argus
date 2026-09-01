import React from 'react';
import { UserProfile, AppRoute } from '../../types';

interface ProfileOverviewViewProps {
  currentUser: UserProfile;
  profileCompletion: { percentage: number; missing: string[] };
  onNavigate: (route: AppRoute) => void;
  onEditProfileModal: () => void;
}

export const ProfileOverviewView: React.FC<ProfileOverviewViewProps> = ({
  currentUser,
  profileCompletion: _profileCompletion,
  onNavigate,
  onEditProfileModal
}) => {
  const topSkills = currentUser.skills?.slice(0, 10).map(s => s.name) || [];

  const experiences = currentUser.experiences || [];

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

        <button className="btn-outline-primary" onClick={onEditProfileModal}>
          Profile
        </button>
      </div>

      {/* Basic Information Form */}
      <div className="card-surface" style={{ padding: '28px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '20px' }}>
          Basic Information
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input
              type="text"
              className="form-input"
              value={currentUser.full_name || ''}
              readOnly
              style={{ backgroundColor: 'var(--gray-50)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={currentUser.email || ''}
              readOnly
              style={{ backgroundColor: 'var(--gray-50)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              className="form-input"
              value={currentUser.location || ''}
              readOnly
              style={{ backgroundColor: 'var(--gray-50)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Degree</label>
            <input
              type="text"
              className="form-input"
              value={currentUser.education?.[0] ? `${currentUser.education[0].degree} in ${currentUser.education[0].field_of_study}` : ''}
              readOnly
              style={{ backgroundColor: 'var(--gray-50)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">University</label>
            <input
              type="text"
              className="form-input"
              value={currentUser.education?.[0]?.institution || ''}
              readOnly
              style={{ backgroundColor: 'var(--gray-50)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Graduation Year</label>
            <input
              type="text"
              className="form-input"
              value={currentUser.education?.[0]?.end_date || ''}
              readOnly
              style={{ backgroundColor: 'var(--gray-50)' }}
            />
          </div>
        </div>
      </div>

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

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn-primary"
          onClick={onEditProfileModal}
          style={{ padding: '10px 28px', borderRadius: 'var(--border-radius-sm)' }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

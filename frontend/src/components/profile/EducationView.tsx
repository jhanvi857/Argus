import React, { useState } from 'react';
import { GraduationCap, Plus, Edit3, Trash2, Check, X } from 'lucide-react';
import { Education, UserProfile } from '../../types';
import { ArgusDataService } from '../../services/api';

interface EducationViewProps {
  currentUser: UserProfile;
  onRefresh: () => void;
}

export const EducationView: React.FC<EducationViewProps> = ({
  currentUser,
  onRefresh
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);

  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(true);
  const [gpa, setGpa] = useState('');
  const [courseworkInput, setCourseworkInput] = useState('');

  const educationList = currentUser.education || [];

  const handleOpenAdd = () => {
    setEditingEdu(null);
    setInstitution('');
    setDegree('Bachelor of Technology (B.Tech)');
    setFieldOfStudy('Computer Science and Engineering');
    setStartDate('2022-08');
    setEndDate('2026-05');
    setIsCurrent(true);
    setGpa('');
    setCourseworkInput('Distributed Systems, Operating Systems, Computer Networks, Database Internals');
    setModalOpen(true);
  };

  const handleOpenEdit = (edu: Education) => {
    setEditingEdu(edu);
    setInstitution(edu.institution);
    setDegree(edu.degree);
    setFieldOfStudy(edu.field_of_study);
    setStartDate(edu.start_date);
    setEndDate(edu.end_date || '');
    setIsCurrent(edu.is_current);
    setGpa(edu.gpa || '');
    setCourseworkInput((edu.coursework || []).join(', '));
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this education record?')) {
      ArgusDataService.deleteEducation(id);
      onRefresh();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution.trim() || !degree.trim()) return;

    const coursework = courseworkInput.split(',').map(s => s.trim()).filter(Boolean);

    const eduData: Education = {
      id: editingEdu ? editingEdu.id : `edu-${Date.now()}`,
      institution: institution.trim(),
      degree: degree.trim(),
      field_of_study: fieldOfStudy.trim(),
      start_date: startDate.trim(),
      end_date: isCurrent ? undefined : endDate.trim(),
      is_current: isCurrent,
      gpa: gpa.trim() || undefined,
      coursework: coursework.length > 0 ? coursework : undefined
    };

    ArgusDataService.saveEducation(eduData);
    setModalOpen(false);
    onRefresh();
  };

  return (
    <div>
      <div className="page-header-container">
        <div>
          <h1 className="page-title">Education & Academics</h1>
          <p className="page-subtitle">
            Degrees, academic background, graduation dates, and relevant coursework.
          </p>
        </div>

        <button className="btn-primary" onClick={handleOpenAdd}>
          <Plus size={15} />
          <span>Add Education</span>
        </button>
      </div>

      {educationList.length === 0 ? (
        <div className="card-surface" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <GraduationCap size={40} color="var(--gray-400)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '6px' }}>
            No education entries added yet.
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--gray-600)', maxWidth: '420px', margin: '0 auto 18px' }}>
            Add your degree and graduation timeline so Argus can match eligibility for intern / new-grad opportunities.
          </p>
          <button className="btn-primary btn-sm" onClick={handleOpenAdd}>
            <Plus size={14} />
            <span>Add Education</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {educationList.map(edu => (
            <div key={edu.id} className="card-surface" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                    {edu.institution}
                  </h3>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)', marginTop: '2px' }}>
                    {edu.degree} in {edu.field_of_study}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--gray-500)', marginTop: '4px' }}>
                    {edu.start_date} – {edu.is_current ? 'Expected Graduation 2026' : edu.end_date}
                    {edu.gpa && ` • GPA: ${edu.gpa}`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button className="btn-ghost btn-sm" onClick={() => handleOpenEdit(edu)} style={{ padding: '4px' }}>
                    <Edit3 size={15} />
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => handleDelete(edu.id)} style={{ padding: '4px', color: 'var(--accent-crimson)' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {edu.coursework && edu.coursework.length > 0 && (
                <div style={{ marginTop: '14px', borderTop: '1px solid var(--gray-150)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Relevant Coursework
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {edu.coursework.map((c, i) => (
                      <span key={i} className="badge-tag" style={{ fontSize: '11.5px' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                {editingEdu ? 'Edit Education' : 'Add Education'}
              </h2>
              <button className="btn-ghost btn-sm" onClick={() => setModalOpen(false)} style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Institution / University *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    placeholder="e.g. National Institute of Technology"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Degree *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={degree}
                      onChange={e => setDegree(e.target.value)}
                      placeholder="B.Tech, B.S., M.S."
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Field of Study *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={fieldOfStudy}
                      onChange={e => setFieldOfStudy(e.target.value)}
                      placeholder="Computer Science"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="text"
                      className="form-input"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      placeholder="2022-08"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">End / Expected Date</label>
                    <input
                      type="text"
                      className="form-input"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      placeholder="2026-05"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">GPA (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={gpa}
                    onChange={e => setGpa(e.target.value)}
                    placeholder="e.g. 9.2 / 10.0 or 3.9 / 4.0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Relevant Coursework (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={courseworkInput}
                    onChange={e => setCourseworkInput(e.target.value)}
                    placeholder="Distributed Systems, Operating Systems, Compilers"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <span>Save Education</span>
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

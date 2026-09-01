import React, { useState } from 'react';
import { 
  History, 
  Plus, 
  Edit3, 
  Trash2, 
  Building2, 
  Check, 
  X
} from 'lucide-react';
import { Experience, ExperienceType, UserProfile } from '../../types';
import { ArgusDataService } from '../../services/api';

interface ExperienceViewProps {
  currentUser: UserProfile;
  onRefresh: () => void;
}

export const ExperienceView: React.FC<ExperienceViewProps> = ({
  currentUser,
  onRefresh
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);

  // Form fields
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [type, setType] = useState<ExperienceType>('internship');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState('');
  const [resp1, setResp1] = useState('');
  const [resp2, setResp2] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  const experiences = currentUser.experiences || [];

  const handleOpenAdd = () => {
    setEditingExp(null);
    setCompany('');
    setPosition('');
    setType('internship');
    setLocation('Bengaluru, India');
    setStartDate('');
    setEndDate('');
    setIsCurrent(false);
    setDescription('');
    setResp1('');
    setResp2('');
    setSkillsInput('');
    setModalOpen(true);
  };

  const handleOpenEdit = (exp: Experience) => {
    setEditingExp(exp);
    setCompany(exp.company);
    setPosition(exp.position);
    setType(exp.type);
    setLocation(exp.location);
    setStartDate(exp.start_date);
    setEndDate(exp.end_date || '');
    setIsCurrent(exp.is_current);
    setDescription(exp.description);
    setResp1(exp.responsibilities[0] || '');
    setResp2(exp.responsibilities[1] || '');
    setSkillsInput(exp.skills.join(', '));
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this experience entry?')) {
      ArgusDataService.deleteExperience(id);
      onRefresh();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !position.trim()) return;

    const responsibilities = [resp1, resp2].map(r => r.trim()).filter(Boolean);
    const skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean);

    const expData: Experience = {
      id: editingExp ? editingExp.id : `exp-${Date.now()}`,
      company: company.trim(),
      position: position.trim(),
      type,
      location: location.trim() || 'Remote',
      start_date: startDate.trim() || '2025-01',
      end_date: isCurrent ? undefined : (endDate.trim() || '2025-06'),
      is_current: isCurrent,
      description: description.trim(),
      responsibilities: responsibilities.length > 0 ? responsibilities : ['Contributed to core software engineering pipelines.'],
      skills: skills.length > 0 ? skills : ['Go', 'Java']
    };

    ArgusDataService.saveExperience(expData);
    setModalOpen(false);
    onRefresh();
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header-container">
        <div>
          <h1 className="page-title">Work Experience</h1>
          <p className="page-subtitle">
            Professional software engineering work history, internships, and verified company achievements.
          </p>
        </div>

        <button className="btn-primary" onClick={handleOpenAdd}>
          <Plus size={15} />
          <span>Add Experience</span>
        </button>
      </div>

      {/* List */}
      {experiences.length === 0 ? (
        <div className="card-surface" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <History size={40} color="var(--gray-400)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '6px' }}>
            No professional experience added yet.
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--gray-600)', maxWidth: '420px', margin: '0 auto 18px' }}>
            Add internships or full-time roles so Argus can surface relevant professional experience when matching against enterprise JDs.
          </p>
          <button className="btn-primary btn-sm" onClick={handleOpenAdd}>
            <Plus size={14} />
            <span>Add Experience</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {experiences.map(exp => (
            <div key={exp.id} className="card-surface" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                      {exp.position}
                    </h3>
                    <span className="badge-tag-navy" style={{ textTransform: 'capitalize', fontSize: '11px' }}>
                      {exp.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={14} color="var(--gray-500)" />
                    <span>{exp.company}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}>{exp.location}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}>
                      {exp.start_date} – {exp.is_current ? 'Present' : exp.end_date}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button className="btn-ghost btn-sm" onClick={() => handleOpenEdit(exp)} style={{ padding: '4px' }} title="Edit Experience">
                    <Edit3 size={15} />
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => handleDelete(exp.id)} style={{ padding: '4px', color: 'var(--accent-crimson)' }} title="Delete Experience">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {exp.description && (
                <p style={{ fontSize: '13.5px', color: 'var(--gray-700)', lineHeight: 1.5, marginBottom: '12px' }}>
                  {exp.description}
                </p>
              )}

              {/* Responsibilities */}
              {exp.responsibilities && exp.responsibilities.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  {exp.responsibilities.map((resp, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--gray-800)' }}>
                      <span style={{ color: 'var(--primary-navy)', fontWeight: 700 }}>•</span>
                      <span>{resp}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Skills Used */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {exp.skills.map((skill, i) => (
                  <span key={i} className="badge-tag-navy" style={{ fontSize: '11.5px' }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                {editingExp ? `Edit Experience: ${editingExp.company}` : 'Add Work Experience'}
              </h2>
              <button className="btn-ghost btn-sm" onClick={() => setModalOpen(false)} style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '68vh' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Position / Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={position}
                      onChange={e => setPosition(e.target.value)}
                      placeholder="Software Engineering Intern"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company / Organization *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      placeholder="e.g. Core Infrastructure Lab"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Experience Type</label>
                    <select
                      className="form-select"
                      value={type}
                      onChange={e => setType(e.target.value as ExperienceType)}
                    >
                      <option value="internship">Internship</option>
                      <option value="full_time">Full-time</option>
                      <option value="part_time">Part-time</option>
                      <option value="research">Research</option>
                      <option value="open_source">Open Source</option>
                      <option value="contract">Contract</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-input"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Bengaluru, India / Remote"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="text"
                      className="form-input"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      placeholder="2025-05"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="text"
                      className="form-input"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      placeholder="2025-08"
                      disabled={isCurrent}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Team / Overview Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief description of your team's charter and role..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Key Responsibilities / Achievements</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Bullet 1: e.g. Deployed eBPF network tracing driver accelerating gRPC by 32%..."
                    value={resp1}
                    onChange={e => setResp1(e.target.value)}
                    style={{ marginBottom: '8px' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Bullet 2: e.g. Implemented dynamic load balancing in Go routing 1.5M QPS..."
                    value={resp2}
                    onChange={e => setResp2(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Skills & Technologies Used (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={skillsInput}
                    onChange={e => setSkillsInput(e.target.value)}
                    placeholder="e.g. Go, eBPF, Kubernetes, gRPC, Distributed Systems"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <span>{editingExp ? 'Save Changes' : 'Save Experience'}</span>
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

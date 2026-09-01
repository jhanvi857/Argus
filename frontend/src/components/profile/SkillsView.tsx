import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { SkillItem, SkillCategory, UserProfile } from '../../types';
import { ArgusDataService } from '../../services/api';

interface SkillsViewProps {
  currentUser: UserProfile;
  onRefresh: () => void;
}

export const SkillsView: React.FC<SkillsViewProps> = ({
  currentUser,
  onRefresh
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [category, setCategory] = useState<SkillCategory>('programming');
  const [proficiency, setProficiency] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('advanced');

  const skills = currentUser.skills || [];

  const categories: { id: SkillCategory; label: string }[] = [
    { id: 'programming', label: 'Programming Languages' },
    { id: 'backend', label: 'Backend & Distributed Systems' },
    { id: 'systems', label: 'Systems, Kernel & Low-Latency' },
    { id: 'cloud', label: 'Cloud & Infrastructure' },
    { id: 'databases', label: 'Databases & Storage Engines' },
    { id: 'ai_ml', label: 'AI, ML & Vector Search' },
    { id: 'frontend', label: 'Frontend' },
    { id: 'tools', label: 'Developer Tools & Observability' }
  ];

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;

    const newSkill: SkillItem = {
      id: `sk-${Date.now()}`,
      name: skillName.trim(),
      category,
      proficiency
    };

    ArgusDataService.saveSkill(newSkill);
    setSkillName('');
    setModalOpen(false);
    onRefresh();
  };

  const handleDeleteSkill = (id: string) => {
    ArgusDataService.deleteSkill(id);
    onRefresh();
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header-container">
        <div>
          <h1 className="page-title">Skills & Capabilities</h1>
          <p className="page-subtitle">
            Categorized inventory of programming languages, systems, algorithms, and cloud tools.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={15} />
          <span>Add Skill</span>
        </button>
      </div>

      {/* Category Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {categories.map(cat => {
          const catSkills = skills.filter(s => s.category === cat.id);
          return (
            <div key={cat.id} className="card-surface" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--gray-150)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                  {cat.label}
                </span>
                <span className="nav-badge">
                  {catSkills.length}
                </span>
              </div>

              {catSkills.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--gray-400)', fontStyle: 'italic', padding: '12px 0' }}>
                  No skills added in this category yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {catSkills.map(skill => (
                    <div
                      key={skill.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: 'var(--border-radius-sm)',
                        backgroundColor: 'var(--primary-navy-tint)',
                        border: '1px solid rgba(0, 48, 73, 0.12)',
                        fontSize: '12.5px',
                        color: 'var(--primary-navy)',
                        fontWeight: 600
                      }}
                    >
                      <span>{skill.name}</span>
                      {skill.proficiency && (
                        <span style={{ fontSize: '10px', color: 'var(--gray-500)', textTransform: 'capitalize' }}>
                          ({skill.proficiency})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteSkill(skill.id)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', padding: '2px' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Skill Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                Add New Skill
              </h2>
              <button className="btn-ghost btn-sm" onClick={() => setModalOpen(false)} style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSkill}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Skill Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={skillName}
                    onChange={e => setSkillName(e.target.value)}
                    placeholder="e.g. Go, Raft, eBPF, Kubernetes, C++20"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={e => setCategory(e.target.value as SkillCategory)}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Proficiency Level</label>
                  <select
                    className="form-select"
                    value={proficiency}
                    onChange={e => setProficiency(e.target.value as any)}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert / Production</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <span>Add Skill</span>
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

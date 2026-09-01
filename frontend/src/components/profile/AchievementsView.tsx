import React, { useState } from 'react';
import { Trophy, Plus, Edit3, Trash2, ExternalLink, Check, X } from 'lucide-react';
import { Achievement, AchievementType, UserProfile } from '../../types';
import { ArgusDataService } from '../../services/api';

interface AchievementsViewProps {
  currentUser: UserProfile;
  onRefresh: () => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  currentUser,
  onRefresh
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAch, setEditingAch] = useState<Achievement | null>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<AchievementType>('hackathon');
  const [organization, setOrganization] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');

  const achievements = currentUser.achievements || [];

  const handleOpenAdd = () => {
    setEditingAch(null);
    setTitle('');
    setType('hackathon');
    setOrganization('');
    setDate('2025-03');
    setDescription('');
    setLink('');
    setModalOpen(true);
  };

  const handleOpenEdit = (ach: Achievement) => {
    setEditingAch(ach);
    setTitle(ach.title);
    setType(ach.type);
    setOrganization(ach.organization);
    setDate(ach.date);
    setDescription(ach.description);
    setLink(ach.link || '');
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this achievement?')) {
      ArgusDataService.deleteAchievement(id);
      onRefresh();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const achData: Achievement = {
      id: editingAch ? editingAch.id : `ach-${Date.now()}`,
      title: title.trim(),
      type,
      organization: organization.trim() || 'Global Organization',
      date: date.trim() || '2025',
      description: description.trim(),
      link: link.trim() || undefined
    };

    ArgusDataService.saveAchievement(achData);
    setModalOpen(false);
    onRefresh();
  };

  return (
    <div>
      <div className="page-header-container">
        <div>
          <h1 className="page-title">Achievements & Honors</h1>
          <p className="page-subtitle">
            Hackathon wins, competitive programming ratings, open source honors, and technical publications.
          </p>
        </div>

        <button className="btn-primary" onClick={handleOpenAdd}>
          <Plus size={15} />
          <span>Add Achievement</span>
        </button>
      </div>

      {achievements.length === 0 ? (
        <div className="card-surface" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Trophy size={40} color="var(--gray-400)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '6px' }}>
            No achievements added yet.
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--gray-600)', maxWidth: '420px', margin: '0 auto 18px' }}>
            Achievements act as supporting evidence for rapid prototyping and algorithmic ability in Argus matching.
          </p>
          <button className="btn-primary btn-sm" onClick={handleOpenAdd}>
            <Plus size={14} />
            <span>Add Achievement</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {achievements.map(ach => (
            <div key={ach.id} className="card-surface" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                      {ach.title}
                    </h3>
                    <span className="badge-tag-navy" style={{ textTransform: 'capitalize', fontSize: '11px' }}>
                      {ach.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginTop: '2px' }}>
                    {ach.organization} • {ach.date}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {ach.link && (
                    <a href={ach.link} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" style={{ padding: '4px' }}>
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button className="btn-ghost btn-sm" onClick={() => handleOpenEdit(ach)} style={{ padding: '4px' }}>
                    <Edit3 size={14} />
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => handleDelete(ach.id)} style={{ padding: '4px', color: 'var(--accent-crimson)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                {ach.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                {editingAch ? 'Edit Achievement' : 'Add Achievement'}
              </h2>
              <button className="btn-ghost btn-sm" onClick={() => setModalOpen(false)} style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Achievement Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Global Systems Hackathon 1st Place"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select
                      className="form-select"
                      value={type}
                      onChange={e => setType(e.target.value as AchievementType)}
                    >
                      <option value="hackathon">Hackathon</option>
                      <option value="award">Award / Recognition</option>
                      <option value="competitive_programming">Competitive Programming</option>
                      <option value="publication">Publication</option>
                      <option value="certification">Certification</option>
                      <option value="scholarship">Scholarship</option>
                      <option value="competition">Competition</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="text"
                      className="form-input"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      placeholder="2025-03"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Issuing Organization / Event</label>
                  <input
                    type="text"
                    className="form-input"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    placeholder="e.g. Open Source Distributed Systems Foundation"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief details about what you built or demonstrated..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Verification / Project Link (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    value={link}
                    onChange={e => setLink(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <span>Save Achievement</span>
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

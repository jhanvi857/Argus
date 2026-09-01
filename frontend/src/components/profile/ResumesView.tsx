import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Eye, 
  Edit3, 
  Check, 
  X,
  FileCheck2
} from 'lucide-react';
import { ResumeVersion, UserProfile } from '../../types';
import { ArgusDataService } from '../../services/api';

interface ResumesViewProps {
  currentUser: UserProfile;
  onRefresh: () => void;
}

export const ResumesView: React.FC<ResumesViewProps> = ({
  currentUser,
  onRefresh
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [previewResume, setPreviewResume] = useState<ResumeVersion | null>(null);
  const [editingResume, setEditingResume] = useState<ResumeVersion | null>(null);

  const [name, setName] = useState('');
  const [fileName, setFileName] = useState('');
  const [roleFocus, setRoleFocus] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const resumes = currentUser.resumes || [];

  const handleOpenAdd = () => {
    setEditingResume(null);
    setName('Backend & Infrastructure Resume');
    setFileName(`${currentUser.full_name?.replace(' ', '_') || 'Candidate'}_Backend_v1.pdf`);
    setRoleFocus('Backend, Systems, Distributed Systems');
    setPreviewText(`${currentUser.full_name} | Software Engineer | ${currentUser.headline}\nProjects: ${currentUser.projects?.map(p => p.name).join(', ') || 'NioFlow, Evora'}\nSkills: ${currentUser.skills?.slice(0, 8).map(s => s.name).join(', ') || 'Go, Java, Rust'}`);
    setIsDefault(resumes.length === 0);
    setModalOpen(true);
  };

  const handleOpenEdit = (res: ResumeVersion) => {
    setEditingResume(res);
    setName(res.name);
    setFileName(res.file_name);
    setRoleFocus(res.role_focus);
    setPreviewText(res.preview_text || '');
    setIsDefault(!!res.is_default);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this resume version?')) {
      ArgusDataService.deleteResume(id);
      onRefresh();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !fileName.trim()) return;

    const resumeData: ResumeVersion = {
      id: editingResume ? editingResume.id : `res-${Date.now()}`,
      name: name.trim(),
      file_name: fileName.trim().endsWith('.pdf') ? fileName.trim() : `${fileName.trim()}.pdf`,
      role_focus: roleFocus.trim() || 'General SWE',
      last_updated: new Date().toISOString().split('T')[0],
      applications_count: editingResume ? editingResume.applications_count : 0,
      file_size: '142 KB',
      is_default: isDefault,
      preview_text: previewText.trim()
    };

    ArgusDataService.saveResume(resumeData);
    setModalOpen(false);
    onRefresh();
  };

  return (
    <div>
      <div className="page-header-container">
        <div>
          <h1 className="page-title">Resume Versions</h1>
          <p className="page-subtitle">
            Keep specialized resume versions tailored for different role focuses (e.g. Low-Latency Systems vs. General SWE).
          </p>
        </div>

        <button className="btn-primary" onClick={handleOpenAdd}>
          <Upload size={15} />
          <span>Add Resume Version</span>
        </button>
      </div>

      {resumes.length === 0 ? (
        <div className="card-surface" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileText size={40} color="var(--gray-400)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '6px' }}>
            No resume versions registered.
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--gray-600)', maxWidth: '420px', margin: '0 auto 18px' }}>
            Add your resume versions so Argus can recommend which one best covers the capabilities required by each role.
          </p>
          <button className="btn-primary btn-sm" onClick={handleOpenAdd}>
            <Upload size={14} />
            <span>Upload First Resume</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {resumes.map(res => (
            <div key={res.id} className="card-surface" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                        {res.name}
                      </h3>
                      {res.is_default && (
                        <span className="badge-tag-navy" style={{ fontSize: '10.5px' }}>
                          DEFAULT
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>
                      Updated {res.last_updated} • {res.file_size || '140 KB'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button className="btn-ghost btn-sm" onClick={() => handleOpenEdit(res)} style={{ padding: '4px' }} title="Edit Resume">
                      <Edit3 size={15} />
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => handleDelete(res.id)} style={{ padding: '4px', color: 'var(--accent-crimson)' }} title="Delete Resume">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--gray-50)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--gray-200)',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
                    Role Focus
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--gray-800)', marginTop: '2px' }}>
                    {res.role_focus}
                  </div>
                </div>

                <div style={{ fontSize: '12.5px', color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileCheck2 size={15} color="var(--color-success)" />
                  <span>Used in <strong>{res.applications_count}</strong> active applications</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--gray-150)', paddingTop: '12px' }}>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setPreviewResume(res)}
                  style={{ flex: 1 }}
                >
                  <Eye size={13} />
                  <span>Preview Resume</span>
                </button>

                <button
                  className="btn-ghost btn-sm"
                  onClick={() => alert(`Simulating download for ${res.file_name}`)}
                  title="Download PDF"
                  style={{ padding: '6px 10px' }}
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                {editingResume ? 'Edit Resume Version' : 'Upload / Add Resume Version'}
              </h2>
              <button className="btn-ghost btn-sm" onClick={() => setModalOpen(false)} style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Resume Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Backend & Infrastructure v3"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">File Name (PDF) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    placeholder="Alex_Chen_Backend_v3.pdf"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Role Focus</label>
                  <input
                    type="text"
                    className="form-input"
                    value={roleFocus}
                    onChange={e => setRoleFocus(e.target.value)}
                    placeholder="e.g. Low-Latency Systems, Go, Java, Raft, eBPF"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Resume Text / Content Preview (for matcher ranking)</label>
                  <textarea
                    className="form-textarea"
                    value={previewText}
                    onChange={e => setPreviewText(e.target.value)}
                    placeholder="Paste the core summary or highlights of this resume version..."
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={e => setIsDefault(e.target.checked)}
                    style={{ accentColor: 'var(--primary-navy)' }}
                  />
                  <label htmlFor="isDefault" style={{ fontSize: '13px', color: 'var(--gray-800)', cursor: 'pointer' }}>
                    Set as default recommended resume
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <span>Save Resume Version</span>
                  <Check size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Resume Modal */}
      {previewResume && (
        <div className="modal-overlay" onClick={() => setPreviewResume(null)}>
          <div className="modal-container" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                  {previewResume.name}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                  {previewResume.file_name} • Focus: {previewResume.role_focus}
                </div>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => setPreviewResume(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{
                backgroundColor: 'var(--gray-50)',
                border: '1px solid var(--gray-200)',
                borderRadius: 'var(--border-radius-sm)',
                padding: '20px',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--gray-800)',
                whiteSpace: 'pre-line'
              }}>
                {previewResume.preview_text || 'No text preview provided for this PDF version.'}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setPreviewResume(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

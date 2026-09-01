import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  FolderGit2,
  Check,
  X
} from 'lucide-react';
import { Project, UserProfile } from '../../types';
import { ArgusDataService } from '../../services/api';

interface ProjectsViewProps {
  currentUser: UserProfile;
  onRefresh: () => void;
}

const projectAccentColors = [
  'var(--primary)',
  '#6366f1',
  '#059669',
  '#d97706',
  '#0891b2',
  '#7c3aed'
];

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  currentUser,
  onRefresh
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [bullet1, setBullet1] = useState('');
  const [bullet2, setBullet2] = useState('');
  const [bullet3, setBullet3] = useState('');

  const projects = currentUser.projects || [];

  const handleOpenAdd = () => {
    setEditingProject(null);
    setName('');
    setSummary('');
    setDetailedDescription('');
    setTechStackInput('');
    setTagsInput('');
    setGithubUrl('');
    setProjectUrl('');
    setBullet1('');
    setBullet2('');
    setBullet3('');
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setName(p.name);
    setSummary(p.summary);
    setDetailedDescription(p.detailed_description || '');
    setTechStackInput(p.tech_stack.join(', '));
    setTagsInput(p.tags.join(', '));
    setGithubUrl(p.github_url || '');
    setProjectUrl(p.project_url || '');
    setBullet1(p.quantified_bullets[0] || '');
    setBullet2(p.quantified_bullets[1] || '');
    setBullet3(p.quantified_bullets[2] || '');
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this project from your portfolio?')) {
      ArgusDataService.deleteProject(id);
      onRefresh();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const bullets = [bullet1, bullet2, bullet3].map(b => b.trim()).filter(Boolean);
    const techStack = techStackInput.split(',').map(s => s.trim()).filter(Boolean);
    const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean);

    const projectData: Project = {
      id: editingProject ? editingProject.id : `proj-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: name.trim(),
      summary: summary.trim(),
      detailed_description: detailedDescription.trim(),
      tech_stack: techStack,
      tags: tags.length > 0 ? tags : ['backend', 'systems'],
      quantified_bullets: bullets.length > 0 ? bullets : ['Designed and implemented core system modules.'],
      resume_variants: editingProject ? editingProject.resume_variants : {},
      github_url: githubUrl.trim() || undefined,
      project_url: projectUrl.trim() || undefined
    };

    ArgusDataService.saveProject(projectData);
    setModalOpen(false);
    onRefresh();
  };

  // Parse quantified metrics from bullets (e.g., "2.5M requests/day")
  const parseMetrics = (bullets: string[]): { value: string; label: string }[] => {
    const metrics: { value: string; label: string }[] = [];
    const numberPattern = /(\d+[\d,.]*[KkMmBb%+]*)\s*([a-zA-Z/\s]+)/g;
    bullets.forEach(b => {
      let match;
      while ((match = numberPattern.exec(b)) !== null && metrics.length < 3) {
        metrics.push({ value: match[1].trim(), label: match[2].trim().slice(0, 20) });
      }
    });
    return metrics.slice(0, 3);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header-container">
        <div>
          <h1 className="page-title">My Projects</h1>
          <p className="page-subtitle">
            Showcase your work, skills and experience.
          </p>
        </div>

        <button className="btn-primary" onClick={handleOpenAdd}>
          <Plus size={15} />
          <span>Add Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="card-surface" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FolderGit2 size={40} color="var(--gray-400)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '6px' }}>
            Your project portfolio is empty.
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--gray-500)', maxWidth: '440px', margin: '0 auto 18px' }}>
            Add your engineering projects so Argus can match them against job descriptions.
          </p>
          <button className="btn-primary btn-sm" onClick={handleOpenAdd}>
            <Plus size={14} />
            <span>Add Your First Project</span>
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {projects.map((p, index) => {
            const accentColor = projectAccentColors[index % projectAccentColors.length];
            const metrics = parseMetrics(p.quantified_bullets);
            return (
              <div
                key={p.id}
                className="card-surface"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {/* Accent top bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: '3px', background: accentColor
                }} />

                <div>
                  {/* Title & Actions */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: accentColor, flexShrink: 0
                      }} />
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--gray-900)' }}>
                        {p.name}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {p.github_url && (
                        <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" style={{ padding: '4px' }}>
                          <FolderGit2 size={14} />
                        </a>
                      )}
                      <button className="btn-ghost btn-sm" onClick={() => handleOpenEdit(p)} style={{ padding: '4px' }}>
                        <Edit3 size={14} />
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => handleDelete(p.id)} style={{ padding: '4px', color: 'var(--primary)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Tech Stack Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                    {p.tech_stack.slice(0, 4).map((tech, i) => (
                      <span key={i} className="badge-tag" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {tech}
                      </span>
                    ))}
                    {p.tags.length > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, padding: '2px 4px' }}>
                        +{p.tags.length}
                      </span>
                    )}
                  </div>

                  {/* Summary */}
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--gray-600)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {p.summary}
                  </p>
                </div>

                {/* Quantified Metrics */}
                {metrics.length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    borderTop: '1px solid var(--gray-150)',
                    paddingTop: '12px',
                    marginTop: '4px'
                  }}>
                    {metrics.map((m, i) => (
                      <div key={i}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gray-900)' }}>
                          {m.value}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--gray-500)', textTransform: 'lowercase' }}>
                          {m.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Project Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--gray-900)' }}>
                {editingProject ? `Edit Project: ${editingProject.name}` : 'Add New Portfolio Project'}
              </h2>
              <button className="btn-ghost btn-sm" onClick={() => setModalOpen(false)} style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '68vh' }}>
                <div className="form-group">
                  <label className="form-label">Project Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. NioFlow, Evora, Substrate"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Short Summary (1-2 sentences) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                    placeholder="e.g. High-throughput data pipeline for real-time analytics with fault tolerance."
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Tech Stack (comma-separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={techStackInput}
                      onChange={e => setTechStackInput(e.target.value)}
                      placeholder="e.g. Java, Spring Boot, Kafka"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Domain Tags (comma-separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={tagsInput}
                      onChange={e => setTagsInput(e.target.value)}
                      placeholder="e.g. distributed-systems, high-throughput"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">GitHub Repository URL</label>
                    <input type="url" className="form-input" value={githubUrl}
                      onChange={e => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/username/project"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Live Demo / Docs URL</label>
                    <input type="url" className="form-input" value={projectUrl}
                      onChange={e => setProjectUrl(e.target.value)}
                      placeholder="https://project.dev"
                    />
                  </div>
                </div>

                {/* Quantified Bullets */}
                <div style={{ marginTop: '10px' }}>
                  <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>
                    Quantified Resume Bullets (Ground Truth Evidence)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" className="form-input"
                      placeholder="Bullet 1: e.g. Processed 2.5M requests/day with 99.99% uptime..."
                      value={bullet1} onChange={e => setBullet1(e.target.value)}
                    />
                    <input type="text" className="form-input"
                      placeholder="Bullet 2: e.g. Reduced latency by 40% through optimized caching..."
                      value={bullet2} onChange={e => setBullet2(e.target.value)}
                    />
                    <input type="text" className="form-input"
                      placeholder="Bullet 3 (Optional): e.g. Achieved 85% accuracy on ML classification..."
                      value={bullet3} onChange={e => setBullet3(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <span>{editingProject ? 'Save Changes' : 'Create Project'}</span>
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

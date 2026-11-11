import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Archive, 
  RotateCcw,
  Check, 
  X,
  AlertCircle,
  FileCheck2,
  Hash,
  Clock,
  HardDrive
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
  const [resumes, setResumes] = useState<ResumeVersion[]>(currentUser.resumes || []);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewResume, setPreviewResume] = useState<ResumeVersion | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [updateLabelIfExists, setUpdateLabelIfExists] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResumes = async (archived = showArchived) => {
    setLoading(true);
    try {
      const serverList = await ArgusDataService.fetchResumes(archived);
      setResumes(serverList);
    } catch (e) {
      console.error('Failed to load resumes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, [showArchived]);

  const handleOpenUpload = () => {
    setSelectedFile(null);
    setLabel('');
    setUploadError(null);
    setUploadSuccess(null);
    setUpdateLabelIfExists(true);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadError(null);
      if (!label.trim()) {
        const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ');
        setLabel(baseName.charAt(0).toUpperCase() + baseName.slice(1));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a PDF or DOCX file to upload.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const res = await ArgusDataService.uploadResumeFile(
        selectedFile,
        label.trim() || undefined,
        updateLabelIfExists
      );

      setUploadSuccess(
        res.is_duplicate 
          ? (res.message || 'Identical resume already indexed. Updated existing record.') 
          : 'Resume uploaded, validated, and indexed successfully!'
      );

      setTimeout(() => {
        setModalOpen(false);
        loadResumes();
        onRefresh();
      }, 1000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload and validate resume document.');
    } finally {
      setUploading(false);
    }
  };

  const handleArchiveToggle = async (id: number | string, currentArchived: boolean) => {
    const action = currentArchived ? 'restore' : 'archive';
    if (confirm(`Are you sure you want to ${action} this resume version?`)) {
      await ArgusDataService.archiveResumeVersion(id, !currentArchived);
      loadResumes();
      onRefresh();
    }
  };

  const handleDownload = (id: number | string, filename: string) => {
    const url = ArgusDataService.getResumeDownloadUrl(id);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeResumes = resumes.filter(r => showArchived ? true : !r.is_archived);

  return (
    <div>
      <div className="page-header-container">
        <div>
          <h1 className="page-title">Resume Library</h1>
          <p className="page-subtitle">
            Upload and manage your immutable resume versions (PDF / DOCX). Argus extracts text, computes ATS fit, and pins versions to submitted applications.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className={`btn-ghost btn-sm ${showArchived ? 'active' : ''}`}
            onClick={() => setShowArchived(!showArchived)}
            style={{ fontSize: '13px' }}
          >
            {showArchived ? 'Show Active Only' : 'Include Archived'}
          </button>

          <button className="btn-primary" onClick={handleOpenUpload}>
            <Upload size={15} />
            <span>Upload Resume Version</span>
          </button>
        </div>
      </div>

      {loading && resumes.length === 0 ? (
        <div className="card-surface" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-500)' }}>
          Loading resume library...
        </div>
      ) : activeResumes.length === 0 ? (
        <div className="card-surface" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileText size={42} color="var(--gray-400)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '6px' }}>
            No resume versions registered yet.
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--gray-600)', maxWidth: '440px', margin: '0 auto 18px', lineHeight: 1.5 }}>
            Upload your SWE resume versions (PDF or DOCX, max 5 pages). Argus will index them with tamper-proof SHA-256 hashes for ATS matching and application tracking.
          </p>
          <button className="btn-primary btn-sm" onClick={handleOpenUpload}>
            <Upload size={14} />
            <span>Upload First Resume</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {activeResumes.map(res => {
            const displayName = res.label || res.name || res.file_name;
            const fileSizeStr = typeof res.file_size === 'number' 
              ? `${Math.round(res.file_size / 1024)} KB` 
              : (res.file_size || 'PDF Document');
            const dateStr = res.created_at ? new Date(res.created_at).toLocaleDateString() : res.last_updated;

            return (
              <div 
                key={res.id} 
                className="card-surface" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between', 
                  gap: '16px',
                  opacity: res.is_archived ? 0.65 : 1,
                  border: res.is_archived ? '1px dashed var(--gray-300)' : undefined
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ flex: 1, paddingRight: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)', margin: 0 }}>
                          {displayName}
                        </h3>
                        {res.is_archived && (
                          <span className="badge-tag-navy" style={{ fontSize: '10px', background: 'var(--gray-200)', color: 'var(--gray-700)' }}>
                            ARCHIVED
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {dateStr}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <HardDrive size={12} />
                          {fileSizeStr}
                        </span>
                        {res.file_hash && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontFamily: 'var(--font-mono)', fontSize: '11px' }} title={`SHA-256: ${res.file_hash}`}>
                            <Hash size={11} />
                            {res.file_hash.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button 
                        className="btn-ghost btn-sm" 
                        onClick={() => handleArchiveToggle(res.id, !!res.is_archived)} 
                        style={{ padding: '6px' }} 
                        title={res.is_archived ? "Restore Resume Version" : "Archive Resume Version"}
                      >
                        {res.is_archived ? <RotateCcw size={14} color="var(--primary)" /> : <Archive size={14} color="var(--gray-500)" />}
                      </button>
                    </div>
                  </div>

                  {/* Metadata & File details */}
                  <div style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--gray-50)',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--gray-200)',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
                      Safe Filename & Source
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--gray-800)', marginTop: '2px', wordBreak: 'break-all' }}>
                      {res.file_name}
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCheck2 size={14} color="var(--color-success)" />
                    <span>
                      Text Extracted: <strong>{(res.extracted_text || res.preview_text || '').length}</strong> characters
                    </span>
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
                    <span>Preview Text</span>
                  </button>

                  <button
                    className="btn-primary btn-sm"
                    onClick={() => handleDownload(res.id, res.file_name)}
                    title="Download Original File"
                    style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => !uploading && setModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                Upload Resume Version
              </h2>
              <button 
                className="btn-ghost btn-sm" 
                onClick={() => !uploading && setModalOpen(false)} 
                disabled={uploading}
                style={{ padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="modal-body">
                {uploadError && (
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: 'var(--border-radius-sm)',
                    color: '#991b1b',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '14px'
                  }}>
                    <AlertCircle size={16} />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadSuccess && (
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#dcfce7',
                    border: '1px solid #86efac',
                    borderRadius: 'var(--border-radius-sm)',
                    color: '#166534',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '14px'
                  }}>
                    <Check size={16} />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                {/* Dropzone / File Picker */}
                <div 
                  style={{
                    border: '2px dashed var(--gray-300)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '24px 16px',
                    textAlign: 'center',
                    backgroundColor: selectedFile ? 'rgba(173,40,49,0.03)' : 'var(--gray-50)',
                    cursor: 'pointer',
                    marginBottom: '16px'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    style={{ display: 'none' }}
                  />

                  <Upload size={32} color={selectedFile ? "var(--primary)" : "var(--gray-400)"} style={{ margin: '0 auto 8px' }} />

                  {selectedFile ? (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '14px' }}>
                        {selectedFile.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>
                        {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '14px' }}>
                        Click to browse or drop your resume here
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                        PDF or DOCX • Max 5 pages • Up to 5 MB
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Version Label / Role Focus *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder="e.g. Systems & Low-Latency v2"
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px', display: 'block' }}>
                    Label used in ATS scoring and when selecting which resume to pin to an application.
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    id="updateLabelIfExists"
                    checked={updateLabelIfExists}
                    onChange={e => setUpdateLabelIfExists(e.target.checked)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="updateLabelIfExists" style={{ fontSize: '12.5px', color: 'var(--gray-700)', cursor: 'pointer' }}>
                    If an identical resume file is already uploaded, update its label instead of failing
                  </label>
                </div>

                <div style={{
                  marginTop: '16px',
                  padding: '10px 12px',
                  backgroundColor: 'var(--gray-100)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '11.5px',
                  color: 'var(--gray-600)',
                  lineHeight: 1.4
                }}>
                  🔒 <strong>Untrusted file protection</strong>: Magic bytes are verified, DOCX zip-bomb decompression is strictly capped, original filenames are never used in storage paths, and files are stored outside the web root.
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setModalOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? <span>Validating & Uploading...</span> : <span>Upload & Extract</span>}
                  <Check size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Extracted Text Modal */}
      {previewResume && (
        <div className="modal-overlay" onClick={() => setPreviewResume(null)}>
          <div className="modal-container" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                  {previewResume.label || previewResume.name}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                  {previewResume.file_name} • {(previewResume.extracted_text || previewResume.preview_text || '').length} characters extracted
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
                padding: '18px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                lineHeight: 1.6,
                color: 'var(--gray-800)',
                whiteSpace: 'pre-wrap',
                maxHeight: '440px',
                overflowY: 'auto'
              }}>
                {previewResume.extracted_text || previewResume.preview_text || 'No text extracted for this resume version.'}
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button 
                className="btn-primary btn-sm"
                onClick={() => handleDownload(previewResume.id, previewResume.file_name)}
              >
                <Download size={13} />
                <span>Download Original File</span>
              </button>

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

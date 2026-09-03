import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  User,
  EyeOff,
  Search,
  RefreshCw,
  PlusCircle,
  Sparkles,
  Trash2,
  Flag,
  Globe,
  Users,
  CheckCircle2
} from 'lucide-react';
import { MergedExperienceItem, UserProfile, Company } from '../../types';
import { ArgusDataService } from '../../services/api';
import { MarkdownView } from '../common/MarkdownView';

interface ExperiencesPanelProps {
  company: Company | { id: number; name: string };
  currentUser: UserProfile;
  onOpenLogModal?: () => void;
  className?: string;
}

export const ExperiencesPanel: React.FC<ExperiencesPanelProps> = ({
  company,
  currentUser,
  onOpenLogModal,
  className = ''
}) => {
  const [items, setItems] = useState<MergedExperienceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingTavily, setIsFetchingTavily] = useState<boolean>(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'community' | 'external'>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set());
  const [fetchNotification, setFetchNotification] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; text: string } | null>(null);

  const loadExperiences = async () => {
    setIsLoading(true);
    try {
      const data = await ArgusDataService.getCompanyExperiences(
        company.id,
        stageFilter === 'all' ? undefined : stageFilter
      );
      setItems(data);
    } catch (e) {
      console.warn('Failed to load experiences:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExperiences();
  }, [company.id, stageFilter]);

  const handleRefreshPrep = async () => {
    setIsFetchingTavily(true);
    setFetchNotification(null);
    try {
      const res = await ArgusDataService.fetchExternalPrep(company.id);
      await loadExperiences();
      if (res.fetched_count > 0) {
        setFetchNotification({
          type: 'success',
          text: `Loaded ${res.fetched_count} curated interview debriefs and OA breakdowns for ${company.name}.`
        });
      } else {
        setFetchNotification({
          type: 'info',
          text: `All curated prep archives are up to date for ${company.name}.`
        });
      }
    } catch (e) {
      console.warn('Refresh prep failed:', e);
      setFetchNotification({
        type: 'error',
        text: 'Could not refresh prep intelligence.'
      });
    } finally {
      setIsFetchingTavily(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (confirm('Delete your shared experience log?')) {
      await ArgusDataService.deleteExperienceLog(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const handleReportItem = (itemId: number) => {
    setReportedIds(prev => new Set(prev).add(itemId));
    alert('Thank you for flagging this entry. Our moderation team will review it.');
  };

  // Filter items by source & search keyword
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Source filter
      if (sourceFilter !== 'all' && item.source_type !== sourceFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const textToSearch = `${item.technical_questions || ''} ${item.takeaways || ''} ${item.author || ''} ${item.stage || ''}`.toLowerCase();
        if (!textToSearch.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [items, sourceFilter, searchQuery]);

  const communityCount = items.filter(i => i.source_type === 'community').length;
  const externalCount = items.filter(i => i.source_type === 'external').length;

  const stageLabels: Record<string, string> = {
    all: 'All Stages',
    oa: 'OA Assessment',
    phone_screen: 'Phone Screen',
    technical_interview: 'Technical Rounds',
    onsite: 'Onsite / Final',
    offer: 'Offer & Compensation'
  };

  return (
    <div className={`experiences-panel ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner / Actions */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(173,40,49,0.04) 0%, rgba(26,54,93,0.06) 100%)',
        border: '1px solid var(--gray-200)',
        borderRadius: 'var(--border-radius-md)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>
              Interview Intelligence & Experiences
            </h3>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--border-radius-full)',
              background: 'var(--primary)',
              color: '#ffffff'
            }}>
              {items.length} records
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--gray-600)', margin: '4px 0 0', lineHeight: 1.4 }}>
            Dual-source view: Peer logs from verified Argus applicants + external prep archives (LeetCode, Blind, GeeksforGeeks).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleRefreshPrep}
            disabled={isFetchingTavily}
            className="btn-secondary btn-sm"
            style={{
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: 'var(--border-radius-full)'
            }}
          >
            <RefreshCw size={12} className={isFetchingTavily ? 'spin-animation' : ''} />
            <span>{isFetchingTavily ? 'Updating...' : 'Refresh Prep'}</span>
          </button>

          {onOpenLogModal && (
            <button
              onClick={onOpenLogModal}
              className="btn-primary btn-sm"
              style={{
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: 'var(--border-radius-full)'
              }}
            >
              <PlusCircle size={13} />
              <span>Share Your Experience</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Fetch Feedback Notification */}
      {fetchNotification && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--border-radius-md)',
          fontSize: '12.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          background: fetchNotification.type === 'warning' ? '#fef3c7' : fetchNotification.type === 'success' ? '#f0fdf4' : fetchNotification.type === 'error' ? '#fef2f2' : '#eff6ff',
          border: fetchNotification.type === 'warning' ? '1px solid #fde68a' : fetchNotification.type === 'success' ? '1px solid #bbf7d0' : fetchNotification.type === 'error' ? '1px solid #fecaca' : '1px solid #bfdbfe',
          color: fetchNotification.type === 'warning' ? '#92400e' : fetchNotification.type === 'success' ? '#166534' : fetchNotification.type === 'error' ? '#991b1b' : '#1e40af'
        }}>
          <span>{fetchNotification.text}</span>
          <button
            onClick={() => setFetchNotification(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700, fontSize: '14px', padding: '0 4px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Source Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setSourceFilter('all')}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--border-radius-full)',
              border: sourceFilter === 'all' ? '1.5px solid var(--primary)' : '1px solid var(--gray-300)',
              background: sourceFilter === 'all' ? 'rgba(173,40,49,0.08)' : 'var(--bg-white)',
              color: sourceFilter === 'all' ? 'var(--primary)' : 'var(--gray-600)',
              fontSize: '12px',
              fontWeight: sourceFilter === 'all' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Sparkles size={12} />
            <span>All ({items.length})</span>
          </button>

          <button
            onClick={() => setSourceFilter('community')}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--border-radius-full)',
              border: sourceFilter === 'community' ? '1.5px solid #16a34a' : '1px solid var(--gray-300)',
              background: sourceFilter === 'community' ? 'rgba(22,163,74,0.08)' : 'var(--bg-white)',
              color: sourceFilter === 'community' ? '#15803d' : 'var(--gray-600)',
              fontSize: '12px',
              fontWeight: sourceFilter === 'community' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Users size={12} />
            <span>Community ({communityCount})</span>
          </button>

          <button
            onClick={() => setSourceFilter('external')}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--border-radius-full)',
              border: sourceFilter === 'external' ? '1.5px solid #2563eb' : '1px solid var(--gray-300)',
              background: sourceFilter === 'external' ? 'rgba(37,99,235,0.08)' : 'var(--bg-white)',
              color: sourceFilter === 'external' ? '#1d4ed8' : 'var(--gray-600)',
              fontSize: '12px',
              fontWeight: sourceFilter === 'external' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Globe size={12} />
            <span>External Prep ({externalCount})</span>
          </button>
        </div>

        {/* Stage dropdown & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="form-select"
            style={{ height: '32px', fontSize: '12px', padding: '0 10px', minWidth: '140px' }}
          >
            {Object.entries(stageLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <div style={{ position: 'relative', minWidth: '200px' }}>
            <Search size={13} color="var(--gray-400)" style={{ position: 'absolute', left: '9px', top: '9px' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search questions, topics..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '28px', fontSize: '12px', height: '32px' }}
            />
          </div>
        </div>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-500)', fontSize: '13px' }}>
          <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 8px', color: 'var(--primary)' }} />
          <div>Loading company interview experiences...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card-surface" style={{ textAlign: 'center', padding: '48px 20px', border: '1px dashed var(--gray-300)' }}>
          <MessageSquare size={32} color="var(--gray-400)" style={{ margin: '0 auto 10px' }} />
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-800)', margin: '0 0 4px' }}>
            No interview experiences found for this filter
          </h4>
          <p style={{ fontSize: '12.5px', color: 'var(--gray-500)', maxWidth: '420px', margin: '0 auto 14px' }}>
            {sourceFilter === 'community'
              ? `Be the first to share your interview questions or OA experience for ${company.name}!`
              : `Curated prep archives from LeetCode Discuss, Blind, and GeeksforGeeks.`}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {onOpenLogModal && (
              <button onClick={onOpenLogModal} className="btn-primary btn-sm">
                Log Your Experience
              </button>
            )}
            <button onClick={handleRefreshPrep} className="btn-secondary btn-sm" disabled={isFetchingTavily}>
              Refresh Prep
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredItems.map(item => {
            const isCommunity = item.source_type === 'community';
            const isAuthor = isCommunity && item.author_user_id && String(item.author_user_id) === String(currentUser.id);
            const isReported = reportedIds.has(item.id);

            // Clean formatted date
            let formattedDate = '';
            if (item.created_at) {
              try {
                formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
              } catch {
                formattedDate = String(item.created_at);
              }
            }

            return (
              <div
                key={`${item.source_type}-${item.id}`}
                className="card-surface"
                style={{
                  padding: '16px 18px',
                  borderRadius: 'var(--border-radius-md)',
                  borderLeft: isCommunity ? '4px solid #16a34a' : '4px solid #2563eb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Header Row: Badges & Metadata */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Source Badge */}
                    {isCommunity ? (
                      item.verified_applicant ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#15803d',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          padding: '3px 8px',
                          borderRadius: 'var(--border-radius-full)'
                        }}>
                          <ShieldCheck size={12} color="#16a34a" />
                          <span>Community · Verified applicant</span>
                        </span>
                      ) : item.author === 'Anonymous' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#6b21a8',
                          background: '#faf5ff',
                          border: '1px solid #e9d5ff',
                          padding: '3px 8px',
                          borderRadius: 'var(--border-radius-full)'
                        }}>
                          <EyeOff size={12} color="#9333ea" />
                          <span>Community · Anonymous</span>
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          background: 'rgba(173,40,49,0.08)',
                          border: '1px solid rgba(173,40,49,0.2)',
                          padding: '3px 8px',
                          borderRadius: 'var(--border-radius-full)'
                        }}>
                          <User size={12} />
                          <span>Community · {item.author}</span>
                        </span>
                      )
                    ) : (
                      <a
                        href={item.url || '#'}
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#1d4ed8',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          padding: '3px 8px',
                          borderRadius: 'var(--border-radius-full)',
                          textDecoration: 'none'
                        }}
                      >
                        <Globe size={12} color="#2563eb" />
                        <span>External · {item.author || 'Web Prep'}</span>
                        <ExternalLink size={10} style={{ marginLeft: '1px' }} />
                      </a>
                    )}

                    {/* Stage Tag */}
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--gray-600)',
                      background: 'var(--gray-100)',
                      padding: '2px 8px',
                      borderRadius: 'var(--border-radius-sm)',
                      textTransform: 'capitalize'
                    }}>
                      {item.stage.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Actions & Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--gray-400)' }}>
                    {formattedDate && <span>{formattedDate}</span>}

                    {isAuthor && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11.5px',
                          padding: '2px 4px'
                        }}
                        title="Delete your post"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    )}

                    {isCommunity && !isAuthor && (
                      <button
                        onClick={() => handleReportItem(item.id)}
                        disabled={isReported}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isReported ? '#15803d' : 'var(--gray-400)',
                          cursor: isReported ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          padding: '2px 4px'
                        }}
                        title="Flag inappropriate post"
                      >
                        {isReported ? <CheckCircle2 size={11} /> : <Flag size={11} />}
                        <span>{isReported ? 'Flagged' : 'Report'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Technical Questions Section */}
                {item.technical_questions && (
                  <div style={{
                    padding: '12px 14px',
                    background: 'var(--gray-50)',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--gray-200)'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MessageSquare size={12} color="var(--primary)" />
                      <span>Technical Questions / OA Snippet:</span>
                    </div>
                    <MarkdownView content={item.technical_questions} />
                  </div>
                )}

                {/* Reflection / Takeaways Section */}
                {item.takeaways && (
                  <div style={{ fontSize: '12.5px', color: 'var(--gray-700)', lineHeight: 1.5, background: '#f8fafc', padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '11.5px', marginBottom: '2px' }}>
                      💡 Candidate Reflection & Tips:
                    </div>
                    <MarkdownView content={item.takeaways} />
                  </div>
                )}

                {/* Offer Details if present */}
                {item.offer_details && (
                  <div style={{
                    padding: '6px 10px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 'var(--border-radius-sm)',
                    fontSize: '12px',
                    color: '#15803d',
                    fontWeight: 600
                  }}>
                    🎉 <strong>Offer Details:</strong> {item.offer_details}
                  </div>
                )}

                {/* External link origin if external */}
                {!isCommunity && item.url && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{
                        fontSize: '11px',
                        color: '#2563eb',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'none',
                        fontWeight: 600
                      }}
                    >
                      <span>View full thread on {item.author}</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

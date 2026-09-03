import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2
} from 'lucide-react';
import { Posting, Company, PostingStatus } from '../../types';

interface OpportunitiesViewProps {
  postings: Posting[];
  companies: Company[];
  selectedPosting: Posting | null;
  onSelectPosting: (posting: Posting, tab?: 'jd' | 'matcher' | 'application') => void;
  onStatusChange: (postingId: number, newStatus: PostingStatus) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

interface LocationPreset {
  id: string;
  label: string;
  keywords: string[];
}

const LOCATION_PRESETS: LocationPreset[] = [
  { id: 'all', label: 'All Global Locations', keywords: [] },
  { 
    id: 'us', 
    label: 'United States (US)', 
    keywords: ['united states', 'usa', 'us', 'san francisco', 'new york', 'seattle', 'chicago', 'austin', 'sunnyvale', 'mountain view', 'menlo park', 'cupertino', 'palo alto', 'cambridge, ma', 'boston', 'california', 'texas', 'washington', 'berkeley', 'los angeles', 'redmond'] 
  },
  { 
    id: 'india', 
    label: 'India', 
    keywords: ['india', 'bengaluru', 'bangalore', 'hyderabad', 'gurugram', 'gurgaon', 'noida', 'pune', 'mumbai', 'delhi', 'chennai', 'kolkata'] 
  },
  { 
    id: 'uk', 
    label: 'United Kingdom (UK)', 
    keywords: ['uk', 'united kingdom', 'london', 'england', 'cambridge', 'edinburgh', 'oxford', 'manchester'] 
  },
  { 
    id: 'ireland', 
    label: 'Ireland', 
    keywords: ['ireland', 'dublin', 'cork', 'galway'] 
  },
  { 
    id: 'germany', 
    label: 'Germany', 
    keywords: ['germany', 'berlin', 'munich', 'frankfurt', 'hamburg', 'stuttgart', 'walldorf'] 
  },
  { 
    id: 'switzerland', 
    label: 'Switzerland', 
    keywords: ['switzerland', 'zurich', 'geneva', 'lausanne', 'basel'] 
  },
  { 
    id: 'canada', 
    label: 'Canada', 
    keywords: ['canada', 'toronto', 'vancouver', 'waterloo', 'montreal', 'ottawa'] 
  },
  { 
    id: 'singapore', 
    label: 'Singapore', 
    keywords: ['singapore'] 
  },
  { 
    id: 'netherlands', 
    label: 'Netherlands', 
    keywords: ['netherlands', 'amsterdam', 'rotterdam', 'utrecht', 'eindhoven'] 
  },
  { 
    id: 'france', 
    label: 'France', 
    keywords: ['france', 'paris', 'lyon', 'toulouse', 'grenoble'] 
  },
  { 
    id: 'australia', 
    label: 'Australia', 
    keywords: ['australia', 'sydney', 'melbourne', 'brisbane'] 
  },
  { 
    id: 'japan', 
    label: 'Japan', 
    keywords: ['japan', 'tokyo', 'osaka', 'kyoto'] 
  },
  { 
    id: 'poland', 
    label: 'Poland', 
    keywords: ['poland', 'warsaw', 'krakow', 'wroclaw'] 
  },
  { 
    id: 'israel', 
    label: 'Israel', 
    keywords: ['israel', 'tel aviv', 'haifa', 'herzliya', 'jerusalem'] 
  },
  { 
    id: 'uae', 
    label: 'United Arab Emirates (UAE)', 
    keywords: ['uae', 'united arab emirates', 'dubai', 'abu dhabi'] 
  },
  { 
    id: 'remote', 
    label: 'Remote / Virtual', 
    keywords: ['remote', 'virtual', 'work from home', 'anywhere'] 
  }
];

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  postings,
  companies,
  onSelectPosting,
  searchQuery,
  onSearchChange
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [filterOnlyRelevant, setFilterOnlyRelevant] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Helper to test if a posting matches a country/region preset
  const matchesLocationPreset = (p: Posting, presetId: string): boolean => {
    if (presetId === 'all') return true;
    const preset = LOCATION_PRESETS.find(lp => lp.id === presetId);
    if (!preset || preset.keywords.length === 0) return true;
    const locStr = typeof p.location === 'string' ? p.location : (p.location as any)?.name || 'Multiple Locations';
    const text = (locStr + ' ' + (p.title || '')).toLowerCase();
    return preset.keywords.some(k => {
      if (k.length <= 3) {
        return new RegExp(`\\b${k}\\b`, 'i').test(text);
      }
      return text.includes(k);
    });
  };

  const getLocationCount = (presetId: string): number => {
    if (presetId === 'all') return postings.length;
    return postings.filter(p => matchesLocationPreset(p, presetId)).length;
  };

  // Filter list
  const filteredPostings = postings.filter(p => {
    if (filterOnlyRelevant && !p.relevant) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (selectedCompanyId !== null && p.company_id !== selectedCompanyId) return false;
    if (selectedLocation !== 'all' && !matchesLocationPreset(p, selectedLocation)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const locStr = typeof p.location === 'string' ? p.location : (p.location as any)?.name || 'Multiple Locations';
      const matchTitle = (p.title || '').toLowerCase().includes(q);
      const matchComp = (p.company_name || '').toLowerCase().includes(q);
      const matchTeam = (p.team || '').toLowerCase().includes(q);
      const matchLoc = locStr.toLowerCase().includes(q);
      const matchSkills = (p.required_skills || []).some(s => (s || '').toLowerCase().includes(q));
      if (!matchTitle && !matchComp && !matchTeam && !matchLoc && !matchSkills) return false;
    }
    return true;
  });

  const displayCompanies = companies.length > 0 
    ? companies 
    : Array.from(new Set(postings.map(p => p.company_name))).filter(Boolean).map((name, idx) => {
        const matching = postings.filter(p => p.company_name === name);
        return {
          id: matching[0]?.company_id || (idx + 1),
          name,
          category: 'enterprise_mnc' as any,
          ats_type: 'custom' as any,
          careers_page_url: '#',
          is_healthy: true,
          enabled: true,
          new_postings_count: matching.filter(p => p.status === 'new' && p.relevant).length,
          total_postings_count: matching.length
        } as Company;
      });

  const statusCounts = {
    all: postings.length,
    new: postings.filter(p => p.status === 'new').length,
    reviewed: postings.filter(p => p.status === 'reviewed').length,
    needs_review: postings.filter(p => p.status === 'needs_review').length,
    applied: postings.filter(p => p.status === 'applied').length,
    ignored: postings.filter(p => p.status === 'ignored').length
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-container">
        <div>
          <h1 className="page-title">Opportunities</h1>
          <p className="page-subtitle">
            Relevant software engineering roles detected across your monitored official company career endpoints.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`btn-sm ${filterOnlyRelevant ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterOnlyRelevant(!filterOnlyRelevant)}
            title="Filter to postings verified relevant to your profile preferences"
          >
            <CheckCircle2 size={13} />
            <span>{filterOnlyRelevant ? 'Relevant Only (Active)' : 'Show All Postings'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{
        backgroundColor: 'var(--bg-white)',
        border: '1px solid var(--gray-200)',
        borderRadius: 'var(--border-radius-md)',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: 'var(--shadow-xs)'
      }}>
        {/* Top Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--gray-100)', padding: '3px', borderRadius: 'var(--border-radius-sm)' }}>
            {[
              { id: 'all', label: 'All Postings' },
              { id: 'new', label: 'New', count: statusCounts.new, isNew: true },
              { id: 'reviewed', label: 'Interested', count: statusCounts.reviewed },
              { id: 'needs_review', label: 'Needs Review', count: statusCounts.needs_review },
              { id: 'applied', label: 'Applied', count: statusCounts.applied },
              { id: 'ignored', label: 'Ignored', count: statusCounts.ignored }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  border: 'none',
                  background: statusFilter === tab.id ? 'var(--bg-white)' : 'transparent',
                  color: statusFilter === tab.id ? 'var(--primary-navy)' : 'var(--gray-600)',
                  fontWeight: statusFilter === tab.id ? 700 : 500,
                  fontSize: '12.5px',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: statusFilter === tab.id ? 'var(--shadow-xs)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{
                    fontSize: '10.5px',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    backgroundColor: tab.isNew ? 'var(--accent-crimson)' : 'var(--gray-200)',
                    color: tab.isNew ? 'white' : 'var(--gray-700)',
                    fontWeight: 700
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Company & Location Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="form-select"
              value={selectedCompanyId === null ? 'all' : selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value === 'all' ? null : Number(e.target.value))}
              style={{ fontSize: '12.5px', padding: '6px 10px', height: '34px' }}
            >
              <option value="all">All Companies ({displayCompanies.length})</option>
              {displayCompanies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.total_postings_count})
                </option>
              ))}
            </select>

            <select
              className="form-select"
              value={selectedLocation}
              onChange={e => setSelectedLocation(e.target.value)}
              style={{ fontSize: '12.5px', padding: '6px 10px', height: '34px', minWidth: '185px' }}
            >
              {LOCATION_PRESETS.map(preset => {
                const count = getLocationCount(preset.id);
                return (
                  <option key={preset.id} value={preset.id}>
                    {preset.label} {preset.id !== 'all' ? `(${count})` : `(${postings.length})`}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Search Bar Input */}
        <div style={{ position: 'relative' }}>
          <Search size={15} color="var(--gray-400)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by role title, team, technologies (e.g. Distributed Systems, Java, C++, eBPF)..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            style={{ paddingLeft: '36px', fontSize: '13px', height: '36px' }}
          />
        </div>
      </div>

      {/* Postings Results Feed */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', fontSize: '12.5px', color: 'var(--gray-500)' }}>
          <span>Showing {filteredPostings.length} opportunities</span>
          <span>Sorted by discovery time (most recent first)</span>
        </div>

        {filteredPostings.length === 0 ? (
          <div className="card-surface" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Filter size={36} color="var(--gray-400)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '6px' }}>
              No opportunities found matching these filters.
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--gray-600)', maxWidth: '420px', margin: '0 auto 16px' }}>
              Try adjusting your search terms, clearing company filters, or checking your Preferences.
            </p>
            <button
              className="btn-secondary btn-sm"
              onClick={() => {
                setStatusFilter('all');
                setSelectedCompanyId(null);
                setSelectedLocation('all');
                onSearchChange('');
              }}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredPostings.map(posting => (
              <div
                key={posting.id}
                className="opportunity-feed-card"
                onClick={() => onSelectPosting(posting, 'matcher')}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {posting.status === 'new' && <span className="badge-new">NEW</span>}
                      <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                        {posting.company_name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                        • First seen {posting.first_seen_at}
                      </span>
                      {posting.status === 'reviewed' && (
                        <span className="badge-tag-cream" style={{ fontSize: '10.5px' }}>INTERESTED</span>
                      )}
                      {posting.status === 'needs_review' && (
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.4px' }}>NEEDS REVIEW</span>
                      )}
                      {posting.status === 'applied' && (
                        <span className="badge-tag" style={{ fontSize: '10.5px', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-success-border)' }}>APPLIED</span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '8px' }}>
                      {posting.title}
                    </h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      <span className="badge-tag">{posting.team}</span>
                      <span className="badge-tag">{typeof posting.location === 'string' ? posting.location : (posting.location as any)?.name || 'Multiple Locations'}</span>
                      {posting.stipend_estimate && (
                        <span className="badge-tag-navy">{posting.stipend_estimate}</span>
                      )}
                      {posting.deadline && (
                        <span className="badge-tag" style={{ color: 'var(--color-warning)' }}>
                          Deadline: {posting.deadline}
                        </span>
                      )}
                    </div>

                    {posting.classification_rationale && (
                      <div style={{
                        backgroundColor: 'var(--bg-warm-cream-tint)',
                        border: '1px solid var(--bg-warm-cream-border)',
                        borderRadius: 'var(--border-radius-sm)',
                        padding: '8px 12px',
                        fontSize: '12px',
                        color: '#784c00',
                        lineHeight: 1.4,
                        marginBottom: '10px'
                      }}>
                        <strong>Why it fits:</strong> {posting.classification_rationale}
                      </div>
                    )}
                  </div>

                  {/* Right Score Pill */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="match-score-pill">
                      {posting.relevance_score || 95}% Fit
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--gray-150)',
                  paddingTop: '10px',
                  marginTop: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="btn-accent btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPosting(posting, 'matcher');
                      }}
                    >
                      <Sparkles size={13} />
                      <span>Interested (Match)</span>
                    </button>

                    <button
                      className="btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPosting(posting, 'jd');
                      }}
                    >
                      View JD
                    </button>

                    <button
                      className="btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPosting(posting, 'application');
                      }}
                    >
                      Application Tracker
                    </button>
                  </div>

                  <a
                    href={posting.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--gray-600)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    <span>Official ATS Portal</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

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

  // Filter list
  const filteredPostings = postings.filter(p => {
    if (filterOnlyRelevant && !p.relevant) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (selectedCompanyId !== null && p.company_id !== selectedCompanyId) return false;
    if (selectedLocation !== 'all' && !p.location.toLowerCase().includes(selectedLocation.toLowerCase())) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchComp = p.company_name.toLowerCase().includes(q);
      const matchTeam = p.team.toLowerCase().includes(q);
      const matchLoc = p.location.toLowerCase().includes(q);
      const matchSkills = (p.required_skills || []).some(s => s.toLowerCase().includes(q));
      if (!matchTitle && !matchComp && !matchTeam && !matchLoc && !matchSkills) return false;
    }
    return true;
  });

  const statusCounts = {
    all: postings.length,
    new: postings.filter(p => p.status === 'new').length,
    reviewed: postings.filter(p => p.status === 'reviewed').length,
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
              <option value="all">All Companies ({companies.length})</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.total_postings_count})
                </option>
              ))}
            </select>

            <select
              className="form-select"
              value={selectedLocation}
              onChange={e => setSelectedLocation(e.target.value)}
              style={{ fontSize: '12.5px', padding: '6px 10px', height: '34px' }}
            >
              <option value="all">All Locations</option>
              <option value="bengaluru">Bengaluru</option>
              <option value="hyderabad">Hyderabad</option>
              <option value="gurugram">Gurugram</option>
              <option value="united states">United States</option>
              <option value="remote">Remote</option>
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
                      {posting.status === 'applied' && (
                        <span className="badge-tag" style={{ fontSize: '10.5px', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-success-border)' }}>APPLIED</span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '8px' }}>
                      {posting.title}
                    </h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      <span className="badge-tag">{posting.team}</span>
                      <span className="badge-tag">{posting.location}</span>
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

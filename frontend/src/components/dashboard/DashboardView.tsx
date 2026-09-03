import React from 'react';
import {
  Radio,
  Zap,
  Send,
  Calendar,
  Sparkles,
  Plus,
  Layers,
  ArrowRight
} from 'lucide-react';
import { UserProfile, Posting, Application, AppRoute, PostingStatus } from '../../types';

interface DashboardViewProps {
  currentUser: UserProfile;
  postings: Posting[];
  applications: Application[];
  profileCompletion: { percentage: number; checklist: { name: string; completed: boolean; link: string }[] };
  onNavigate: (route: AppRoute) => void;
  onSelectPosting: (posting: Posting, tab?: 'jd' | 'matcher' | 'application') => void;
  onStatusChange: (postingId: number, newStatus: PostingStatus) => void;
}

const getCompanyLogoClass = (name: string) => {
  const key = name.toLowerCase().replace(/\s+/g, '');
  const map: Record<string, string> = {
    google: 'company-logo-google',
    stripe: 'company-logo-stripe',
    amazon: 'company-logo-amazon',
    microsoft: 'company-logo-microsoft',
    'goldmansachs': 'company-logo-goldman',
    'jpmorganchase': 'company-logo-jpmorgan',
    citadel: 'company-logo-citadel',
  };
  return map[key] || 'company-logo-default';
};

const getTimeAgo = (dateStr: string) => {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (isNaN(diffMs)) return 'Recently';
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  postings,
  applications,
  onNavigate,
  onSelectPosting
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = currentUser.full_name?.trim().split(' ')[0] || 'there';

  // Derived real data strictly from state without any fake mock numbers
  const newRelevantPostings = postings.filter(p => p.status === 'new' && p.relevant);
  const matchesCount = postings.filter(p => p.relevant && (p.status === 'reviewed' || p.status === 'applied')).length;
  const activeApplications = applications.filter(a => a.stage === 'applied' || a.stage === 'oa' || a.stage === 'interview' || a.stage === 'offer');
  const interviewCount = applications.filter(a => a.stage === 'interview').length;

  const topSkills = currentUser.skills?.slice(0, 10).map(s => s.name) || [];

  // Generate real dynamic activities based on actual user and posting events
  const generateActivities = () => {
    const activities: { text: string; time: string; type: 'posting' | 'match' | 'app' | 'project' }[] = [];

    // Applications activity
    applications.slice(0, 3).forEach(app => {
      const comp = app.posting?.company_name || 'Target Company';
      activities.push({
        text: `Application tracked: ${comp} (${app.stage})`,
        time: getTimeAgo(app.updated_at || app.applied_date || ''),
        type: 'app'
      });
    });

    // Recent new postings activity
    postings.filter(p => p.relevant).slice(0, 3).forEach(p => {
      activities.push({
        text: `New relevant posting: ${p.company_name} — ${p.title}`,
        time: getTimeAgo(p.first_seen_at),
        type: 'posting'
      });
    });

    // User project additions
    (currentUser.projects || []).slice(0, 2).forEach(proj => {
      activities.push({
        text: `Project added to ground-truth: ${proj.name}`,
        time: 'Portfolio',
        type: 'project'
      });
    });

    return activities.slice(0, 4);
  };

  const dynamicActivities = generateActivities();

  const metricCards = [
    {
      value: newRelevantPostings.length,
      label: 'New relevant postings',
      icon: Radio,
      color: 'var(--primary)',
      route: 'opportunities' as AppRoute
    },
    {
      value: matchesCount,
      label: 'Matches generated',
      icon: Zap,
      color: 'var(--color-warning)',
      route: 'opportunities' as AppRoute
    },
    {
      value: activeApplications.length,
      label: 'Applications submitted',
      icon: Send,
      color: 'var(--color-success)',
      route: 'applications' as AppRoute
    },
    {
      value: interviewCount,
      label: 'Interviews scheduled',
      icon: Calendar,
      color: '#6366f1',
      route: 'applications' as AppRoute
    }
  ];

  return (
    <div>
      {/* ── Greeting Header ── */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title" style={{ fontSize: '26px' }}>
          {getGreeting()}, {firstName}
        </h1>
        <p className="page-subtitle">
          Here's what's new with your job search.
        </p>
      </div>

      {/* ── 4 Top Stat Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="metric-card"
              style={{ cursor: 'pointer', paddingLeft: '24px' }}
              onClick={() => onNavigate(card.route)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: `${card.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={16} color={card.color} />
                </div>
              </div>
              <div className="metric-value" style={{ color: 'var(--gray-900)' }}>
                {card.value}
              </div>
              <div className="metric-trend">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Main Content: Two Columns ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column: Latest Relevant Postings */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)' }}>
              Latest Relevant Postings
            </h2>
            {newRelevantPostings.length > 0 && (
              <button
                className="btn-ghost btn-sm"
                onClick={() => onNavigate('opportunities')}
                style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}
              >
                View all →
              </button>
            )}
          </div>

          {newRelevantPostings.length === 0 ? (
            <div className="card-surface" style={{ textAlign: 'center', padding: '52px 24px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(173, 40, 49, 0.08)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Sparkles size={24} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '6px' }}>
                No new postings yet
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--gray-500)', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                Argus monitors official company career pages. When new postings matching your criteria appear, they will show up here.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '6px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => onNavigate('preferences')}
                  style={{ borderRadius: 'var(--border-radius-full)', padding: '11px 24px', fontSize: '14.5px' }}
                >
                  Configure Target Companies
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => onNavigate('opportunities')}
                  style={{ borderRadius: 'var(--border-radius-full)', padding: '11px 24px', fontSize: '14.5px' }}
                >
                  Browse All Jobs
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {newRelevantPostings.slice(0, 5).map(posting => (
                <div
                  key={posting.id}
                  className="opportunity-feed-card"
                  onClick={() => onSelectPosting(posting, 'matcher')}
                  style={{ padding: '18px 20px', marginBottom: 0 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1 }}>
                      <div className={`company-logo ${getCompanyLogoClass(posting.company_name)}`}
                        style={{ borderRadius: 'var(--border-radius-sm)', marginTop: '2px' }}>
                        {posting.company_name.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '3px' }}>
                          {posting.title}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '8px' }}>
                          {posting.company_name} · {typeof posting.location === 'string' ? posting.location : (posting.location as any)?.name || 'Multiple Locations'}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {posting.team && (
                            <span className="badge-tag" style={{ fontSize: '11px', padding: '2px 8px' }}>
                              {posting.team}
                            </span>
                          )}
                          {posting.required_skills?.slice(0, 3).map((skill, i) => (
                            <span key={i} className="badge-tag" style={{ fontSize: '11px', padding: '2px 8px' }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--gray-400)' }}>
                        {getTimeAgo(posting.first_seen_at)}
                      </span>
                      <button
                        className="btn-primary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPosting(posting, 'matcher');
                        }}
                        style={{
                          fontSize: '12px',
                          padding: '5px 14px',
                          borderRadius: 'var(--border-radius-full)'
                        }}
                      >
                        <span>Interested</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Top Skills & Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Skills Card */}
          <div className="card-surface" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)' }}>
                Your Top Skills
              </h3>
              {topSkills.length > 0 && (
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => onNavigate('profile_skills')}
                  style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, padding: 0 }}
                >
                  View all →
                </button>
              )}
            </div>

            {topSkills.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '12px' }}>
                  No skills entered yet. Adding your skills allows Argus to ground JD matches in your real capabilities.
                </p>
                <button
                  className="btn-outline-primary btn-sm"
                  onClick={() => onNavigate('profile_skills')}
                  style={{ borderRadius: 'var(--border-radius-full)', fontSize: '12px' }}
                >
                  <Plus size={13} />
                  <span>Add Skills</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {topSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="badge-tag"
                    style={{
                      fontSize: '12px',
                      padding: '5px 12px',
                      borderRadius: 'var(--border-radius-full)',
                      fontWeight: 500
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Card */}
          <div className="card-surface" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '16px' }}>
              Recent Activity
            </h3>

            {dynamicActivities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                  No activity recorded yet. Explore opportunities or add portfolio projects to see updates.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {dynamicActivities.map((item, i) => {
                  const dotColor =
                    item.type === 'posting' ? 'var(--primary)' :
                    item.type === 'app' ? 'var(--color-success)' :
                    item.type === 'match' ? 'var(--color-warning)' :
                    '#6366f1';

                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: dotColor,
                        marginTop: '6px',
                        flexShrink: 0
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: 'var(--gray-800)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                          {item.text}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>
                          {item.time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Portfolio Ground Truth Action */}
          {(currentUser.projects || []).length === 0 && (
            <div className="card-surface" style={{ padding: '18px 20px', borderLeft: '3px solid var(--primary)', backgroundColor: 'var(--primary-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Layers size={16} color="var(--primary)" />
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--primary-dark)' }}>
                  Ground-Truth Portfolio
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--gray-700)', lineHeight: 1.4, marginBottom: '10px' }}>
                Add your real engineering projects (NioFlow, CloudWeave, etc.) so Argus never invents evidence when matching JDs.
              </p>
              <button
                className="btn-primary btn-sm"
                onClick={() => onNavigate('profile_projects')}
                style={{ fontSize: '12px', padding: '4px 12px', borderRadius: 'var(--border-radius-full)' }}
              >
                <span>Add Projects</span>
                <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

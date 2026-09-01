import React from 'react';
import { 
  Sparkles, 
  FileText, 
  FolderGit2, 
  ArrowRight, 
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { Posting, MatchResult, UserProfile } from '../../types';

interface MatchResultViewProps {
  posting: Posting;
  matchResult: MatchResult;
  currentUser: UserProfile;
  onOpenPortfolio: () => void;
  onApplyAction: () => void;
  onViewResume?: (resumeId: string) => void;
}

export const MatchResultView: React.FC<MatchResultViewProps> = ({
  matchResult,
  currentUser,
  onOpenPortfolio,
  onApplyAction,
  onViewResume
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Top Fit Summary Callout */}
      <div className="match-explanation-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gray-900)' }}>
              Argus Match Overview
            </h3>
          </div>
          <span className="match-score-pill">
            {matchResult.overall_fit_score}% Fit Alignment
          </span>
        </div>

        <p style={{ fontSize: '13.5px', color: 'var(--gray-800)', lineHeight: 1.5, marginBottom: '14px' }}>
          {matchResult.overall_fit_summary}
        </p>

        {/* Relevant Capabilities & Requirements Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
          borderTop: '1px solid var(--bg-cream-border)',
          paddingTop: '12px'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Key JD Requirements Identified
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {matchResult.key_requirements.map((req, i) => (
                <span key={i} className="badge-tag" style={{ fontSize: '11px', background: 'white' }}>
                  {req}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Your Core Matching Capabilities
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {matchResult.relevant_capabilities.map((cap, i) => (
                <span key={i} className="badge-tag-navy" style={{ fontSize: '11px', background: 'white' }}>
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Honest Guardrails / Gap Analysis */}
      {matchResult.missing_or_gap_skills && matchResult.missing_or_gap_skills.length > 0 && (
        <div style={{
          backgroundColor: 'var(--primary-tint)',
          border: '1px solid var(--bg-cream-border)',
          borderRadius: 'var(--border-radius-md)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}>
          <AlertTriangle size={17} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '2px' }}>
              Honest Gap Check (Missing Portfolio Evidence)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gray-700)', lineHeight: 1.4 }}>
              The JD mentions {matchResult.missing_or_gap_skills.join(', ')}, but no verified evidence was found in your saved projects or experience. Argus will not fabricate claims.
            </div>
          </div>
        </div>
      )}

      {/* 3. Matched Projects (Ground Truth Anchor) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary-navy)' }}>
              Recommended Projects to Feature
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
              Ranked from your ground-truth portfolio ({currentUser.projects?.length || 0} projects)
            </p>
          </div>

          <button
            onClick={onOpenPortfolio}
            className="btn-ghost btn-sm"
            style={{ fontSize: '11.5px', color: 'var(--primary-navy)', fontWeight: 600 }}
          >
            Manage Portfolio →
          </button>
        </div>

        {matchResult.recommendations.length === 0 ? (
          <div className="card-surface" style={{ textAlign: 'center', padding: '24px' }}>
            <FolderGit2 size={24} color="var(--gray-400)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>
              No projects in portfolio.
            </div>
            <button className="btn-secondary btn-sm" onClick={onOpenPortfolio} style={{ marginTop: '8px' }}>
              + Add Projects to Portfolio
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {matchResult.recommendations.map((rec, index) => (
              <div key={rec.projectId} className="matched-project-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="match-rank-badge">0{index + 1}</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary-navy)' }}>
                      {rec.project.name}
                    </span>
                    {rec.project.github_url && (
                      <a href={rec.project.github_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray-400)' }}>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <span className="match-score-pill" style={{ fontSize: '11.5px' }}>
                    {rec.score}% relevance
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {rec.matchingKeywords.map((kw, i) => (
                    <span key={i} className="badge-tag-navy" style={{ fontSize: '11px' }}>
                      {kw}
                    </span>
                  ))}
                  {rec.project.tech_stack.slice(0, 3).map((t, i) => (
                    <span key={i} className="badge-tag" style={{ fontSize: '11px' }}>
                      {t}
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: '12.5px', color: 'var(--gray-700)', lineHeight: 1.4, marginBottom: '10px' }}>
                  <strong>Why it fits:</strong> {rec.rationale}
                </div>

                {/* Recommended Bullets */}
                {rec.recommendedBullets && rec.recommendedBullets.length > 0 && (
                  <div style={{
                    backgroundColor: 'var(--gray-50)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: 'var(--border-radius-sm)',
                    padding: '10px 12px',
                    fontSize: '12px',
                    color: 'var(--gray-800)'
                  }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Suggested Resume Bullet Point
                    </div>
                    <div style={{ fontStyle: 'italic', lineHeight: 1.4 }}>
                      "{rec.recommendedBullets[0]}"
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Matched Professional Experience */}
      {matchResult.matched_experiences && matchResult.matched_experiences.length > 0 && (
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '10px' }}>
            Relevant Professional Experience
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {matchResult.matched_experiences.map(item => (
              <div key={item.experienceId} className="card-surface" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-navy)' }}>
                    {item.experience.position}
                  </div>
                  <span className="badge-tag-navy" style={{ fontSize: '11px' }}>
                    {item.experience.company}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px' }}>
                  {item.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Recommended Resume Version & Skills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {/* Recommended Resume */}
        <div className="card-surface" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <FileText size={16} color="var(--primary-navy)" />
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-navy)' }}>
              Recommended Resume
            </h4>
          </div>

          {matchResult.recommended_resume ? (
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '2px' }}>
                {matchResult.recommended_resume.resume.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginBottom: '8px' }}>
                Focus: {matchResult.recommended_resume.resume.role_focus}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '12px' }}>
                {matchResult.recommended_resume.rationale}
              </p>
              <button
                className="btn-secondary btn-sm"
                onClick={() => onViewResume && onViewResume(matchResult.recommended_resume!.resume.id)}
                style={{ width: '100%' }}
              >
                Inspect Resume ({matchResult.recommended_resume.resume.file_name})
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
              Upload a resume in Profile &gt; Resumes to get automated version recommendations.
            </div>
          )}
        </div>

        {/* Skills to Emphasize */}
        <div className="card-surface" style={{ padding: '18px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '10px' }}>
            Skills to Emphasize
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {matchResult.matched_skills.map((skill, i) => (
              <span key={i} className="badge-tag-navy" style={{ fontSize: '11.5px' }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Action Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--gray-200)',
        paddingTop: '16px'
      }}>
        <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
          Ready to submit your customized application?
        </span>
        <button
          className="btn-primary"
          onClick={onApplyAction}
          style={{ padding: '10px 20px' }}
        >
          <span>Open Application Tracker</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};

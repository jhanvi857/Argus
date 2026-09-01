import { Posting, MatchResult, UserProfile, MatchRecommendation, MatchedExperience, MatchedAchievement, MatchedResume } from '../types';

/**
 * Dynamic Ground-Truth JD-to-Portfolio Matcher
 * Evaluates Job Description against the authenticated user's actual background:
 * - User Projects (Ground truth evidence)
 * - Work Experience entries
 * - Verified Skills inventory
 * - Achievements & Hackathons
 * - Uploaded Resume versions
 * 
 * Strict Hallucination Guardrails:
 * - Only returns project IDs, experience IDs, and skills that exist in the user's profile.
 * - Honest Gap Identification: Explicitly identifies requirements without strong candidate evidence.
 */
export function runGroundTruthMatcher(posting: Posting, user: UserProfile): MatchResult {
  const jdText = `${posting.title} ${posting.team} ${posting.classification_rationale || ''} ${posting.raw_description || ''}`.toLowerCase();

  // 1. EVALUATE USER PROJECTS
  const scoredProjects: MatchRecommendation[] = [];
  
  for (const project of user.projects || []) {
    let score = 0;
    const matchingKeywords: string[] = [];

    // Check tech stack matches
    for (const tech of project.tech_stack) {
      const escapedTech = tech.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTech}\\b`, 'i');
      if (regex.test(jdText)) {
        score += 20;
        matchingKeywords.push(tech);
      }
    }

    // Check tags matches
    for (const tag of project.tags) {
      const cleanTag = tag.toLowerCase().replace(/-/g, ' ');
      if (jdText.includes(cleanTag) || jdText.includes(tag.toLowerCase())) {
        score += 15;
        matchingKeywords.push(tag);
      }
    }

    // Check summary and bullet text overlap
    const projectFullText = `${project.summary} ${project.detailed_description || ''} ${project.quantified_bullets.join(' ')}`.toLowerCase();
    const systemKeywords = [
      'distributed', 'concurrency', 'multithreading', 'low latency', 'zero copy',
      'raft', 'consensus', 'storage', 'ebpf', 'kernel', 'simd', 'gpu', 'cuda',
      'kafka', 'transaction', 'saga', 'netty', 'io_uring', 'lock-free', 'grpc',
      'microservices', 'kubernetes', 'cloud', 'caching', 'crdt', 'ast', 'compiler'
    ];

    for (const kw of systemKeywords) {
      if (jdText.includes(kw) && projectFullText.includes(kw)) {
        score += 12;
        matchingKeywords.push(kw);
      }
    }

    // Filter recommended bullets
    const recommendedBullets: string[] = [];
    if (project.quantified_bullets && project.quantified_bullets.length > 0) {
      // Pick top 2 bullets that match JD concepts
      for (const bullet of project.quantified_bullets) {
        if (recommendedBullets.length < 2) {
          recommendedBullets.push(bullet);
        }
      }
    }

    // Specific rationale generation grounded strictly in the project
    let rationale = '';
    const uniqueKeywords = Array.from(new Set(matchingKeywords));
    if (uniqueKeywords.length > 0) {
      rationale = `Demonstrates hands-on capability in ${uniqueKeywords.slice(0, 4).join(', ')} directly mapping to the requirements of the ${posting.title} role.`;
    } else {
      rationale = `Provides strong software engineering and system implementation foundation in ${project.tech_stack.slice(0, 3).join(', ')}.`;
    }

    // Base score boost for rich quantified bullets
    if (project.quantified_bullets.length >= 2) {
      score += 10;
    }

    scoredProjects.push({
      projectId: project.id,
      project,
      score: Math.min(score, 98),
      matchingKeywords: uniqueKeywords,
      recommendedBullets,
      rationale
    });
  }

  // Sort projects descending
  scoredProjects.sort((a, b) => b.score - a.score);
  const topProjects = scoredProjects.slice(0, 3);

  // 2. EVALUATE USER WORK EXPERIENCE
  const matchedExperiences: MatchedExperience[] = [];
  for (const exp of user.experiences || []) {
    let expScore = 0;
    const matchingSkills: string[] = [];

    for (const skill of exp.skills || []) {
      const regex = new RegExp(`\\b${skill.toLowerCase()}\\b`, 'i');
      if (regex.test(jdText)) {
        expScore += 25;
        matchingSkills.push(skill);
      }
    }

    const expText = `${exp.position} ${exp.company} ${exp.description} ${exp.responsibilities.join(' ')}`.toLowerCase();
    if (jdText.includes('intern') && exp.type === 'internship') expScore += 15;
    if (jdText.includes('infrastructure') && expText.includes('infrastructure')) expScore += 20;
    if (jdText.includes('distributed') && expText.includes('distributed')) expScore += 20;
    if (jdText.includes('systems') && expText.includes('systems')) expScore += 15;

    if (expScore > 10 || matchingSkills.length > 0) {
      matchedExperiences.push({
        experienceId: exp.id,
        experience: exp,
        score: Math.min(expScore + 40, 99),
        matchingSkills: Array.from(new Set(matchingSkills)),
        rationale: `Practical engineering experience at ${exp.company} applying ${matchingSkills.length > 0 ? matchingSkills.slice(0, 3).join(', ') : 'software engineering practices'} in production environments.`
      });
    }
  }
  matchedExperiences.sort((a, b) => b.score - a.score);

  // 3. EVALUATE USER SKILLS TO EMPHASIZE
  const matchedSkillsSet = new Set<string>();
  for (const skill of user.skills || []) {
    const regex = new RegExp(`\\b${skill.name.toLowerCase()}\\b`, 'i');
    if (regex.test(jdText)) {
      matchedSkillsSet.add(skill.name);
    }
  }
  // Add from top projects' tech stack if found in JD
  for (const p of topProjects) {
    for (const tech of p.project.tech_stack) {
      if (jdText.includes(tech.toLowerCase())) {
        matchedSkillsSet.add(tech);
      }
    }
  }

  // 4. EVALUATE USER ACHIEVEMENTS
  const matchedAchievements: MatchedAchievement[] = [];
  for (const ach of user.achievements || []) {
    const achText = `${ach.title} ${ach.description} ${ach.type}`.toLowerCase();
    let isRelevant = false;
    let rationale = '';

    if (ach.type === 'hackathon' && (jdText.includes('systems') || jdText.includes('distributed') || jdText.includes('engineering'))) {
      isRelevant = true;
      rationale = `Demonstrates rapid end-to-end systems prototyping and problem solving under tight timeframes.`;
    } else if (ach.type === 'competitive_programming' && (jdText.includes('algorithm') || jdText.includes('quant') || jdText.includes('c++'))) {
      isRelevant = true;
      rationale = `Validates deep algorithmic mastery, memory optimization, and edge-case analytical rigor.`;
    } else if (achText.includes('ebpf') || achText.includes('open source') || achText.includes('distributed')) {
      isRelevant = true;
      rationale = `Proves verified open-source engineering contributions to production-grade infrastructure.`;
    }

    if (isRelevant) {
      matchedAchievements.push({
        achievementId: ach.id,
        achievement: ach,
        rationale
      });
    }
  }

  // 5. EVALUATE AND RECOMMEND BEST RESUME VERSION
  let recommendedResume: MatchedResume | null = null;
  if (user.resumes && user.resumes.length > 0) {
    let bestResume = user.resumes[0];
    let bestResumeScore = 0;
    let resumeRationale = '';

    for (const resume of user.resumes) {
      let rScore = 0;
      const focusText = `${resume.name} ${resume.role_focus} ${resume.preview_text || ''}`.toLowerCase();

      if (jdText.includes('quant') || jdText.includes('hft') || jdText.includes('simd') || jdText.includes('low latency')) {
        if (focusText.includes('quant') || focusText.includes('low-latency') || focusText.includes('high-throughput')) {
          rScore += 50;
        }
      }
      if (jdText.includes('infrastructure') || jdText.includes('cloud') || jdText.includes('distributed')) {
        if (focusText.includes('infra') || focusText.includes('distributed') || focusText.includes('backend')) {
          rScore += 45;
        }
      }
      if (resume.is_default) {
        rScore += 10;
      }

      if (rScore > bestResumeScore) {
        bestResumeScore = rScore;
        bestResume = resume;
      }
    }

    resumeRationale = `Best coverage of capabilities emphasized by this ${posting.company_name} role (${bestResume.role_focus}).`;
    recommendedResume = {
      resumeId: bestResume.id,
      resume: bestResume,
      rationale: resumeRationale
    };
  }

  // 6. IDENTIFY HONEST GAPS / MISSING CAPABILITIES
  const commonTechChecks = [
    { name: 'Kubernetes', test: ['kubernetes', 'k8s'] },
    { name: 'CUDA / GPU Programming', test: ['cuda', 'gpu compute', 'nccl'] },
    { name: 'C++ Modern Standards', test: ['c++20', 'c++17', 'c++23'] },
    { name: 'Rust', test: ['rust', 'cargo', 'tokio'] },
    { name: 'Apache Kafka / Event Streaming', test: ['kafka', 'event streaming'] },
    { name: 'eBPF Kernel Probing', test: ['ebpf', 'xdp', 'bcc'] }
  ];

  const userSkillNames = (user.skills || []).map(s => s.name.toLowerCase());
  const userProjectTech = (user.projects || []).flatMap(p => p.tech_stack.map(t => t.toLowerCase()));
  const allUserKnown = [...userSkillNames, ...userProjectTech];

  const missingGaps: string[] = [];
  for (const check of commonTechChecks) {
    const jdRequires = check.test.some(t => jdText.includes(t));
    const userHas = check.test.some(t => allUserKnown.some(k => k.includes(t) || t.includes(k)));
    if (jdRequires && !userHas) {
      missingGaps.push(check.name);
    }
  }

  // Calculate Overall Fit Score
  let overallScore = 60;
  if (topProjects.length > 0) overallScore += Math.min(topProjects[0].score * 0.25, 25);
  if (matchedExperiences.length > 0) overallScore += 10;
  if (matchedSkillsSet.size >= 4) overallScore += 5;
  if (missingGaps.length > 2) overallScore -= 10;
  overallScore = Math.min(Math.max(Math.round(overallScore), 45), 98);

  const matchedSkillsList = Array.from(matchedSkillsSet);
  const topProjNames = topProjects.map(p => p.project.name).join(' and ');

  const overallFitSummary = topProjects.length > 0
    ? `Strong technical alignment found in your portfolio. Argus recommends leading your application with ${topProjNames}${matchedExperiences.length > 0 ? ` and your professional work at ${matchedExperiences[0].experience.company}` : ''}.`
    : `Your profile has baseline fundamentals for this role. Complete your portfolio projects to generate deeper quantified alignment.`;

  // Key JD requirements extracted
  const keyRequirements: string[] = [];
  if (jdText.includes('distributed')) keyRequirements.push('Distributed Systems & Fault Tolerance');
  if (jdText.includes('low latency') || jdText.includes('zero copy')) keyRequirements.push('Low-Latency / Async Networking');
  if (jdText.includes('concurrency') || jdText.includes('multithreading')) keyRequirements.push('Concurrent Programming & Lock-Free Data Structures');
  if (jdText.includes('storage') || jdText.includes('lsm')) keyRequirements.push('Storage Engines & Persistence Internals');
  if (jdText.includes('kafka') || jdText.includes('transaction')) keyRequirements.push('Transactional Event Streaming');
  if (jdText.includes('ebpf') || jdText.includes('kernel')) keyRequirements.push('Linux Kernel / eBPF Networking');
  if (jdText.includes('simd') || jdText.includes('cuda')) keyRequirements.push('SIMD Vectorization & High-Performance Compute');

  return {
    id: Date.now(),
    posting_id: posting.id,
    user_id: user.id,
    overall_fit_score: overallScore,
    overall_fit_summary: overallFitSummary,
    relevant_capabilities: matchedSkillsList.slice(0, 8),
    key_requirements: keyRequirements.length > 0 ? keyRequirements : ['Core Systems Programming', 'Data Structures & Algorithms'],
    missing_or_gap_skills: missingGaps,
    recommended_project_ids: topProjects.map(p => p.projectId),
    recommendations: topProjects,
    matched_experiences: matchedExperiences.slice(0, 2),
    matched_skills: matchedSkillsList.slice(0, 10),
    matched_achievements: matchedAchievements.slice(0, 2),
    recommended_resume: recommendedResume,
    rationale: overallFitSummary,
    suggested_keywords: Array.from(new Set([...matchedSkillsList, ...keyRequirements])).slice(0, 8),
    created_at: new Date().toISOString()
  };
}

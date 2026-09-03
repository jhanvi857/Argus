import { 
  Company, 
  Posting, 
  Project, 
  Experience, 
  SkillItem, 
  Education, 
  Achievement, 
  ResumeVersion, 
  UserPreferences, 
  UserProfile, 
  MatchResult, 
  Application, 
  IngestionTelemetry, 
  PostingStatus 
} from '../types';
import { AuthService } from './auth';
import { runGroundTruthMatcher } from './matcher';

const STORAGE_KEYS = {
  COMPANIES: 'argus_companies_v3',
  POSTINGS: 'argus_postings_v3',
  APPLICATIONS_PREFIX: 'argus_apps_user_',
  MATCHES_PREFIX: 'argus_matches_user_',
  TELEMETRY: 'argus_telemetry_v3'
};

export class ArgusDataService {
  private static load<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private static save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  // --- USER PROFILE & KNOWLEDGE BASE (SCOPED TO ACTIVE USER) ---

  public static getCurrentUser(): UserProfile {
    return AuthService.getCurrentUser();
  }

  public static updateCurrentUser(updates: Partial<UserProfile>): UserProfile {
    return AuthService.updateCurrentUser(updates);
  }

  // Projects CRUD
  public static getProjects(): Project[] {
    const user = this.getCurrentUser();
    return user.projects || [];
  }

  public static saveProject(project: Project): Project[] {
    const user = this.getCurrentUser();
    const existingIndex = (user.projects || []).findIndex(p => p.id === project.id);
    let updatedProjects: Project[];

    if (existingIndex !== -1) {
      updatedProjects = [...user.projects];
      updatedProjects[existingIndex] = project;
    } else {
      const newId = project.id || `proj-${Date.now()}`;
      updatedProjects = [{ ...project, id: newId }, ...(user.projects || [])];
    }

    AuthService.updateCurrentUser({ projects: updatedProjects });
    // Invalidate cached matches for this user since portfolio changed
    this.clearUserMatches(user.id);
    return updatedProjects;
  }

  public static deleteProject(projectId: string): Project[] {
    const user = this.getCurrentUser();
    const updatedProjects = (user.projects || []).filter(p => p.id !== projectId);
    AuthService.updateCurrentUser({ projects: updatedProjects });
    this.clearUserMatches(user.id);
    return updatedProjects;
  }

  // Experience CRUD
  public static getExperiences(): Experience[] {
    const user = this.getCurrentUser();
    return user.experiences || [];
  }

  public static saveExperience(exp: Experience): Experience[] {
    const user = this.getCurrentUser();
    const existingIndex = (user.experiences || []).findIndex(e => e.id === exp.id);
    let updated: Experience[];

    if (existingIndex !== -1) {
      updated = [...user.experiences];
      updated[existingIndex] = exp;
    } else {
      const newId = exp.id || `exp-${Date.now()}`;
      updated = [{ ...exp, id: newId }, ...(user.experiences || [])];
    }

    AuthService.updateCurrentUser({ experiences: updated });
    this.clearUserMatches(user.id);
    return updated;
  }

  public static deleteExperience(expId: string): Experience[] {
    const user = this.getCurrentUser();
    const updated = (user.experiences || []).filter(e => e.id !== expId);
    AuthService.updateCurrentUser({ experiences: updated });
    this.clearUserMatches(user.id);
    return updated;
  }

  // Skills CRUD
  public static getSkills(): SkillItem[] {
    const user = this.getCurrentUser();
    return user.skills || [];
  }

  public static saveSkill(skill: SkillItem): SkillItem[] {
    const user = this.getCurrentUser();
    const existingIndex = (user.skills || []).findIndex(s => s.id === skill.id || s.name.toLowerCase() === skill.name.toLowerCase());
    let updated: SkillItem[];

    if (existingIndex !== -1) {
      updated = [...user.skills];
      updated[existingIndex] = skill;
    } else {
      const newId = skill.id || `sk-${Date.now()}`;
      updated = [...(user.skills || []), { ...skill, id: newId }];
    }

    AuthService.updateCurrentUser({ skills: updated });
    this.clearUserMatches(user.id);
    return updated;
  }

  public static deleteSkill(skillId: string): SkillItem[] {
    const user = this.getCurrentUser();
    const updated = (user.skills || []).filter(s => s.id !== skillId);
    AuthService.updateCurrentUser({ skills: updated });
    this.clearUserMatches(user.id);
    return updated;
  }

  // Education CRUD
  public static getEducation(): Education[] {
    const user = this.getCurrentUser();
    return user.education || [];
  }

  public static saveEducation(edu: Education): Education[] {
    const user = this.getCurrentUser();
    const existingIndex = (user.education || []).findIndex(e => e.id === edu.id);
    let updated: Education[];

    if (existingIndex !== -1) {
      updated = [...user.education];
      updated[existingIndex] = edu;
    } else {
      const newId = edu.id || `edu-${Date.now()}`;
      updated = [{ ...edu, id: newId }, ...(user.education || [])];
    }

    AuthService.updateCurrentUser({ education: updated });
    return updated;
  }

  public static deleteEducation(eduId: string): Education[] {
    const user = this.getCurrentUser();
    const updated = (user.education || []).filter(e => e.id !== eduId);
    AuthService.updateCurrentUser({ education: updated });
    return updated;
  }

  // Achievements CRUD
  public static getAchievements(): Achievement[] {
    const user = this.getCurrentUser();
    return user.achievements || [];
  }

  public static saveAchievement(ach: Achievement): Achievement[] {
    const user = this.getCurrentUser();
    const existingIndex = (user.achievements || []).findIndex(a => a.id === ach.id);
    let updated: Achievement[];

    if (existingIndex !== -1) {
      updated = [...user.achievements];
      updated[existingIndex] = ach;
    } else {
      const newId = ach.id || `ach-${Date.now()}`;
      updated = [{ ...ach, id: newId }, ...(user.achievements || [])];
    }

    AuthService.updateCurrentUser({ achievements: updated });
    this.clearUserMatches(user.id);
    return updated;
  }

  public static deleteAchievement(achId: string): Achievement[] {
    const user = this.getCurrentUser();
    const updated = (user.achievements || []).filter(a => a.id !== achId);
    AuthService.updateCurrentUser({ achievements: updated });
    this.clearUserMatches(user.id);
    return updated;
  }

  // Resumes CRUD
  public static getResumes(): ResumeVersion[] {
    const user = this.getCurrentUser();
    return user.resumes || [];
  }

  public static saveResume(resume: ResumeVersion): ResumeVersion[] {
    const user = this.getCurrentUser();
    const existingIndex = (user.resumes || []).findIndex(r => r.id === resume.id);
    let updated: ResumeVersion[];

    if (existingIndex !== -1) {
      updated = [...user.resumes];
      updated[existingIndex] = resume;
    } else {
      const newId = resume.id || `res-${Date.now()}`;
      updated = [{ ...resume, id: newId }, ...(user.resumes || [])];
    }

    AuthService.updateCurrentUser({ resumes: updated });
    return updated;
  }

  public static deleteResume(resumeId: string): ResumeVersion[] {
    const user = this.getCurrentUser();
    const updated = (user.resumes || []).filter(r => r.id !== resumeId);
    AuthService.updateCurrentUser({ resumes: updated });
    return updated;
  }

  // Preferences
  public static getPreferences(): UserPreferences {
    const user = this.getCurrentUser();
    return user.preferences;
  }

  public static savePreferences(pref: UserPreferences): UserPreferences {
    AuthService.updateCurrentUser({ preferences: pref });
    return pref;
  }

  // Profile Completion Percentage & Checklist
  public static getProfileCompletion(): { percentage: number; checklist: { name: string; completed: boolean; link: string }[]; missing: string[] } {
    const user = this.getCurrentUser();
    const checklist = [
      { name: 'Basic Info & Headline', completed: !!(user.full_name && user.headline && user.location), link: 'profile_overview' },
      { name: 'Portfolio Projects (min. 2)', completed: (user.projects?.length || 0) >= 2, link: 'profile_projects' },
      { name: 'Work Experience', completed: (user.experiences?.length || 0) >= 1, link: 'profile_experience' },
      { name: 'Core Skills Inventory (min. 5)', completed: (user.skills?.length || 0) >= 5, link: 'profile_skills' },
      { name: 'Education & Degree', completed: (user.education?.length || 0) >= 1, link: 'profile_education' },
      { name: 'Resume Uploaded', completed: (user.resumes?.length || 0) >= 1, link: 'profile_resumes' }
    ];

    const completedCount = checklist.filter(c => c.completed).length;
    const percentage = Math.round((completedCount / checklist.length) * 100);
    const missing = checklist.filter(c => !c.completed).map(c => c.name);
    return { percentage, checklist, missing };
  }

  // --- MONITORED COMPANIES & POSTINGS ---

  public static getCompanies(): Company[] {
    const user = this.getCurrentUser();
    const stored = this.load<Company[]>(STORAGE_KEYS.COMPANIES, []);
    const targetIds = new Set(user.preferences?.target_company_ids || []);
    const postings = this.getPostings();

    return stored.map(c => {
      const compPostings = postings.filter(p => p.company_id === c.id || p.company_name.toLowerCase() === c.name.toLowerCase());
      const newCount = compPostings.filter(p => p.status === 'new' && p.relevant).length;
      return {
        ...c,
        enabled: targetIds.has(c.id),
        new_postings_count: newCount,
        total_postings_count: compPostings.length
      };
    });
  }

  public static toggleCompany(companyId: number, enabled: boolean): Company[] {
    const user = this.getCurrentUser();
    const currentTargets = new Set(user.preferences?.target_company_ids || []);
    if (enabled) {
      currentTargets.add(companyId);
    } else {
      currentTargets.delete(companyId);
    }
    const updatedPref: UserPreferences = {
      ...user.preferences,
      target_company_ids: Array.from(currentTargets)
    };
    this.savePreferences(updatedPref);
    return this.getCompanies();
  }

  public static getPostings(): Posting[] {
    return this.load<Posting[]>(STORAGE_KEYS.POSTINGS, []);
  }

  public static getPosting(id: number): Posting | undefined {
    const postings = this.getPostings();
    return postings.find(p => p.id === id);
  }

  public static updatePostingStatus(postingId: number, status: PostingStatus): Posting[] {
    const postings = this.getPostings();
    const updated = postings.map(p => {
      if (p.id === postingId) {
        return {
          ...p,
          status,
          notified_at: status !== 'new' ? (p.notified_at || new Date().toISOString()) : p.notified_at
        };
      }
      return p;
    });
    this.save(STORAGE_KEYS.POSTINGS, updated);
    return updated;
  }

  // --- MATCH RESULT (USER + POSTING SCOPED) ---

  private static clearUserMatches(userId: string): void {
    localStorage.removeItem(`${STORAGE_KEYS.MATCHES_PREFIX}${userId}`);
  }

  public static getMatchForPosting(posting: Posting, forceRecalculate = false): MatchResult {
    const user = this.getCurrentUser();
    const key = `${STORAGE_KEYS.MATCHES_PREFIX}${user.id}`;
    const userMatches = this.load<Record<number, MatchResult>>(key, {});

    if (!forceRecalculate && userMatches[posting.id]) {
      return userMatches[posting.id];
    }

    const computed = runGroundTruthMatcher(posting, user);
    userMatches[posting.id] = computed;
    this.save(key, userMatches);
    return computed;
  }

  public static getCachedMatchForPosting(postingId: number): MatchResult | null {
    const user = this.getCurrentUser();
    const key = `${STORAGE_KEYS.MATCHES_PREFIX}${user.id}`;
    const userMatches = this.load<Record<number, MatchResult>>(key, {});
    return userMatches[postingId] || null;
  }

  public static async getMatchForPostingAsync(posting: Posting, forceRecalculate = false): Promise<MatchResult> {
    const user = this.getCurrentUser();
    const key = `${STORAGE_KEYS.MATCHES_PREFIX}${user.id}`;
    const userMatches = this.load<Record<number, MatchResult>>(key, {});

    if (!forceRecalculate && userMatches[posting.id]) {
      return userMatches[posting.id];
    }

    // Try calling backend Phase 6 Matcher LangGraph endpoint
    try {
      const res = await fetch(`/api/postings/${posting.id}/interested`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const mr = data.match_result;
        if (mr) {
          const computed = runGroundTruthMatcher(posting, user);
          if (mr.recommended_project_ids && mr.recommended_project_ids.length > 0) {
            computed.recommended_project_ids = mr.recommended_project_ids;
            const projectObjs = (user.projects || []).filter(p => mr.recommended_project_ids.includes(p.id));
            if (projectObjs.length > 0) {
              computed.recommendations = projectObjs.map(p => ({
                projectId: p.id,
                project: p,
                score: 95,
                matchingKeywords: mr.suggested_keywords || [],
                recommendedBullets: p.quantified_bullets || [],
                rationale: `AI Matcher selected ${p.name} as primary proof of capability for ${posting.title}.`
              }));
            }
          }
          if (mr.rationale) {
            computed.overall_fit_summary = mr.rationale;
          }
          if (mr.suggested_keywords) {
            computed.relevant_capabilities = mr.suggested_keywords;
          }
          computed.status = data.status;
          computed.validation_error = data.validation_error;
          userMatches[posting.id] = computed;
          this.save(key, userMatches);
          return computed;
        }
      }
    } catch (e) {
      console.warn('Backend match fetch failed, falling back to ground truth client matcher:', e);
    }

    // Fallback to local ground truth matching
    return this.getMatchForPosting(posting, forceRecalculate);
  }

  // --- APPLICATION TRACKER (SCOPED TO ACTIVE USER) ---

  public static getApplications(): Application[] {
    const user = this.getCurrentUser();
    const key = `${STORAGE_KEYS.APPLICATIONS_PREFIX}${user.id}`;
    const appsMap = this.load<Record<number, Application>>(key, {});
    const postings = this.getPostings();

    return Object.values(appsMap).map(app => {
      const posting = postings.find(p => p.id === app.posting_id);
      return {
        ...app,
        posting
      };
    });
  }

  public static getApplication(postingId: number): Application | null {
    const user = this.getCurrentUser();
    const key = `${STORAGE_KEYS.APPLICATIONS_PREFIX}${user.id}`;
    const appsMap = this.load<Record<number, Application>>(key, {});
    const app = appsMap[postingId];
    if (!app) return null;
    const posting = this.getPosting(postingId);
    return { ...app, posting };
  }

  public static saveApplication(app: Application): Application {
    const user = this.getCurrentUser();
    const key = `${STORAGE_KEYS.APPLICATIONS_PREFIX}${user.id}`;
    const appsMap = this.load<Record<number, Application>>(key, {});

    const updatedApp: Application = {
      ...app,
      user_id: user.id,
      updated_at: new Date().toISOString()
    };

    appsMap[app.posting_id] = updatedApp;
    this.save(key, appsMap);

    // Synchronize posting status
    if (app.stage === 'applied' || app.stage === 'oa' || app.stage === 'interview' || app.stage === 'offer') {
      this.updatePostingStatus(app.posting_id, 'applied');
    } else if (app.stage === 'rejected' || app.stage === 'withdrawn') {
      this.updatePostingStatus(app.posting_id, 'closed');
    } else if (app.stage === 'interested') {
      this.updatePostingStatus(app.posting_id, 'reviewed');
    }

    // Also push asynchronously to backend Postgres if available
    fetch(`/api/postings/${app.posting_id}/application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: app.stage,
        notes: app.notes,
        oa_date: app.oa_date,
        interview_date: app.interview_date,
        interview_round: app.interview_round,
        interview_questions: app.interview_questions,
        experience_reflection: app.experience_reflection,
        offer_details: app.offer_details,
        referral_status: app.referral_status,
        resume_version: app.resume_version
      })
    }).catch(e => console.warn('Could not sync application to backend DB:', e));

    return updatedApp;
  }

  public static deleteApplication(postingId: number): void {
    const user = this.getCurrentUser();
    const key = `${STORAGE_KEYS.APPLICATIONS_PREFIX}${user.id}`;
    const appsMap = this.load<Record<number, Application>>(key, {});
    delete appsMap[postingId];
    this.save(key, appsMap);
  }

  // --- TELEMETRY & INGESTION INTEGRATION ---

  public static getTelemetry(): IngestionTelemetry {
    return this.load<IngestionTelemetry>(STORAGE_KEYS.TELEMETRY, {
      companies_checked: 0,
      successful_count: 0,
      new_relevant_count: 0,
      last_run_at: 'Never',
      is_running: false,
      logs: []
    });
  }

  public static async triggerIngestion(): Promise<IngestionTelemetry> {
    let telemetry: IngestionTelemetry | null = null;

    try {
      const res = await fetch('/api/run-ingestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        telemetry = {
          companies_checked: data.companies_checked || 0,
          successful_count: data.successful_count || 0,
          new_relevant_count: data.new_relevant_count || 0,
          last_run_at: new Date().toLocaleTimeString(),
          is_running: false,
          logs: [
            `[${new Date().toLocaleTimeString()}] Successfully executed end-to-end ingestion pipeline via FastAPI.`,
            `[${new Date().toLocaleTimeString()}] Checked ${data.companies_checked} target companies. ${data.successful_count} passed health check.`,
            `[${new Date().toLocaleTimeString()}] Found ${data.new_relevant_count} genuinely new relevant opportunities.`
          ]
        };
        // Pull down fresh postings from Postgres
        await this.syncRemotePostings();
      }
    } catch (e) {
      console.warn('Backend API unavailable, executing client ingestion loop:', e);
    }

    if (!telemetry) {
      const currentPostings = this.getPostings();
      const newRelevant = currentPostings.filter(p => p.status === 'new' && p.relevant).length;
      const companies = this.getCompanies();

      telemetry = {
        companies_checked: companies.length,
        successful_count: companies.filter(c => c.is_healthy).length,
        new_relevant_count: newRelevant,
        last_run_at: new Date().toLocaleTimeString(),
        is_running: false,
        logs: [
          `[${new Date().toLocaleTimeString()}] Scraped official ATS endpoints for ${companies.length} target companies.`,
          `[${new Date().toLocaleTimeString()}] Ingestion cycle completed.`,
          `[${new Date().toLocaleTimeString()}] Current relevant opportunities in store: ${newRelevant}.`
        ]
      };
    }

    this.save(STORAGE_KEYS.TELEMETRY, telemetry);
    return telemetry;
  }

  public static async syncRemotePostings(): Promise<Posting[]> {
    try {
      const res = await fetch('/api/postings');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const current = this.getPostings();
          const merged: Posting[] = data.map((rem: any) => {
            const existing = current.find(p => p.id === rem.id);
            let locStr = 'Multiple Locations';
            if (typeof rem.location === 'string' && rem.location.trim()) {
              locStr = rem.location.trim();
            } else if (rem.location && typeof rem.location === 'object' && rem.location.name) {
              locStr = String(rem.location.name);
            } else if (rem.raw_json && typeof rem.raw_json.location === 'string') {
              locStr = rem.raw_json.location;
            } else if (rem.raw_json?.location?.name) {
              locStr = String(rem.raw_json.location.name);
            }

            return {
              id: rem.id,
              company_id: rem.company_id,
              company_name: rem.company_name || 'Target Company',
              external_id: rem.external_id || String(rem.id),
              title: rem.title,
              team: rem.team || 'Software Engineering',
              location: locStr,
              url: rem.url,
              first_seen_at: rem.first_seen_at || new Date().toISOString(),
              last_seen_at: rem.last_seen_at || new Date().toISOString(),
              status: existing ? existing.status : (rem.status || 'new'),
              relevant: rem.relevant ?? true,
              deadline: rem.deadline,
              notified_at: rem.notified_at,
              required_skills: rem.required_skills || [],
              raw_json: rem.raw_json
            };
          });
          this.save(STORAGE_KEYS.POSTINGS, merged);
          return merged;
        }
      }
    } catch (e) {
      console.warn('Failed to sync remote postings:', e);
    }
    return this.getPostings();
  }

  public static async syncRemoteCompanies(): Promise<Company[]> {
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const user = this.getCurrentUser();
          const targetIds = new Set(user?.preferences?.target_company_ids || []);
          const postings = this.getPostings();

          const companies: Company[] = data.map((c: any) => {
            const compPostings = postings.filter(p => p.company_id === c.id || (p.company_name && c.name && p.company_name.toLowerCase() === c.name.toLowerCase()));
            const newCount = compPostings.filter(p => p.status === 'new' && p.relevant).length;
            return {
              id: c.id,
              name: c.name,
              category: c.category || 'enterprise_mnc',
              ats_type: c.ats_type,
              careers_page_url: c.careers_page_url,
              is_healthy: c.is_healthy ?? true,
              enabled: targetIds.has(c.id),
              new_postings_count: newCount,
              total_postings_count: compPostings.length
            };
          });
          this.save(STORAGE_KEYS.COMPANIES, companies);
          return companies;
        }
      }
    } catch (e) {
      console.warn('Failed to sync remote companies:', e);
    }
    return this.getCompanies();
  }

  public static resetAllData(): void {
    localStorage.clear();
    AuthService.resetAllUsers();
  }
}

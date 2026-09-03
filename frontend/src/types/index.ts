export type ATSType = 
  | 'greenhouse' 
  | 'lever' 
  | 'workday' 
  | 'custom' 
  | 'verify' 
  | 'eightfold'
  | 'amazon'
  | 'google'
  | 'microsoft'
  | 'goldman';

export type CompanyCategory = 
  | 'product_based' 
  | 'banking_and_quant' 
  | 'well_funded_startups'
  | 'faang_maang'
  | 'quant_and_hft'
  | 'global_fintech'
  | 'indian_fintech'
  | 'indian_product_unicorns'
  | 'enterprise_mnc'
  | 'chips_systems_infra'
  | 'growth_stage_startups';

export interface Company {
  id: number;
  name: string;
  category: CompanyCategory;
  ats_type: ATSType;
  ats_url?: string;
  careers_page_url: string;
  stipend_estimate?: string;
  last_checked_at?: string;
  new_postings_count: number;
  total_postings_count: number;
  is_healthy: boolean;
  enabled?: boolean;
}

export type PostingStatus = 'new' | 'reviewed' | 'applied' | 'ignored' | 'closed' | 'needs_review';

export interface Posting {
  id: number;
  company_id: number;
  company_name: string;
  external_id: string;
  title: string;
  team: string;
  location: string;
  deadline?: string | null;
  url: string;
  first_seen_at: string;
  last_seen_at: string;
  status: PostingStatus;
  relevant: boolean;
  notified_at?: string | null;
  relevance_score?: number; // 0 - 100
  classification_rationale?: string;
  stipend_estimate?: string;
  raw_description?: string;
  required_skills?: string[];
  preferred_skills?: string[];
}

export interface Project {
  id: string; // Unique slug e.g. 'nioflow', 'evora'
  name: string;
  tech_stack: string[];
  tags: string[];
  summary: string;
  detailed_description?: string;
  quantified_bullets: string[];
  resume_variants: Record<string, string[]>;
  project_url?: string;
  github_url?: string;
  start_date?: string;
  end_date?: string;
}

export type ExperienceType = 
  | 'internship'
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'freelance'
  | 'research'
  | 'teaching'
  | 'open_source'
  | 'other';

export interface Experience {
  id: string;
  company: string;
  position: string;
  type: ExperienceType;
  location: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  description: string;
  responsibilities: string[];
  achievements?: string[];
  skills: string[];
}

export type SkillCategory = 
  | 'programming'
  | 'backend'
  | 'frontend'
  | 'databases'
  | 'cloud'
  | 'systems'
  | 'ai_ml'
  | 'tools';

export interface SkillItem {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_of_experience?: number;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  gpa?: string;
  coursework?: string[];
  achievements?: string[];
}

export type AchievementType = 
  | 'hackathon'
  | 'award'
  | 'competitive_programming'
  | 'certification'
  | 'publication'
  | 'scholarship'
  | 'competition'
  | 'other';

export interface Achievement {
  id: string;
  title: string;
  type: AchievementType;
  organization: string;
  date: string;
  description: string;
  link?: string;
}

export interface ResumeVersion {
  id: string;
  name: string;
  file_name: string;
  role_focus: string;
  last_updated: string;
  applications_count: number;
  file_size?: string;
  is_default?: boolean;
  preview_text?: string;
}

export interface UserPreferences {
  target_company_ids: number[];
  preferred_roles: string[];
  focus_areas: string[];
  locations: string[];
  email_notifications_enabled: boolean;
  notification_email?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  headline: string;
  current_status: 'student' | 'intern' | 'new_grad' | 'swe' | 'other';
  location: string;
  target_location?: string;
  bio?: string;
  avatar_url?: string;
  github_url?: string;
  linkedin_url?: string;
  website_url?: string;
  projects: Project[];
  experiences: Experience[];
  skills: SkillItem[];
  education: Education[];
  achievements: Achievement[];
  resumes: ResumeVersion[];
  preferences: UserPreferences;
  onboarding_completed: boolean;
  created_at: string;
}

export interface MatchRecommendation {
  projectId: string;
  project: Project;
  score: number;
  matchingKeywords: string[];
  recommendedBullets: string[];
  rationale: string;
}

export interface MatchedExperience {
  experienceId: string;
  experience: Experience;
  score: number;
  matchingSkills: string[];
  rationale: string;
}

export interface MatchedAchievement {
  achievementId: string;
  achievement: Achievement;
  rationale: string;
}

export interface MatchedResume {
  resumeId: string;
  resume: ResumeVersion;
  rationale: string;
}

export interface GapBridge {
  skill: string;
  isMet: boolean;
  bridgedByProject?: string;
  evidenceBullet?: string;
  rationale: string;
}

export interface MatchResult {
  id: number;
  posting_id: number;
  user_id: string;
  overall_fit_score: number; // 0 - 100
  overall_fit_summary: string;
  relevant_capabilities: string[];
  key_requirements: string[];
  missing_or_gap_skills: string[];
  gap_bridges?: GapBridge[];
  recommended_project_ids: string[];
  recommendations: MatchRecommendation[];
  matched_experiences: MatchedExperience[];
  matched_skills: string[];
  matched_achievements: MatchedAchievement[];
  recommended_resume: MatchedResume | null;
  rationale: string;
  suggested_keywords: string[];
  status?: 'pending' | 'matched' | 'needs_review';
  validation_error?: string;
  created_at: string;
}

export type ReferralStatus = 'none' | 'requested' | 'referred' | 'pending';

export type ApplicationStage = 
  | 'interested'
  | 'applied'
  | 'oa'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export interface Application {
  id?: number;
  user_id: string;
  posting_id: number;
  posting?: Posting;
  resume_version?: string;
  oa_date?: string | null;
  interview_date?: string | null;
  interview_round?: string;
  interview_questions?: string;
  experience_reflection?: string;
  offer_details?: string;
  referral_status: ReferralStatus;
  stage: ApplicationStage;
  notes?: string;
  applied_date?: string;
  updated_at?: string;
}

export interface IngestionTelemetry {
  companies_checked: number;
  successful_count: number;
  new_relevant_count: number;
  last_run_at: string;
  is_running: boolean;
  logs: string[];
}

export type AppRoute = 
  | 'landing'
  | 'login'
  | 'signup'
  | 'onboarding'
  | 'dashboard'
  | 'opportunities'
  | 'opportunity_detail'
  | 'match_result'
  | 'applications'
  | 'profile_overview'
  | 'profile_projects'
  | 'profile_experience'
  | 'profile_skills'
  | 'profile_education'
  | 'profile_achievements'
  | 'profile_resumes'
  | 'preferences'
  | 'settings';

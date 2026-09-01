import React, { useState, useEffect, useCallback } from 'react';
import { 
  AppRoute, 
  UserProfile, 
  Posting, 
  Company, 
  Application, 
  IngestionTelemetry, 
  PostingStatus 
} from './types';
import { AuthService } from './services/auth';
import { ArgusDataService } from './services/api';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './components/landing/LandingPage';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { DashboardView } from './components/dashboard/DashboardView';
import { OpportunitiesView } from './components/opportunities/OpportunitiesView';
import { OpportunityDetailModal } from './components/opportunities/OpportunityDetailModal';
import { ApplicationsView } from './components/applications/ApplicationsView';
import { ProfileOverviewView } from './components/profile/ProfileOverviewView';
import { ProjectsView } from './components/profile/ProjectsView';
import { ExperienceView } from './components/profile/ExperienceView';
import { SkillsView } from './components/profile/SkillsView';
import { EducationView } from './components/profile/EducationView';
import { AchievementsView } from './components/profile/AchievementsView';
import { ResumesView } from './components/profile/ResumesView';
import { PreferencesView } from './components/preferences/PreferencesView';
import { SettingsView } from './components/settings/SettingsView';

export const App: React.FC = () => {
  // Navigation & Route State
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('landing');

  // Multi-User State
  const [currentUser, setCurrentUser] = useState<UserProfile>(AuthService.getCurrentUser());
  const [allUsers, setAllUsers] = useState<UserProfile[]>(AuthService.getAllUsers());

  // Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [postings, setPostings] = useState<Posting[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [telemetry, setTelemetry] = useState<IngestionTelemetry>(ArgusDataService.getTelemetry());

  // UI / Selection State
  const [selectedPosting, setSelectedPosting] = useState<Posting | null>(null);
  const [selectedPostingTab, setSelectedPostingTab] = useState<'jd' | 'matcher' | 'application'>('matcher');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [newUserModalOpen, setNewUserModalOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');

  // Load all user data
  const refreshData = useCallback(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
    setAllUsers(AuthService.getAllUsers());
    setCompanies(ArgusDataService.getCompanies());
    setPostings(ArgusDataService.getPostings());
    setApplications(ArgusDataService.getApplications());
    setTelemetry(ArgusDataService.getTelemetry());
  }, []);

  useEffect(() => {
    refreshData();
    const unsubscribe = AuthService.subscribe((user) => {
      setCurrentUser(user);
      setAllUsers(AuthService.getAllUsers());
      setCompanies(ArgusDataService.getCompanies());
      setApplications(ArgusDataService.getApplications());
    });
    return unsubscribe;
  }, [refreshData]);

  // Derived Counts
  const newRelevantPostingsCount = postings.filter(p => p.status === 'new' && p.relevant).length;
  const inFlightAppsCount = applications.filter(a => a.stage === 'applied' || a.stage === 'oa' || a.stage === 'interview').length;
  const profileCompletion = ArgusDataService.getProfileCompletion();

  // Handlers
  const handleNavigate = (route: AppRoute) => {
    setCurrentRoute(route);
    window.scrollTo(0, 0);
  };

  const handleSwitchUser = (userId: string) => {
    const user = AuthService.switchUser(userId);
    setCurrentUser(user);
    refreshData();
    if (!user.onboarding_completed) {
      setCurrentRoute('onboarding');
    }
  };

  const handleSelectPosting = (posting: Posting, tab: 'jd' | 'matcher' | 'application' = 'matcher') => {
    setSelectedPosting(posting);
    setSelectedPostingTab(tab);
  };

  const handleStatusChange = (postingId: number, newStatus: PostingStatus) => {
    ArgusDataService.updatePostingStatus(postingId, newStatus);
    refreshData();
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    const result = await ArgusDataService.triggerIngestion();
    setTelemetry(result);
    setIsSyncing(false);
    refreshData();
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    const user = AuthService.signup({
      full_name: newUserName.trim(),
      email: newUserEmail.trim()
    });
    setNewUserModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setCurrentUser(user);
    refreshData();
    setCurrentRoute('onboarding');
  };

  // Keyboard Shortcuts (j/k navigation, i for matcher, a for applied, o for ATS link)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Escape') {
        setSelectedPosting(null);
        setNewUserModalOpen(false);
        return;
      }

      if (currentRoute === 'opportunities' || currentRoute === 'dashboard') {
        const visiblePostings = postings.filter(p => p.relevant);
        if (visiblePostings.length === 0) return;

        const currentIndex = selectedPosting ? visiblePostings.findIndex(p => p.id === selectedPosting.id) : -1;

        if (e.key === 'j' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = currentIndex < visiblePostings.length - 1 ? currentIndex + 1 : 0;
          setSelectedPosting(visiblePostings[nextIndex]);
          setSelectedPostingTab('matcher');
        } else if (e.key === 'k' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : visiblePostings.length - 1;
          setSelectedPosting(visiblePostings[prevIndex]);
          setSelectedPostingTab('matcher');
        } else if (e.key === 'i' || e.key === 'I') {
          if (selectedPosting) {
            setSelectedPostingTab('matcher');
          }
        } else if (e.key === 'a' || e.key === 'A') {
          if (selectedPosting) {
            handleStatusChange(selectedPosting.id, 'applied');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [postings, selectedPosting, currentRoute]);

  // PUBLIC UN-AUTHENTICATED ROUTES
  if (currentRoute === 'landing') {
    return (
      <LandingPage
        onNavigate={handleNavigate}
        onQuickDemoLogin={(userId) => {
          if (userId) AuthService.switchUser(userId);
          handleNavigate('dashboard');
        }}
      />
    );
  }

  if (currentRoute === 'login') {
    return (
      <LoginPage
        onNavigate={handleNavigate}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          refreshData();
          if (!user.onboarding_completed) {
            handleNavigate('onboarding');
          } else {
            handleNavigate('dashboard');
          }
        }}
        allUsers={allUsers}
      />
    );
  }

  if (currentRoute === 'signup') {
    return (
      <SignupPage
        onNavigate={handleNavigate}
        onSignupSuccess={(user) => {
          setCurrentUser(user);
          refreshData();
          handleNavigate('onboarding');
        }}
      />
    );
  }

  if (currentRoute === 'onboarding') {
    return (
      <OnboardingFlow
        currentUser={currentUser}
        onFinish={() => {
          refreshData();
          handleNavigate('dashboard');
        }}
        onNavigate={handleNavigate}
      />
    );
  }

  // AUTHENTICATED APP SHELL & ROUTES
  return (
    <AppShell
      currentRoute={currentRoute}
      onNavigate={handleNavigate}
      currentUser={currentUser}
      allUsers={allUsers}
      onSwitchUser={handleSwitchUser}
      newPostingsCount={newRelevantPostingsCount}
      inFlightAppsCount={inFlightAppsCount}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      isSyncing={isSyncing}
      onTriggerSync={handleTriggerSync}
      telemetry={telemetry}
      profileCompletion={profileCompletion}
      onOpenNewUserModal={() => setNewUserModalOpen(true)}
    >
      {/* 1. Dashboard View */}
      {currentRoute === 'dashboard' && (
        <DashboardView
          currentUser={currentUser}
          postings={postings}
          applications={applications}
          profileCompletion={profileCompletion}
          onNavigate={handleNavigate}
          onSelectPosting={handleSelectPosting}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* 2. Opportunities Feed */}
      {currentRoute === 'opportunities' && (
        <OpportunitiesView
          postings={postings}
          companies={companies}
          selectedPosting={selectedPosting}
          onSelectPosting={handleSelectPosting}
          onStatusChange={handleStatusChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {/* 3. Applications Tracker */}
      {currentRoute === 'applications' && (
        <ApplicationsView
          applications={applications}
          currentUser={currentUser}
          onSelectPosting={handleSelectPosting}
          onRefresh={refreshData}
        />
      )}

      {/* 4. Profile Overview */}
      {currentRoute === 'profile_overview' && (
        <ProfileOverviewView
          currentUser={currentUser}
          profileCompletion={profileCompletion}
          onNavigate={handleNavigate}
          onEditProfileModal={() => handleNavigate('settings')}
        />
      )}

      {/* 5. Projects Knowledge Base */}
      {currentRoute === 'profile_projects' && (
        <ProjectsView
          currentUser={currentUser}
          onRefresh={refreshData}
        />
      )}

      {/* 6. Work Experience */}
      {currentRoute === 'profile_experience' && (
        <ExperienceView
          currentUser={currentUser}
          onRefresh={refreshData}
        />
      )}

      {/* 7. Skills Inventory */}
      {currentRoute === 'profile_skills' && (
        <SkillsView
          currentUser={currentUser}
          onRefresh={refreshData}
        />
      )}

      {/* 8. Education */}
      {currentRoute === 'profile_education' && (
        <EducationView
          currentUser={currentUser}
          onRefresh={refreshData}
        />
      )}

      {/* 9. Achievements */}
      {currentRoute === 'profile_achievements' && (
        <AchievementsView
          currentUser={currentUser}
          onRefresh={refreshData}
        />
      )}

      {/* 10. Resumes */}
      {currentRoute === 'profile_resumes' && (
        <ResumesView
          currentUser={currentUser}
          onRefresh={refreshData}
        />
      )}

      {/* 11. Preferences */}
      {currentRoute === 'preferences' && (
        <PreferencesView
          currentUser={currentUser}
          companies={companies}
          onRefresh={refreshData}
        />
      )}

      {/* 12. Settings */}
      {currentRoute === 'settings' && (
        <SettingsView
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onRefresh={refreshData}
        />
      )}

      {/* Opportunity Detail & Matcher Modal */}
      <OpportunityDetailModal
        isOpen={selectedPosting !== null}
        onClose={() => setSelectedPosting(null)}
        posting={selectedPosting}
        currentUser={currentUser}
        initialTab={selectedPostingTab}
        onOpenPortfolio={() => {
          setSelectedPosting(null);
          handleNavigate('profile_projects');
        }}
        onApplicationSaved={() => {
          refreshData();
        }}
        onStatusChange={handleStatusChange}
      />

      {/* Add New User / Profile Modal */}
      {newUserModalOpen && (
        <div className="modal-overlay" onClick={() => setNewUserModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-navy)' }}>
                Create New User Profile
              </h2>
              <button className="btn-ghost btn-sm" onClick={() => setNewUserModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    placeholder="e.g. Jordan Lee"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="jordan.lee@example.com"
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setNewUserModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create & Launch Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default App;

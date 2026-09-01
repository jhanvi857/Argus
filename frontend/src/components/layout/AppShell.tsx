import React, { useState } from 'react';
import { AppRoute, UserProfile, IngestionTelemetry } from '../../types';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { TelemetryModal } from '../modals/TelemetryModal';
import { NotificationsDrawer } from '../modals/NotificationsDrawer';

interface AppShellProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSwitchUser: (userId: string) => void;
  newPostingsCount: number;
  inFlightAppsCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSyncing: boolean;
  onTriggerSync: () => void;
  telemetry: IngestionTelemetry;
  profileCompletion: { percentage: number; checklist: { name: string; completed: boolean; link: string }[] };
  onOpenNewUserModal: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onNavigate,
  currentUser,
  allUsers,
  onSwitchUser,
  newPostingsCount,
  inFlightAppsCount,
  searchQuery,
  onSearchChange,
  isSyncing,
  onTriggerSync,
  telemetry,
  profileCompletion,
  onOpenNewUserModal,
  children
}) => {
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="argus-app-shell">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 48, 73, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 35
          }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <div className={`argus-sidebar ${mobileMenuOpen ? 'is-mobile-open' : ''}`}>
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={(route) => {
            onNavigate(route);
            setMobileMenuOpen(false);
          }}
          currentUser={currentUser}
          allUsers={allUsers}
          onSwitchUser={(id) => {
            onSwitchUser(id);
            setMobileMenuOpen(false);
          }}
          newPostingsCount={newPostingsCount}
          inFlightAppsCount={inFlightAppsCount}
          onOpenNewUserModal={onOpenNewUserModal}
        />
      </div>

      {/* Main Workspace Column */}
      <div className="argus-main-content">
        <Topbar
          currentUser={currentUser}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          isSyncing={isSyncing}
          onTriggerSync={onTriggerSync}
          onOpenTelemetry={() => setTelemetryOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          unreadAlertsCount={newPostingsCount}
          profileCompletion={profileCompletion}
          onNavigate={onNavigate}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <div className="argus-page-scrollable">
          {children}
        </div>
      </div>

      {/* Global Modals */}
      <TelemetryModal
        isOpen={telemetryOpen}
        onClose={() => setTelemetryOpen(false)}
        telemetry={telemetry}
        isSyncing={isSyncing}
        onTriggerSync={onTriggerSync}
      />

      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};

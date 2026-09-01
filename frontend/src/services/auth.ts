import { UserProfile } from '../types';

const STORAGE_KEYS = {
  USERS_LIST: 'argus_users_list_v3',
  CURRENT_USER_ID: 'argus_current_user_id_v3'
};

type AuthListener = (user: UserProfile) => void;

export class AuthService {
  private static listeners: Set<AuthListener> = new Set();

  private static createEmptyUser(email = 'candidate@argus.local', fullName = 'Candidate'): UserProfile {
    return {
      id: `user-${Date.now()}`,
      email,
      full_name: fullName,
      headline: '',
      current_status: 'student',
      location: '',
      projects: [],
      experiences: [],
      skills: [],
      education: [],
      achievements: [],
      resumes: [],
      preferences: {
        target_company_ids: [],
        preferred_roles: [],
        focus_areas: [],
        locations: [],
        email_notifications_enabled: true,
        notification_email: email
      },
      onboarding_completed: false,
      created_at: new Date().toISOString()
    };
  }

  public static subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notify(user: UserProfile): void {
    this.listeners.forEach(fn => fn(user));
  }

  public static getAllUsers(): UserProfile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  public static saveAllUsers(users: UserProfile[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(users));
    } catch (e) {
      console.warn('Failed to save users list:', e);
    }
  }

  public static getCurrentUser(): UserProfile {
    const users = this.getAllUsers();
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    
    if (currentId) {
      const found = users.find(u => u.id === currentId);
      if (found) return found;
    }
    
    const defaultUser = users[0] || this.createEmptyUser();
    if (users.length === 0) {
      this.saveAllUsers([defaultUser]);
    }
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, defaultUser.id);
    return defaultUser;
  }

  public static switchUser(userId: string): UserProfile {
    const users = this.getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    this.notify(user);
    return user;
  }

  public static login(email: string, _password?: string): UserProfile {
    const users = this.getAllUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Create user on the fly if not found
      user = {
        id: `user-${Date.now()}`,
        email,
        full_name: email.split('@')[0].replace('.', ' '),
        headline: '',
        current_status: 'new_grad',
        location: '',
        projects: [],
        experiences: [],
        skills: [],
        education: [],
        achievements: [],
        resumes: [],
        preferences: {
          target_company_ids: [],
          preferred_roles: [],
          focus_areas: [],
          locations: [],
          email_notifications_enabled: true,
          notification_email: email
        },
        onboarding_completed: false,
        created_at: new Date().toISOString()
      };
      users.push(user);
      this.saveAllUsers(users);
    }
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    this.notify(user);
    return user;
  }

  public static signup(data: { full_name: string; email: string }): UserProfile {
    const users = this.getAllUsers();
    const existing = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, existing.id);
      this.notify(existing);
      return existing;
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      email: data.email,
      full_name: data.full_name,
      headline: '',
      current_status: 'student',
      location: '',
      projects: [],
      experiences: [],
      skills: [],
      education: [],
      achievements: [],
      resumes: [],
      preferences: {
        target_company_ids: [],
        preferred_roles: [],
        focus_areas: [],
        locations: [],
        email_notifications_enabled: true,
        notification_email: data.email
      },
      onboarding_completed: false,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    this.saveAllUsers(users);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newUser.id);
    this.notify(newUser);
    return newUser;
  }

  public static updateCurrentUser(updates: Partial<UserProfile>): UserProfile {
    const users = this.getAllUsers();
    const current = this.getCurrentUser();
    const index = users.findIndex(u => u.id === current.id);
    
    const updated: UserProfile = {
      ...current,
      ...updates
    };

    if (index !== -1) {
      users[index] = updated;
    } else {
      users.push(updated);
    }

    this.saveAllUsers(users);
    this.notify(updated);
    return updated;
  }

  public static logout(): void {
    const users = this.getAllUsers();
    if (users.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, users[0].id);
      this.notify(users[0]);
    }
  }

  public static resetAllUsers(): void {
    localStorage.removeItem(STORAGE_KEYS.USERS_LIST);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    const user = this.createEmptyUser();
    this.saveAllUsers([user]);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    this.notify(user);
  }
}

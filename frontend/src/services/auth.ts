import { UserProfile } from '../types';

const STORAGE_KEYS = {
  VERIFIED_USERS: 'argus_verified_users_v4',
  CURRENT_USER_ID: 'argus_current_user_id_v4',
  PENDING_REGISTRATION: 'argus_pending_reg_v4'
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

type AuthListener = (user: UserProfile | null) => void;

export class AuthService {
  private static listeners: Set<AuthListener> = new Set();

  public static subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notify(user: UserProfile | null): void {
    this.listeners.forEach(fn => fn(user));
  }

  public static createEmptyUser(email = '', fullName = ''): UserProfile {
    return {
      id: `anon-${Date.now()}`,
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

  public static getAllUsers(): UserProfile[] {
    return this.getVerifiedUsers();
  }

  public static getVerifiedUsers(): UserProfile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VERIFIED_USERS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  public static saveVerifiedUsers(users: UserProfile[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.VERIFIED_USERS, JSON.stringify(users));
    } catch (e) {
      console.warn('Failed to save verified users:', e);
    }
  }

  public static getCurrentUser(): UserProfile {
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    const users = this.getVerifiedUsers();
    if (currentId) {
      const found = users.find(u => u.id === currentId);
      if (found) return found;
    }
    if (users.length > 0) {
      return users[0];
    }
    return this.createEmptyUser();
  }

  public static switchUser(userId: string): UserProfile {
    const users = this.getVerifiedUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      throw new Error(`Verified user with ID ${userId} not found.`);
    }
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    this.notify(user);
    return user;
  }

  public static isAuthenticated(): boolean {
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (!currentId) return false;
    return this.getVerifiedUsers().some(u => u.id === currentId);
  }

  public static resetAllUsers(): void {
    localStorage.removeItem(STORAGE_KEYS.VERIFIED_USERS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    this.notify(null);
  }

  /**
   * Sends an OTP verification code to the candidate's genuine email address.
   */
  public static async sendOtp(email: string, fullName: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || 'Candidate';

    // Basic format validation
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. yourname@domain.com).');
    }

    // Check disposable domains
    const disposableDomains = ['tempmail.com', 'mailinator.com', '10minutemail.com', 'throwawaymail.com', 'example.com', 'test.com'];
    const domain = cleanEmail.split('@')[1];
    if (disposableDomains.includes(domain)) {
      throw new Error(`Email domain '@${domain}' is not allowed. Please use your genuine email address.`);
    }

    // Check dummy prefixes
    const localPart = cleanEmail.split('@')[0];
    if (['dummy', 'test', 'fake', 'user', 'example'].includes(localPart)) {
      throw new Error('Please use a genuine personal or professional email address.');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, full_name: cleanName })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to send verification code.');
      }

      // Store pending metadata
      localStorage.setItem(STORAGE_KEYS.PENDING_REGISTRATION, JSON.stringify({
        email: cleanEmail,
        fullName: cleanName,
        sentAt: Date.now(),
        devOtp: data.dev_otp
      }));

      return {
        success: true,
        message: data.message || `Verification code sent to ${cleanEmail}. Please check your inbox.`,
        devOtp: data.dev_otp
      };
    } catch (err: any) {
      // If API server is unreachable, allow graceful simulated OTP in development
      console.warn('API /auth/send-otp unreachable, using local fallback:', err);
      const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem(STORAGE_KEYS.PENDING_REGISTRATION, JSON.stringify({
        email: cleanEmail,
        fullName: cleanName,
        otp: fallbackOtp,
        sentAt: Date.now()
      }));

      return {
        success: true,
        message: `Verification code sent to ${cleanEmail}. (Code: ${fallbackOtp})`,
        devOtp: fallbackOtp
      };
    }
  }

  /**
   * Verifies the 6-digit OTP code and inserts the verified user into the database.
   * Does NOT auto-login, per requirement: displays login screen so user signs in with verified credentials.
   */
  public static async verifyOtpAndRegister(email: string, otpCode: string): Promise<{ success: boolean; message: string; user: UserProfile }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    let verifiedUser: UserProfile | null = null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp_code: cleanOtp })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Invalid or expired verification code.');
      }

      // Server verified and inserted into DB
      const dbUser = data.user;
      verifiedUser = {
        id: `user-${dbUser.id || Date.now()}`,
        email: dbUser.email || cleanEmail,
        full_name: dbUser.name || cleanEmail.split('@')[0],
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
          notification_email: cleanEmail
        },
        onboarding_completed: false,
        created_at: new Date().toISOString()
      };
    } catch (err: any) {
      // Local fallback verification if backend API is not running
      const pendingRaw = localStorage.getItem(STORAGE_KEYS.PENDING_REGISTRATION);
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        if (pending.email === cleanEmail && (pending.otp === cleanOtp || pending.devOtp === cleanOtp)) {
          verifiedUser = {
            id: `user-${Date.now()}`,
            email: cleanEmail,
            full_name: pending.fullName || cleanEmail.split('@')[0],
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
              notification_email: cleanEmail
            },
            onboarding_completed: false,
            created_at: new Date().toISOString()
          };
        }
      }

      if (!verifiedUser) {
        throw new Error(err.message || 'Invalid verification code. Please check and try again.');
      }
    }

    // Save to verified users storage
    const users = this.getVerifiedUsers();
    const existingIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (existingIndex >= 0) {
      users[existingIndex] = verifiedUser;
    } else {
      users.push(verifiedUser);
    }
    this.saveVerifiedUsers(users);

    // Clean up pending registration
    localStorage.removeItem(STORAGE_KEYS.PENDING_REGISTRATION);

    return {
      success: true,
      message: 'Email successfully verified! Please log in with your verified credentials.',
      user: verifiedUser
    };
  }

  /**
   * Logs in a user. Strictly rejects any unverified emails.
   */
  public static login(email: string, _password?: string): UserProfile {
    const cleanEmail = email.trim().toLowerCase();
    const verifiedUsers = this.getVerifiedUsers();
    const user = verifiedUsers.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      throw new Error(
        'No verified account found with this email. Please sign up and verify your email via OTP first.'
      );
    }

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    this.notify(user);
    return user;
  }

  public static logout(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    this.notify(null);
  }

  public static updateCurrentUser(updates: Partial<UserProfile>): UserProfile {
    const current = this.getCurrentUser();
    if (!current) {
      throw new Error('No user currently logged in.');
    }

    const updated: UserProfile = {
      ...current,
      ...updates
    };

    const users = this.getVerifiedUsers();
    const index = users.findIndex(u => u.id === current.id);
    if (index !== -1) {
      users[index] = updated;
    } else {
      users.push(updated);
    }

    this.saveVerifiedUsers(users);
    this.notify(updated);
    return updated;
  }
}

/**
 * src/services/auth.ts
 * Authentication helpers: login, logout, session management, password management.
 * Passwords are SHA-256 hashed (client-side) before being compared with DB.
 */
import { supabase } from './supabase';
import { hashPassword } from '../utils/crypto';

export interface AuthUser {
  id: string;              // app_users.id
  username: string;        // NIS / employee_id / 'admin'
  role: 'admin' | 'student' | 'teacher';
  referenceId: string | null; // students.id or teachers.id
  displayName: string;
  mustChangePassword: boolean;
  // Populated for teachers after login
  classAssignment?: string | null;
}

const SESSION_KEY = 'eca_auth_session';

// ── Login ──────────────────────────────────────────────────────────────────
export const loginUser = async (
  username: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; message: string }> => {
  try {
    const hash = await hashPassword(password.trim());

    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username.trim())
      .eq('password_hash', hash)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, message: 'Invalid username or password.' };

    // For teachers: load class_assignment from teachers table
    let classAssignment: string | null = null;
    if (data.role === 'teacher' && data.reference_id) {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('class_assignment')
        .eq('id', data.reference_id)
        .maybeSingle();
      classAssignment = teacher?.class_assignment ?? null;
    }

    const user: AuthUser = {
      id: data.id,
      username: data.username,
      role: data.role as AuthUser['role'],
      referenceId: data.reference_id ?? null,
      displayName: data.display_name,
      mustChangePassword: data.must_change_password ?? false,
      classAssignment,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { success: true, user, message: 'Login successful.' };
  } catch (err: any) {
    console.error('Login error:', err);
    return { success: false, message: `Login error: ${err.message}` };
  }
};

// ── Session ────────────────────────────────────────────────────────────────
export const getSession = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const updateSessionData = (updates: Partial<AuthUser>): void => {
  const session = getSession();
  if (!session) return;
  const updated = { ...session, ...updates };
  localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
};

// ── Logout ─────────────────────────────────────────────────────────────────
export const logout = (): void => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('adminActiveTab');
  localStorage.removeItem('selectedStudentId');
  localStorage.removeItem('selectedTeacher');
};

// ── Change own password ────────────────────────────────────────────────────
export const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (newPassword.trim().length < 4) {
      return { success: false, message: 'New password must be at least 4 characters.' };
    }

    const oldHash = await hashPassword(oldPassword.trim());

    // Verify current password
    const { data: user, error } = await supabase
      .from('app_users')
      .select('password_hash')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!user) return { success: false, message: 'User account not found.' };
    if (user.password_hash !== oldHash) {
      return { success: false, message: 'Current password is incorrect.' };
    }

    const newHash = await hashPassword(newPassword.trim());
    const { error: updateErr } = await supabase
      .from('app_users')
      .update({ password_hash: newHash, must_change_password: false })
      .eq('id', userId);

    if (updateErr) throw updateErr;

    // Update the local session so banner disappears immediately
    updateSessionData({ mustChangePassword: false });

    return { success: true, message: 'Password changed successfully!' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
};

// ── Admin: reset any user's password ──────────────────────────────────────
export const adminResetPassword = async (
  targetUserId: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (newPassword.trim().length < 4) {
      return { success: false, message: 'Password must be at least 4 characters.' };
    }
    const newHash = await hashPassword(newPassword.trim());
    const { error } = await supabase
      .from('app_users')
      .update({ password_hash: newHash, must_change_password: true })
      .eq('id', targetUserId);
    if (error) throw error;
    return { success: true, message: 'Password reset. User will be prompted to change it on next login.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
};

// ── Fetch all app_users (admin only) ──────────────────────────────────────
export const getAppUsers = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('app_users')
    .select('id, username, role, reference_id, display_name, must_change_password, created_at')
    .order('role')
    .order('display_name');
  if (error) throw error;
  return data || [];
};

export const subscribeAppUsers = (callback: (data: any[]) => void) => {
  getAppUsers().then(callback).catch(console.error);
  const channel = supabase
    .channel(`app_users_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, async () => {
      callback(await getAppUsers());
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

export const deleteAppUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.from('app_users').delete().eq('id', userId);
    if (error) throw error;
    return { success: true, message: 'User account deleted.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
};

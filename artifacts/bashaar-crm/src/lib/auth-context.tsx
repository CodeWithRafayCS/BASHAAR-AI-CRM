import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UserSchema } from '@insforge/shared-schemas';
import { insforge } from '@/lib/insforge';
import { LoginPage } from '@/pages/login';
import {
  fetchUserRole,
  getRolePermissions,
  type UserRole,
  type RolePermissions,
} from '@/lib/insforge-crm';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: UserSchema | null;
  status: AuthStatus;
  role: UserRole;
  permissions: RolePermissions;
  isSuperAdmin: boolean;
  isManager: boolean;
  isSalesUser: boolean;
  isViewer: boolean;
  signUp: (params: { email: string; password: string; name?: string }) => ReturnType<typeof insforge.auth.signUp>;
  signIn: (params: { email: string; password: string }) => ReturnType<typeof insforge.auth.signInWithPassword>;
  verifyEmail: (params: { email: string; otp: string }) => ReturnType<typeof insforge.auth.verifyEmail>;
  resendVerificationEmail: (email: string) => ReturnType<typeof insforge.auth.resendVerificationEmail>;
  signInWithGoogle: (redirectTo: string) => ReturnType<typeof insforge.auth.signInWithOAuth>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const defaultPermissions: RolePermissions = {
  canAccessSettings: false,
  canAccessReports: false,
  canManageDeals: false,
  canEditRecords: false,
  canViewAllTeamData: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSchema | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [role, setRole] = useState<UserRole>('Sales User');
  const [permissions, setPermissions] = useState<RolePermissions>(defaultPermissions);

  const refresh = async () => {
    try {
      const { data } = await insforge.auth.getCurrentUser();
      const currentUser = data?.user ?? null;
      if (currentUser) {
        setUser(currentUser);
        setStatus('authenticated');
        const userRole = await fetchUserRole(
          currentUser.email,
          currentUser.id,
          currentUser.profile?.name
        );
        setRole(userRole);
        setPermissions(getRolePermissions(userRole));
      } else {
        setUser(null);
        setRole('Sales User');
        setPermissions(defaultPermissions);
        setStatus('unauthenticated');
      }
    } catch {
      setUser(null);
      setRole('Sales User');
      setPermissions(defaultPermissions);
      setStatus('unauthenticated');
    }
  };

  useEffect(() => {
    refresh();
    const unsubscribe = insforge.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    role,
    permissions,
    isSuperAdmin: role === 'Super Admin',
    isManager: role === 'Manager',
    isSalesUser: role === 'Sales User',
    isViewer: role === 'Viewer',
    signUp: (params) => insforge.auth.signUp(params),
    signIn: async (params) => {
      const result = await insforge.auth.signInWithPassword(params);
      if (result.data?.user) {
        setUser(result.data.user);
        setStatus('authenticated');
        const userRole = await fetchUserRole(
          result.data.user.email,
          result.data.user.id,
          result.data.user.profile?.name
        );
        setRole(userRole);
        setPermissions(getRolePermissions(userRole));
      }
      return result;
    },
    verifyEmail: async (params) => {
      const result = await insforge.auth.verifyEmail(params);
      if (result.data?.user) {
        setUser(result.data.user);
        setStatus('authenticated');
        const userRole = await fetchUserRole(
          result.data.user.email,
          result.data.user.id,
          result.data.user.profile?.name
        );
        setRole(userRole);
        setPermissions(getRolePermissions(userRole));
      }
      return result;
    },
    resendVerificationEmail: (email) => insforge.auth.resendVerificationEmail({ email }),
    signInWithGoogle: (redirectTo) => insforge.auth.signInWithOAuth('google', { redirectTo }),
    signOut: async () => {
      await insforge.auth.signOut();
      setUser(null);
      setRole('Sales User');
      setPermissions(defaultPermissions);
      setStatus('unauthenticated');
    },
    refresh,
  }), [user, status, role, permissions]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

/** Wrap a route's element with this to require a signed-in user. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') {
    return <div className="grid min-h-[100dvh] place-items-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (status === 'unauthenticated') {
    return <LoginPage />;
  }
  return <>{children}</>;
}

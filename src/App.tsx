import React, { useState, useEffect } from 'react';
import { Redirect, Route, useHistory, useLocation } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact, IonIcon } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import Teacher from './pages/Teacher';
import Admin from './pages/Admin';
import Login from './pages/Login';
import ckLogo from './assets/ck_logo.png';
import akLogo from './assets/ak_logo.png';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { changePassword } from './services/auth';
import {
  menuOutline,
  closeOutline,
  keyOutline,
  logOutOutline,
  schoolOutline,
  personOutline,
  settingsOutline,
  moonOutline,
  sunnyOutline
} from 'ionicons/icons';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/variables.css';

setupIonicReact();

// ── Change Password Modal ─────────────────────────────────────────────────
const ChangePasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, patchSession } = useAuth();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPwd || !newPwd || !confirmPwd) { setError('Please fill in all fields.'); return; }
    if (newPwd !== confirmPwd) { setError('New passwords do not match.'); return; }
    if (newPwd.length < 4) { setError('Password must be at least 4 characters.'); return; }

    setLoading(true);
    setError('');
    const res = await changePassword(currentUser!.id, oldPwd, newPwd);
    setLoading(false);

    if (res.success) {
      setSuccess('Password changed successfully!');
      patchSession({ mustChangePassword: false });
      setTimeout(onClose, 1500);
    } else {
      setError(res.message);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 99999,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
  };
  const cardStyle: React.CSSProperties = {
    background: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
    padding: '32px', width: '100%', maxWidth: '380px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  };
  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
    color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: '700',
    marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
  };

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '18px', fontWeight: '700' }}>🔑 Change Password</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Current Password</label>
            <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} style={fieldStyle} placeholder="Your current password" />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>New Password</label>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={fieldStyle} placeholder="New password (min 4 chars)" />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Confirm New Password</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} style={fieldStyle} placeholder="Repeat new password" />
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>❌ {error}</div>}
          {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>✅ {success}</div>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
              {loading ? 'Saving…' : 'Change Password'}
            </button>
            <button type="button" onClick={onClose} style={{ padding: '11px 16px', background: '#334155', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Protected Route ───────────────────────────────────────────────────────
interface ProtectedRouteProps {
  component: React.FC;
  path: string;
  exact?: boolean;
  allowedRoles?: Array<'admin' | 'student' | 'teacher'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component, allowedRoles, ...rest }) => {
  const { currentUser } = useAuth();

  return (
    <Route {...rest} render={() => {
      if (!currentUser) return <Redirect to="/login" />;

      if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
        // Redirect to the user's home based on their role
        if (currentUser.role === 'student') return <Redirect to="/home" />;
        if (currentUser.role === 'teacher') return <Redirect to="/teacher" />;
        return <Redirect to="/admin" />;
      }

      return <Component />;
    }} />
  );
};

// Helper — true when logged-in teacher has only a class assignment (no activities)
// Used in navbar to decide which buttons to show
const useTeacherType = () => {
  const { currentUser, isTeacher } = useAuth();
  const isForm = isTeacher && !!currentUser?.classAssignment;
  return { isForm };
};

// ── Role-Aware Navigation Bar ─────────────────────────────────────────────
const RoleAwareNavbar: React.FC = () => {
  const { currentUser, logout, isAdmin, isStudent, isTeacher } = useAuth();
  const { isForm } = useTeacherType();
  const { isDark, toggleTheme } = useTheme();
  const history = useHistory();
  const location = useLocation();
  const [showChangePwd, setShowChangePwd] = useState(false);

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Don't render nav on the login page
  if (!currentUser || location.pathname === '/login') return null;

  const getButtonStyle = (path: string, activeColor: string): React.CSSProperties => {
    const isActive = location.pathname === path;
    return {
      background: isActive ? activeColor : 'transparent',
      color: isActive ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
      border: isActive ? 'none' : (isDark ? '1px solid #334155' : '1px solid #cbd5e1'),
      padding: '7px 14px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: isActive ? `0 4px 10px rgba(0,0,0,0.3)` : 'none',
      whiteSpace: 'nowrap' as const,
    };
  };

  const getMobileButtonStyle = (path: string, activeColor: string): React.CSSProperties => {
    const isActive = location.pathname === path;
    return {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      background: isActive ? activeColor : (isDark ? 'rgba(255, 255, 255, 0.03)' : '#f1f5f9'),
      color: isActive ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569'),
      border: isActive ? 'none' : (isDark ? '1px solid #334155' : '1px solid #cbd5e1'),
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
    };
  };

  const handleLogout = () => {
    logout();
    history.replace('/login');
  };

  // Role badge colors — distinguish form vs subject teacher
  const roleBadge: Record<string, { bg: string; color: string; label: string }> = {
    admin: { bg: '#fef2f2', color: '#e11d48', label: 'Admin' },
    student: { bg: '#eff6ff', color: '#2563eb', label: 'Student' },
    teacher: { bg: '#f5f3ff', color: '#7c3aed', label: 'Teacher' },
    form_teacher: { bg: '#fdf4ff', color: '#9333ea', label: 'Form Teacher' },
  };
  const badgeKey = isTeacher && isForm ? 'form_teacher' : currentUser.role;
  const badge = roleBadge[badgeKey] || roleBadge.admin;

  // Responsive Drawer Styles
  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 10000,
    opacity: menuOpen ? 1 : 0,
    pointerEvents: menuOpen ? 'auto' : 'none',
    transition: 'opacity 0.3s ease',
  };

  const drawerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '280px',
    height: '100%',
    background: 'var(--eca-drawer-bg)',
    borderLeft: '1px solid var(--eca-drawer-border)',
    boxShadow: isDark ? '-4px 0 20px rgba(0, 0, 0, 0.4)' : '-4px 0 16px rgba(0,0,0,0.12)',
    zIndex: 10001,
    transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    paddingTop: 'calc(24px + var(--ion-safe-area-top, 0px))',
    paddingBottom: 'calc(24px + var(--ion-safe-area-bottom, 0px))',
    boxSizing: 'border-box',
    overflowY: 'auto',
  };

  return (
    <>
      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}

      {/* Must-change-password warning banner */}
      {currentUser.mustChangePassword && (
        <div style={{ background: '#fef3c7', borderBottom: '2px solid #f59e0b', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: '600', color: '#78350f' }}>
          <span>⚠️ You must change your password before using the system.</span>
          <button onClick={() => setShowChangePwd(true)} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>
            Change Now
          </button>
        </div>
      )}

      {isMobile ? (
        <>
          {/* Mobile Header Bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--eca-navbar-bg)', padding: '12px 18px',
            paddingTop: 'calc(12px + var(--ion-safe-area-top, 0px))',
            color: 'var(--eca-text-primary)', boxShadow: 'var(--eca-shadow-navbar)',
            borderBottom: '1px solid var(--eca-navbar-border)',
            zIndex: 9999, position: 'relative', height: 'calc(56px + var(--ion-safe-area-top, 0px))', boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '14px', letterSpacing: '-0.3px', color: '#38bdf8', cursor: 'pointer' }}
              onClick={() => isAdmin ? history.push('/admin') : isStudent ? history.push('/home') : history.push('/teacher')}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#ffffff', borderRadius: '6px', padding: '2px',
                height: '32px', width: '32px', boxSizing: 'border-box', flexShrink: 0
              }}>
                <img src={ckLogo} alt="CK Logo" style={{ height: '100%', width: '100%', objectFit: 'contain' }} />
              </div>
              ECA SCHEDULER
            </div>
            <button onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--eca-navbar-text)', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <IonIcon icon={menuOutline} style={{ fontSize: '28px' }} />
            </button>
          </div>

          {/* Mobile Menu Backdrop */}
          <div style={backdropStyle} onClick={() => setMenuOpen(false)} />

          {/* Mobile Drawer */}
          <div style={drawerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: '800', fontSize: '13px', color: '#38bdf8', letterSpacing: '0.5px' }}>MENU</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--eca-text-muted)', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <IonIcon icon={closeOutline} style={{ fontSize: '28px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px 0', borderBottom: '1px solid var(--eca-drawer-border)', marginBottom: '24px' }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--eca-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.displayName}
              </span>
              <span style={{ alignSelf: 'flex-start', padding: '3px 10px', background: badge.bg, color: badge.color, borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                {badge.label}
              </span>
            </div>

            {/* Navigation links inside drawer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              {isAdmin && (
                <>
                  <button style={getMobileButtonStyle('/home', '#0d9488')} onClick={() => history.push('/home')}>
                    <IonIcon icon={personOutline} style={{ marginRight: '12px', fontSize: '18px' }} /> Student Portal
                  </button>
                  <button style={getMobileButtonStyle('/teacher', '#7c3aed')} onClick={() => history.push('/teacher')}>
                    <IonIcon icon={schoolOutline} style={{ marginRight: '12px', fontSize: '18px' }} /> Teacher Portal
                  </button>
                  <button style={getMobileButtonStyle('/admin', '#e11d48')} onClick={() => history.push('/admin')}>
                    <IonIcon icon={settingsOutline} style={{ marginRight: '12px', fontSize: '18px' }} /> Admin Center
                  </button>
                </>
              )}
              {isStudent && (
                <button style={getMobileButtonStyle('/home', '#0d9488')} onClick={() => history.push('/home')}>
                  <IonIcon icon={personOutline} style={{ marginRight: '12px', fontSize: '18px' }} /> My Portal
                </button>
              )}
              {isTeacher && (
                <button style={getMobileButtonStyle('/teacher', '#7c3aed')} onClick={() => history.push('/teacher')}>
                  <IonIcon icon={schoolOutline} style={{ marginRight: '12px', fontSize: '18px' }} /> Teacher Portal
                </button>
              )}
            </div>

            {/* Footer action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
              {/* Theme Toggle */}
              <button onClick={toggleTheme} className="theme-toggle-btn" style={{ justifyContent: 'center', padding: '12px', fontSize: '13px' }}>
                <IonIcon icon={isDark ? sunnyOutline : moonOutline} />
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button onClick={() => setShowChangePwd(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'var(--eca-segment-bg)', border: '1px solid var(--eca-drawer-border)', borderRadius: '8px', color: 'var(--eca-text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                <IonIcon icon={keyOutline} /> Change Password
              </button>
              <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#e11d48', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                <IonIcon icon={logOutOutline} /> Logout
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Desktop Horizontal Navigation Bar */
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--eca-navbar-bg)', padding: '10px 20px',
          color: 'var(--eca-text-primary)', boxShadow: 'var(--eca-shadow-navbar)',
          borderBottom: '1px solid var(--eca-navbar-border)',
          zIndex: 9999, position: 'relative', gap: '12px', flexWrap: 'wrap',
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '14px', letterSpacing: '-0.3px', color: '#38bdf8', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => isAdmin ? history.push('/admin') : isStudent ? history.push('/home') : history.push('/teacher')}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#ffffff', borderRadius: '6px', padding: '2px',
              height: '32px', width: '32px', boxSizing: 'border-box', flexShrink: 0
            }}>
              <img src={ckLogo} alt="CK Logo" style={{ height: '100%', width: '100%', objectFit: 'contain' }} />
            </div>
            ECA
          </div>

          {/* Navigation buttons — strictly role-based */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flex: 1, justifyContent: 'center' }}>
            {/* Admin: sees all three portals */}
            {isAdmin && <button style={getButtonStyle('/home', '#0d9488')} onClick={() => history.push('/home')}>Student Portal</button>}
            {isAdmin && <button style={getButtonStyle('/teacher', '#7c3aed')} onClick={() => history.push('/teacher')}>Teacher Portal</button>}
            {isAdmin && <button style={getButtonStyle('/admin', '#e11d48')} onClick={() => history.push('/admin')}>Admin Center</button>}

            {/* Student: only My Portal */}
            {isStudent && <button style={getButtonStyle('/home', '#0d9488')} onClick={() => history.push('/home')}>My Portal</button>}

            {/* Teacher (any type): only Teacher Portal */}
            {isTeacher && <button style={getButtonStyle('/teacher', '#7c3aed')} onClick={() => history.push('/teacher')}>Teacher Portal</button>}
          </div>

          {/* User info + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* Role badge */}
            <span style={{ padding: '3px 10px', background: badge.bg, color: badge.color, borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
              {badge.label}
            </span>
            {/* Display name */}
            <span style={{ color: 'var(--eca-text-secondary)', fontSize: '12px', fontWeight: '600', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser.displayName}
            </span>
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="theme-toggle-btn" title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <IonIcon icon={isDark ? sunnyOutline : moonOutline} />
              {isDark ? 'Light' : 'Dark'}
            </button>
            <button
              onClick={() => setShowChangePwd(true)}
              title="Change Password"
              style={{ background: 'var(--eca-segment-bg)', border: '1px solid var(--eca-modal-border)', color: 'var(--eca-text-label)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
              🔑 Password
            </button>
            <button
              onClick={handleLogout}
              style={{ background: '#e11d48', border: 'none', color: '#fff', padding: '7px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ── App (inner, inside router) ────────────────────────────────────────────
const AppInner: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const { isDark } = useTheme();

  // Default redirect based on role
  const getDefaultPath = () => {
    if (!currentUser) return '/login';
    if (currentUser.role === 'student') return '/home';
    if (currentUser.role === 'teacher') return '/teacher';
    return '/admin';
  };

  const isLoginPage = !currentUser || location.pathname === '/login';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <RoleAwareNavbar />
      <div style={{ flex: 1, position: 'relative' }}>
        <IonRouterOutlet>
          <Route exact path="/login" component={Login} />
          {/* Students + admin can view the student portal */}
          <ProtectedRoute exact path="/home" component={Home} allowedRoles={['student', 'admin']} />
          {/* All teachers (subject + form) + admin can view the teacher portal */}
          <ProtectedRoute exact path="/teacher" component={Teacher} allowedRoles={['teacher', 'admin']} />
          {/* Only admin can view the admin center */}
          <ProtectedRoute exact path="/admin" component={Admin} allowedRoles={['admin']} />
          <Route exact path="/">
            <Redirect to={getDefaultPath()} />
          </Route>
        </IonRouterOutlet>
      </div>
      {!isLoginPage && (
        <div style={{
          display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px',
          padding: '6px 12px', background: 'var(--eca-navbar-bg)',
          borderTop: '1px solid var(--eca-navbar-border)',
          color: 'var(--eca-text-muted)', fontSize: '11px', fontWeight: '700',
          zIndex: 9999, boxSizing: 'border-box'
        }}>
          developed by <img src={akLogo} alt="AK" style={{ height: '34px', width: 'auto', objectFit: 'contain', filter: isDark ? 'brightness(0) invert(1)' : 'none' }} />
        </div>
      )}
    </div>
  );
};

const getBasename = () => {
  if (window.location.hostname.endsWith('github.io')) {
    const parts = window.location.pathname.split('/');
    if (parts[1]) {
      return `/${parts[1]}`;
    }
  }
  return '';
};

// ── Root App ──────────────────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <IonApp>
        <AuthProvider>
          <IonReactRouter basename={getBasename()}>
            <AppInner />
          </IonReactRouter>
        </AuthProvider>
      </IonApp>
    </ThemeProvider>
  );
};

export default App;

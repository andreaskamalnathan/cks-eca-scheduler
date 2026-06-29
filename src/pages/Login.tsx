/**
 * src/pages/Login.tsx
 * Premium login page for the ECA Scheduler system.
 * Handles login, must-change-password prompt.
 */
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import { loginUser, changePassword } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ckLogo from '../assets/ck_logo.png';
import akLogo from '../assets/ak_logo.png';

const Login: React.FC = () => {
  const history = useHistory();
  const { login, patchSession, currentUser } = useAuth();
  const { isDark } = useTheme();

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Change-password form state (shown after login if must_change_password)
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState('');

  const getRedirectPath = (role: string) => {
    if (role === 'admin') return '/admin';
    if (role === 'student') return '/home';
    return '/teacher';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await loginUser(username, password);
    setLoading(false);

    if (!result.success || !result.user) {
      setError(result.message);
      return;
    }

    login(result.user);

    if (result.user.mustChangePassword) {
      // Must change password before proceeding
      setPendingUser(result.user);
      setShowChangePwd(true);
    } else {
      history.replace(getRedirectPath(result.user.role));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPwd.trim() || !confirmPwd.trim()) {
      setCpError('Please fill in both password fields.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setCpError('Passwords do not match.');
      return;
    }
    if (newPwd.length < 4) {
      setCpError('Password must be at least 4 characters.');
      return;
    }
    // Use the reset password flow (admin already reset it, no old password needed)
    // We have the user object; call change with the same old password temporarily
    // Since admin reset sets must_change_password=true but doesn't give the user
    // the old hash, we update directly via Supabase using auth service
    setCpLoading(true);
    setCpError('');

    // We need to bypass old password check since admin reset it
    // We'll directly update via the supabase client
    const { supabase } = await import('../services/supabase');
    const { hashPassword } = await import('../utils/crypto');
    const newHash = await hashPassword(newPwd.trim());
    const { error: updateErr } = await supabase
      .from('app_users')
      .update({ password_hash: newHash, must_change_password: false })
      .eq('id', pendingUser.id);

    setCpLoading(false);

    if (updateErr) {
      setCpError(updateErr.message);
      return;
    }

    setCpSuccess('Password changed! Redirecting…');
    patchSession({ mustChangePassword: false });

    setTimeout(() => {
      history.replace(getRedirectPath(pendingUser.role));
    }, 1500);
  };

  return (
    <IonPage>
      <IonContent style={{ '--background': '#0a0e1a' }}>
        {/* Animated gradient background */}
        <div className="login-page" style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'linear-gradient(135deg, #0a0e1a 0%, #0f172a 50%, #0a1628 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background decorative circles */}
          <div style={{
            position: 'absolute', top: '-100px', right: '-100px',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-150px', left: '-100px',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Login Card */}
          <div style={{
            width: '100%', maxWidth: '420px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '40px 36px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
            position: 'relative',
            zIndex: 1,
          }}>
            {/* Logo & Branding */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <div style={{
                width: '84px', height: '84px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                background: '#ffffff',
                border: '3px solid #ffffff',
                borderRadius: '16px',
                padding: '6px',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                boxSizing: 'border-box',
              }}>
                <img
                  src={ckLogo}
                  alt="CK Logo"
                  style={{ height: '100%', width: '100%', objectFit: 'contain' }}
                />
              </div>
              <h1 style={{
                background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px',
                margin: '0 0 4px',
              }}>
                ECA SCHEDULER
              </h1>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0, fontWeight: '500' }}>
                Extracurricular Activity Registration System
              </p>
            </div>

            {/* ── CHANGE PASSWORD FORM ── */}
            {showChangePwd ? (
              <div>
                <div style={{
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '12px', padding: '14px 16px', marginBottom: '24px',
                  color: '#fbbf24', fontSize: '13px', fontWeight: '500',
                }}>
                  ⚠️ Your password has been reset by an admin. Please set a new password to continue.
                </div>

                <form onSubmit={handleChangePassword}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        value={newPwd}
                        onChange={e => setNewPwd(e.target.value)}
                        placeholder="Enter new password"
                        style={inputStyle}
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowNewPwd(p => !p)}
                        style={eyeButtonStyle}>
                        {showNewPwd ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Confirm New Password
                    </label>
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      value={confirmPwd}
                      onChange={e => setConfirmPwd(e.target.value)}
                      placeholder="Confirm new password"
                      style={inputStyle}
                    />
                  </div>

                  {cpError && (
                    <div style={{ ...feedbackStyle, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: '16px' }}>
                      ❌ {cpError}
                    </div>
                  )}
                  {cpSuccess && (
                    <div style={{ ...feedbackStyle, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7', marginBottom: '16px' }}>
                      ✅ {cpSuccess}
                    </div>
                  )}

                  <button type="submit" disabled={cpLoading} style={submitButtonStyle}>
                    {cpLoading ? 'Saving…' : 'Set New Password & Continue →'}
                  </button>
                </form>
              </div>
            ) : (
              /* ── LOGIN FORM ── */
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', opacity: 0.5 }}>
                      👤
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="NIS / Employee ID / admin"
                      style={{ ...inputStyle, paddingLeft: '42px' }}
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', opacity: 0.5 }}>
                      🔑
                    </span>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '44px' }}
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPwd(p => !p)} style={eyeButtonStyle}>
                      {showPwd ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{ ...feedbackStyle, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: '16px' }}>
                    ❌ {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={submitButtonStyle}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                      Signing in…
                    </span>
                  ) : 'Sign In →'}
                </button>

                {/* Credential hint */}
                <div style={{
                  marginTop: '24px', padding: '14px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Login Guide
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[
                      { role: '🎓 Student', hint: 'Username & password = NIS number' },
                      { role: '👩‍🏫 Teacher', hint: 'Username & password = Employee ID' },
                    ].map(item => (
                      <div key={item.role} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <span style={{ color: '#94a3b8', minWidth: '90px', fontWeight: '600' }}>{item.role}</span>
                        <span style={{ color: '#cbd5e1' }}>{item.hint}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '24px', width: '100%' }}>
            <p style={{ color: '#64748b', fontSize: '12px', margin: 0, textAlign: 'center' }}>
              ECA Scheduler · School Extracurricular Management
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
              <span>developed by</span>
              <img src={akLogo} alt="AK Logo" style={{ height: '65px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </IonContent>
    </IonPage>
  );
};

// ── Shared styles ──────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const eyeButtonStyle: React.CSSProperties = {
  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px',
  padding: '4px', opacity: 0.6,
};

const submitButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  background: 'linear-gradient(135deg, #3b82f6, #7c3aed)',
  border: 'none',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '700',
  cursor: 'pointer',
  transition: 'opacity 0.2s, transform 0.1s',
  letterSpacing: '0.2px',
};

const feedbackStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: '500',
};

export default Login;

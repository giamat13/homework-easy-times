// App.jsx
import React, { useState, useEffect } from 'react';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  sendPhoneVerification,
  verifyPhoneCode,
  linkEmailToAccount,
  linkGoogleToAccount,
  logOut,
  onAuthChange,
  initRecaptcha,
  resetPassword
} from './auth-service';
import { syncUserData } from './firestore-service';
import './App.css';

function App() {
  // State Management
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('signin');

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);

  // UI States
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  // ============================================
  // האזנה לשינויים במשתמש
  // ============================================
  useEffect(() => {
    const unsubscribe = onAuthChange(({ user, userData }) => {
      setUser(user);
      setUserData(userData);
      setLoading(false);
    });

    initRecaptcha('recaptcha-container');

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // ============================================
  // פונקציות עזר
  // ============================================
  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { label: 'חלשה מאוד', color: '#f44336', width: '20%' };
    if (score === 2) return { label: 'חלשה', color: '#ff9800', width: '40%' };
    if (score === 3) return { label: 'בינונית', color: '#ffc107', width: '60%' };
    if (score === 4) return { label: 'חזקה', color: '#8bc34a', width: '80%' };
    return { label: 'חזקה מאוד', color: '#4caf50', width: '100%' };
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('הועתק ללוח!');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setError('לא ניתן להעתיק');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'לא ידוע';
    return new Date(dateStr).toLocaleString('he-IL');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('הכנס כתובת אימייל קודם');
      return;
    }
    setIsProcessing(true);
    setError('');
    setMessage('');
    const result = await resetPassword(email);
    if (result.success) {
      setMessage(result.message);
    } else {
      setError(result.message);
    }
    setIsProcessing(false);
  };

  // ============================================
  // פונקציות התחברות והרשמה
  // ============================================
  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    setMessage('');

    const result = await signUpWithEmail(email, password, {
      displayName: email.split('@')[0]
    });

    if (result.success) {
      setMessage(result.message);
      setEmail('');
      setPassword('');
    } else {
      setError(result.message);
    }

    setIsProcessing(false);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    setMessage('');

    const result = await signInWithEmail(email, password);

    if (result.success) {
      setMessage(result.message);
    } else {
      setError(result.message);
    }

    setIsProcessing(false);
  };

  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    setError('');
    setMessage('');

    const result = await signInWithGoogle();

    if (result.success) {
      setMessage(result.message);
    } else {
      setError(result.message);
    }

    setIsProcessing(false);
  };

  const handleSendPhoneCode = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    setMessage('');

    const result = await sendPhoneVerification(phoneNumber);

    if (result.success) {
      setConfirmationResult(result.confirmationResult);
      setMessage(result.message);
    } else {
      setError(result.message);
    }

    setIsProcessing(false);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!confirmationResult) {
      setError('שלח קוד אימות קודם');
      return;
    }

    setIsProcessing(true);
    setError('');
    setMessage('');

    const result = await verifyPhoneCode(confirmationResult, verificationCode);

    if (result.success) {
      setMessage(result.message);
      setVerificationCode('');
      setConfirmationResult(null);
    } else {
      setError(result.message);
    }

    setIsProcessing(false);
  };

  const handleLinkEmail = async () => {
    setIsProcessing(true);
    setError('');

    const result = await linkEmailToAccount(email, password);

    if (result.success) {
      setMessage(result.message);
      setEmail('');
      setPassword('');
    } else {
      setError(result.message);
    }

    setIsProcessing(false);
  };

  const handleLinkGoogle = async () => {
    setIsProcessing(true);
    setError('');

    const result = await linkGoogleToAccount();

    if (result.success) {
      setMessage(result.message);
    } else {
      setError(result.message);
    }

    setIsProcessing(false);
  };

  const handleLogOut = async () => {
    const result = await logOut();
    if (result.success) {
      setMessage(result.message);
      setUser(null);
      setUserData(null);
    }
  };

  // ============================================
  // כפתור מצב לילה
  // ============================================
  const DarkModeToggle = () => (
    <button
      className="dark-mode-toggle"
      onClick={() => setDarkMode(!darkMode)}
      title={darkMode ? 'מצב יום' : 'מצב לילה'}
    >
      {darkMode ? '☀️' : '🌙'}
    </button>
  );

  // ============================================
  // טעינה
  // ============================================
  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>טוען...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // תצוגה למשתמש מחובר
  // ============================================
  if (user) {
    return (
      <div className="app" dir="rtl">
        <div className="dashboard">
          <DarkModeToggle />
          <h1>ברוך הבא! 🎉</h1>

          <div className="user-info">
            <h2>פרטי המשתמש</h2>
            {user.photoURL && (
              <img src={user.photoURL} alt="Profile" className="profile-pic" />
            )}
            {user.displayName && (
              <p><strong>שם:</strong> {user.displayName}</p>
            )}
            <p className="uid-row">
              <strong>UID:</strong>
              <span className="uid-text">{user.uid}</span>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(user.uid)}
                title="העתק UID"
              >
                📋
              </button>
            </p>
            <p><strong>אימייל:</strong> {user.email || 'לא הוגדר'}</p>
            <p><strong>טלפון:</strong> {user.phoneNumber || 'לא הוגדר'}</p>
            <p><strong>אימייל מאומת:</strong> {user.emailVerified ? '✅ כן' : '❌ לא'}</p>
            <p><strong>כניסה אחרונה:</strong> {formatDate(user.metadata?.lastSignInTime)}</p>
            <p><strong>תאריך הצטרפות:</strong> {formatDate(user.metadata?.creationTime)}</p>

            {userData && (
              <div className="firestore-data">
                <h3>נתונים מ-Firestore:</h3>
                <pre>{JSON.stringify(userData, null, 2)}</pre>
              </div>
            )}
          </div>

          <div className="providers-info">
            <h3>שיטות התחברות מקושרות:</h3>
            <ul>
              {userData?.providers?.map((provider, index) => (
                <li key={index}>
                  {provider === 'password' && '📧 אימייל וסיסמה'}
                  {provider === 'google.com' && '🔍 Google'}
                  {provider === 'phone' && '📱 טלפון'}
                </li>
              ))}
            </ul>
          </div>

          <div className="link-accounts">
            <h3>קשר שיטות התחברות נוספות:</h3>

            {!userData?.providers?.includes('password') && (
              <div className="link-section">
                <h4>קשר Email & Password</h4>
                <input
                  type="email"
                  placeholder="אימייל"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button onClick={handleLinkEmail} disabled={isProcessing}>
                  קשר אימייל וסיסמה
                </button>
              </div>
            )}

            {!userData?.providers?.includes('google.com') && (
              <button
                onClick={handleLinkGoogle}
                disabled={isProcessing}
                className="google-btn"
              >
                🔍 קשר חשבון Google
              </button>
            )}
          </div>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <button onClick={handleLogOut} className="logout-btn">
            התנתק
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // תצוגת התחברות/הרשמה
  // ============================================
  const passwordStrength = authMode === 'signup' ? getPasswordStrength(password) : null;

  return (
    <div className="app" dir="rtl">
      <div className="auth-container">
        <DarkModeToggle />
        <h1>🔐 מערכת התחברות מלאה</h1>

        {/* טאבים */}
        <div className="tabs">
          <button
            className={authMode === 'signin' ? 'active' : ''}
            onClick={() => setAuthMode('signin')}
          >
            התחבר
          </button>
          <button
            className={authMode === 'signup' ? 'active' : ''}
            onClick={() => setAuthMode('signup')}
          >
            הרשם
          </button>
          <button
            className={authMode === 'phone' ? 'active' : ''}
            onClick={() => setAuthMode('phone')}
          >
            טלפון
          </button>
        </div>

        {/* הודעות */}
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        {/* התחברות */}
        {authMode === 'signin' && (
          <form onSubmit={handleSignIn} className="auth-form">
            <h2>התחבר עם Email</h2>
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isProcessing}
            />
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isProcessing}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <button type="submit" disabled={isProcessing}>
              {isProcessing ? 'מתחבר...' : 'התחבר'}
            </button>
            <button
              type="button"
              className="forgot-password-btn"
              onClick={handleForgotPassword}
              disabled={isProcessing}
            >
              שכחת סיסמה?
            </button>
          </form>
        )}

        {/* הרשמה */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} className="auth-form">
            <h2>צור חשבון חדש</h2>
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isProcessing}
            />
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="סיסמה (לפחות 6 תווים)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isProcessing}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {passwordStrength && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{ width: passwordStrength.width, backgroundColor: passwordStrength.color }}
                  />
                </div>
                <span className="strength-label" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
            <button type="submit" disabled={isProcessing}>
              {isProcessing ? 'יוצר חשבון...' : 'צור חשבון'}
            </button>
          </form>
        )}

        {/* טלפון */}
        {authMode === 'phone' && (
          <div className="auth-form">
            <h2>התחבר עם טלפון</h2>
            {!confirmationResult ? (
              <form onSubmit={handleSendPhoneCode}>
                <input
                  type="tel"
                  placeholder="+972501234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  disabled={isProcessing}
                />
                <button type="submit" disabled={isProcessing}>
                  {isProcessing ? 'שולח קוד...' : 'שלח קוד אימות'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode}>
                <input
                  type="text"
                  placeholder="קוד אימות (6 ספרות)"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  disabled={isProcessing}
                />
                <button type="submit" disabled={isProcessing}>
                  {isProcessing ? 'מאמת...' : 'אמת קוד'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* כפתור Google */}
        <div className="divider">או</div>
        <button
          onClick={handleGoogleSignIn}
          disabled={isProcessing}
          className="google-btn"
        >
          {isProcessing ? 'מתחבר...' : '🔍 המשך עם Google'}
        </button>

        {/* reCAPTCHA Container */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

export default App;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  User,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import authService from '@/services/authService';
import leadershipService from '@/services/leadershipService';
import logoImg from '@/assets/images/arogya_mitra_logo.png';
import leaderPhoto from '@/assets/images/RavindraChavan_photo_crisp.jpg';
import './Login.css';

// Steps in the authentication journey
const STEPS = {
  MOBILE: 'MOBILE',
  PASSWORD: 'PASSWORD',
  OTP: 'OTP',
  SET_PASSWORD: 'SET_PASSWORD',
};

export const Login = () => {
  const { login, setPassword: authSetPassword } = useAuth();
  const navigate = useNavigate();

  // Current step
  const [step, setStep] = useState(STEPS.MOBILE);

  // Form input states
  const [mobileNumber, setMobileNumber] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [rememberMe, setRememberMe] = useState(true);

  // Visibility toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI / Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [existingUserName, setExistingUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isBackupUser, setIsBackupUser] = useState(false);
  const [coveringForSevakName, setCoveringForSevakName] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Dynamic MLA Leadership showcase state
  const [mlaData, setMlaData] = useState(() => {
    const cachedPhoto = localStorage.getItem('arogya_mla_photo');
    return {
      photoUrl: cachedPhoto || leaderPhoto,
      name: 'Hon. Ravindra Dattatray Chavan',
      nameMr: 'मा. ना. श्री. रवींद्र चव्हाण',
      nameHi: 'मा. ना. श्री. रवींद्र चव्हाण',
      partyTitle: 'State President of BJP Maharashtra | Dombivli Assembly Constituency',
      partyTitleMr: 'प्रदेशाध्यक्ष, भाजप महाराष्ट्र | आमदार, डोंबिवली विधानसभा',
      partyTitleHi: 'प्रदेशाध्यक्ष, भाजपा महाराष्ट्र | विधायक, डोंबिवली विधानसभा',
      tagline: 'Committed to your health and well-being.',
      taglineMr: 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.',
      taglineHi: 'आपके स्वास्थ्य के लिए, हम प्रतिबद्ध.',
      initiativeTitle: 'Special Initiative',
      initiativeTitleMr: 'विशेष पुढाकार',
      initiativeTitleHi: 'विशेष पहल',
      visionQuote: 'प्रत्येक नागरिकाच्या आरोग्यासाठी तत्पर, सक्षम आणि पारदर्शक आरोग्य सेवा.',
      quoteSub: 'आरोग्य संपन्न महाराष्ट्र अभियान',
    };
  });

  // Fetch latest MLA profile photo & details on mount
  useEffect(() => {
    let isMounted = true;
    const fetchMlaData = async () => {
      try {
        const res = await leadershipService.getMlaProfile();
        const profile = res?.data?.profile;
        if (isMounted && profile) {
          const photo = profile.photoUrl || null;
          if (photo) {
            localStorage.setItem('arogya_mla_photo', photo);
          }
          setMlaData((prev) => ({
            ...prev,
            photoUrl: photo || prev.photoUrl || leaderPhoto,
            name: profile.name || prev.name,
            nameMr: profile.nameMr || prev.nameMr,
            nameHi: profile.nameHi || prev.nameHi,
            partyTitle: profile.partyTitle || prev.partyTitle,
            partyTitleMr: profile.partyTitleMr || prev.partyTitleMr,
            partyTitleHi: profile.partyTitleHi || prev.partyTitleHi,
            tagline: profile.tagline || prev.tagline,
            taglineMr: profile.taglineMr || prev.taglineMr,
            taglineHi: profile.taglineHi || prev.taglineHi,
            initiativeTitle: profile.initiativeTitle || prev.initiativeTitle,
            initiativeTitleMr: profile.initiativeTitleMr || prev.initiativeTitleMr,
            initiativeTitleHi: profile.initiativeTitleHi || prev.initiativeTitleHi,
            visionQuote: profile.visionQuote || prev.visionQuote,
          }));
        }
      } catch (err) {
        console.warn('[Login] MLA profile fetch skipped or failed:', err?.message);
      }
    };
    fetchMlaData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to check lockout for a specific mobile number
  const checkMobileLockout = (mobile) => {
    const clean = String(mobile || '').replace(/\D/g, '');
    if (!clean) return 0;
    const savedLockoutUntil = localStorage.getItem(`arogya_auth_lockout_${clean}`);
    if (savedLockoutUntil) {
      const remaining = Math.ceil((parseInt(savedLockoutUntil, 10) - Date.now()) / 1000);
      if (remaining > 0) {
        return remaining;
      }
      localStorage.removeItem(`arogya_auth_lockout_${clean}`);
    }
    return 0;
  };

  // Clean old global keys and sync lockout on mount & mobileNumber changes
  useEffect(() => {
    localStorage.removeItem('arogya_auth_lockout_until'); // Clear old global key
    const remaining = checkMobileLockout(mobileNumber);
    setLockoutTimer(remaining);
  }, [mobileNumber, step]);

  // Lockout countdown timer for the active mobile number
  useEffect(() => {
    let timer;
    if (lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer((prev) => {
          const clean = String(mobileNumber || '').replace(/\D/g, '');
          if (prev <= 1) {
            if (clean) localStorage.removeItem(`arogya_auth_lockout_${clean}`);
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTimer, mobileNumber]);

  const triggerLockout = (seconds = 300, targetMobile = mobileNumber) => {
    const clean = String(targetMobile || mobileNumber || '').replace(/\D/g, '');
    const sec = parseInt(seconds, 10) || 300;
    if (clean) {
      const lockoutUntil = Date.now() + sec * 1000;
      localStorage.setItem(`arogya_auth_lockout_${clean}`, lockoutUntil.toString());
    }
    setLockoutTimer(sec);
  };

  const formatLockoutTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Refs for 4-box OTP input
  const otpInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Resend OTP countdown
  useEffect(() => {
    let timer;
    if (step === STEPS.OTP && resendTimer > 0) {
      timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  // Focus first OTP input when step changes to OTP
  useEffect(() => {
    if (step === STEPS.OTP) {
      setTimeout(() => {
        otpInputRefs[0].current?.focus();
      }, 100);
    }
  }, [step]);

  // =========================================================================
  // Handlers
  // =========================================================================

  // STEP 1: Handle Mobile Submit -> Verify Role and Check Password Status
  const handleMobileSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    setError('');
    setInfoMessage('');
    setIsResetPassword(false);

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.initiateAuth({ mobileNumber: cleanMobile });
      const data = res?.data || res;

      setExistingUserName(data?.name || '');
      setUserRole(data?.role || '');
      setIsBackupUser(Boolean(data?.isBackup));
      setCoveringForSevakName(data?.coveringFor || data?.primarySevakName || '');

      // Case A: User has password set (Returning User) -> Direct password prompt
      if (data?.status === 'PASSWORD_REQUIRED') {
        setLoginPassword('');
        setStep(STEPS.PASSWORD);
      }
      // Case B: First-time allocated Admin or Arogya Sevak -> OTP Verification
      else if (data?.status === 'FIRST_TIME_OTP') {
        if (data?.otp) {
          setDevOtp(data.otp);
        }
        setResendTimer(30);
        setOtp(['', '', '', '']);
        setStep(STEPS.OTP);
      }
    } catch (err) {
      const errData = err?.response?.data || err?.data;
      const clean = cleanMobile;
      const is429 =
        err?.response?.status === 429 ||
        err?.status === 429 ||
        errData?.statusCode === 429 ||
        errData?.isLocked;

      if (is429) {
        const sec = errData?.lockoutSeconds || errData?.retryAfter || 300;
        triggerLockout(sec, clean);
        setError('');
      } else {
        setError(
          errData?.message ||
          err?.message ||
          'This mobile number is not registered as an Admin or Arogya Sevak. Please check the number or contact your administrator.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger Forgot Password: sends OTP to the user's mobile and transitions to OTP step
  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    if (lockoutTimer > 0) return;
    setError('');
    setInfoMessage('');

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number first.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendOtp({ mobileNumber: cleanMobile });
      const data = res?.data || res;
      if (data?.otp) {
        setDevOtp(data.otp);
      }
      setIsResetPassword(true);
      setResendTimer(30);
      setOtp(['', '', '', '']);
      setInfoMessage(`Password reset OTP sent to +91 ${cleanMobile}.`);
      setStep(STEPS.OTP);
    } catch (err) {
      const errData = err?.response?.data || err?.data;
      const is429 = err?.response?.status === 429 || err?.status === 429 || errData?.statusCode === 429 || errData?.isLocked;

      if (is429) {
        const sec = errData?.lockoutSeconds || errData?.retryAfter || 300;
        triggerLockout(sec, cleanMobile);
        setError('');
      } else {
        setError(errData?.message || err?.message || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Handle OTP Verification -> Move to Set New Password Screen
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    setError('');
    setInfoMessage('');

    const otpCode = otp.join('').trim();
    if (otpCode.length !== 4) {
      setError('Please enter the complete 4-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const cleanMobile = mobileNumber.replace(/\D/g, '');
      await authService.verifyOtp({ mobileNumber: cleanMobile, otp: otpCode });
      // OTP verified successfully -> move to SET_PASSWORD step
      setNewPassword('');
      setConfirmPassword('');
      if (isResetPassword) {
        setInfoMessage('Mobile verified! You can now choose your new password.');
      }
      setStep(STEPS.SET_PASSWORD);
    } catch (err) {
      const errData = err?.response?.data || err?.data;
      const cleanMobile = mobileNumber.replace(/\D/g, '');
      if (err?.response?.status === 429 || err?.status === 429 || errData?.statusCode === 429 || errData?.isLocked) {
        const sec = errData?.lockoutSeconds || errData?.retryAfter || 300;
        triggerLockout(sec, cleanMobile);
        setError(errData?.message || 'Too many failed attempts. Locked for 5 minutes.');
      } else {
        setError(errData?.message || err?.message || 'Invalid OTP code. Please check and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendTimer > 0 || lockoutTimer > 0) return;
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const cleanMobile = mobileNumber.replace(/\D/g, '');
      const res = await authService.sendOtp({ mobileNumber: cleanMobile });
      const data = res?.data || res;
      if (data?.otp) {
        setDevOtp(data.otp);
      }
      setResendTimer(30);
      setInfoMessage(
        isResetPassword
          ? `A fresh reset OTP has been sent to +91 ${cleanMobile}.`
          : `A new verification OTP has been sent to +91 ${cleanMobile}.`
      );
    } catch (err) {
      const errData = err?.response?.data || err?.data;
      const cleanMobile = mobileNumber.replace(/\D/g, '');
      if (err?.response?.status === 429 || err?.status === 429 || errData?.statusCode === 429 || errData?.isLocked) {
        const sec = errData?.lockoutSeconds || errData?.retryAfter || 300;
        triggerLockout(sec, cleanMobile);
        setError(errData?.message || 'Too many OTP requests. Please wait.');
      } else {
        setError(errData?.message || err?.message || 'Failed to resend OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  // OTP Box Change handler
  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanVal;
    setOtp(newOtp);

    // Auto-advance to next box
    if (cleanVal && index < 3) {
      otpInputRefs[index + 1].current?.focus();
    }
  };

  // OTP Box KeyDown (Backspace navigation)
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

  // Quick auto-fill helper for development
  const handleAutoFillDevOtp = () => {
    if (devOtp && devOtp.length === 4) {
      setOtp(devOtp.split(''));
      setError('');
    }
  };

  // STEP 3A: Returning User Login with Existing Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    setError('');
    setInfoMessage('');

    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const cleanMobile = mobileNumber.replace(/\D/g, '');
      const res = await login({ mobileNumber: cleanMobile, password: loginPassword });

      // Clear any lockout state on successful login
      localStorage.removeItem(`arogya_auth_lockout_${cleanMobile}`);
      setLockoutTimer(0);

      const role = (res?.user?.role || res?.user?.systemRole || '').toUpperCase();
      if (role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/portal');
      }
    } catch (err) {
      const errData = err?.response?.data || err?.data;
      const cleanMobile = mobileNumber.replace(/\D/g, '');
      const is429 =
        err?.response?.status === 429 ||
        err?.status === 429 ||
        errData?.statusCode === 429 ||
        errData?.isLocked;

      if (is429) {
        const sec = errData?.lockoutSeconds || errData?.retryAfter || 300;
        triggerLockout(sec, cleanMobile);
        setError('');
      } else {
        setError(
          errData?.message ||
          err?.message ||
          'Invalid password. Please check your credentials.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // STEP 3B / Password Reset: User Sets Permanent Password (New Pass + Re-Pass)
  const handleSetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const cleanMobile = mobileNumber.replace(/\D/g, '');
      const res = await authSetPassword({
        mobileNumber: cleanMobile,
        password: newPassword,
      });
      const role = (res?.user?.role || res?.user?.systemRole || '').toUpperCase();
      if (role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/portal');
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        (isResetPassword
          ? 'Failed to reset password. Please try again.'
          : 'Failed to set password. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  // Back to mobile entry step
  const handleBackToMobile = (clearInput = false) => {
    setStep(STEPS.MOBILE);
    setError('');
    setInfoMessage('');
    setIsResetPassword(false);
    setLoginPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setOtp(['', '', '', '']);
    if (clearInput) {
      setMobileNumber('');
      setLockoutTimer(0);
    } else {
      const remaining = checkMobileLockout(mobileNumber);
      setLockoutTimer(remaining);
    }
  };

  // Back to password entry (when canceling reset flow)
  const handleBackToPassword = () => {
    setStep(STEPS.PASSWORD);
    setError('');
    setInfoMessage('');
    setIsResetPassword(false);
    setLoginPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setOtp(['', '', '', '']);
  };

  // =========================================================================
  // Render Form Content by Step
  // =========================================================================
  const renderFormContent = () => {
    switch (step) {
      // ---------------------------------------------------------------------
      // STEP 1: MOBILE ENTRY (Portal verification for Admin / Arogya Sevak)
      // ---------------------------------------------------------------------
      case STEPS.MOBILE:
        return (
          <form onSubmit={handleMobileSubmit} className="simple-login-form">
            <div className="simple-input-group">
              <label htmlFor="login-mobile">Registered Mobile Number</label>
              <div className="simple-input-box">
                <Phone size={18} className="simple-input-icon" />
                <span className="simple-prefix">+91</span>
                <input
                  id="login-mobile"
                  type="tel"
                  maxLength="10"
                  placeholder="Enter 10-digit mobile"
                  value={mobileNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setMobileNumber(clean);
                    const remaining = checkMobileLockout(clean);
                    setLockoutTimer(remaining);
                    setError('');
                  }}
                  autoFocus
                  required
                />
              </div>
              <span className="simple-input-hint">
                Enter your allocated Admin or Arogya Sevak mobile number.
              </span>
            </div>

            <div className="simple-form-options">
              <label className="simple-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              className="simple-submit-btn"
              disabled={loading || mobileNumber.length !== 10 || lockoutTimer > 0}
            >
              {loading ? 'Verifying...' : 'Next'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        );

      // ---------------------------------------------------------------------
      // STEP 2: 4-DIGIT OTP VERIFICATION (For First-Time Visitors & Password Reset)
      // ---------------------------------------------------------------------
      case STEPS.OTP:
        return (
          <form onSubmit={handleOtpSubmit} className="simple-login-form">
            <div className="otp-step-header">
              <div className="otp-icon-bubble">
                {isResetPassword ? (
                  <KeyRound size={26} className="otp-bubble-icon" />
                ) : (
                  <ShieldCheck size={26} className="otp-bubble-icon" />
                )}
              </div>
              <h3 className="otp-title">
                {isResetPassword ? 'Reset Password Verification' : 'Enter Verification Code'}
              </h3>
              <p className="otp-subtitle">
                {isResetPassword ? (
                  <>
                    Code sent to <strong>+91 {mobileNumber}</strong>
                  </>
                ) : (
                  <>
                    First-time setup for <strong>+91 {mobileNumber}</strong>
                    {isBackupUser && coveringForSevakName && (
                      <span className="block text-xs text-sky-700 font-semibold mt-1">
                        ⚡ Temporary Relief Sevak for {coveringForSevakName}
                      </span>
                    )}
                    <button type="button" onClick={() => handleBackToMobile(false)} className="otp-change-number-btn">
                      Edit
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Dev Mode OTP Chip */}
            {devOtp && (
              <div className="dev-otp-banner" onClick={handleAutoFillDevOtp} title="Click to auto-fill OTP">
                <span className="dev-otp-tag">DEV OTP</span>
                <span className="dev-otp-code">{devOtp}</span>
                <span className="dev-otp-action">Click to Auto-fill</span>
              </div>
            )}

            {/* 4-digit OTP Inputs */}
            <div className="otp-boxes-wrapper">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={otpInputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  className={`otp-digit-box ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <div className="otp-resend-row">
              {resendTimer > 0 ? (
                <span className="otp-timer-text">
                  Resend code in <strong>{resendTimer}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="otp-resend-btn"
                  disabled={loading}
                >
                  <RotateCcw size={14} />
                  <span>Resend OTP</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              className="simple-submit-btn"
              disabled={loading || otp.join('').length !== 4 || lockoutTimer > 0}
            >
              {loading
                ? 'Verifying OTP...'
                : isResetPassword
                ? 'Verify OTP & Continue'
                : 'Verify OTP'}
              {!loading && <ArrowRight size={18} />}
            </button>

            {isResetPassword ? (
              <button type="button" onClick={handleBackToPassword} className="back-step-link">
                <ArrowLeft size={16} />
                <span>Remember password? Back to Login</span>
              </button>
            ) : (
              <button type="button" onClick={() => handleBackToMobile(false)} className="back-step-link">
                <ArrowLeft size={16} />
                <span>Change Mobile Number</span>
              </button>
            )}
          </form>
        );

      // ---------------------------------------------------------------------
      // STEP 3A: RETURNING USER -> DIRECT PASSWORD PROMPT
      // ---------------------------------------------------------------------
      case STEPS.PASSWORD:
        return (
          <form onSubmit={handlePasswordSubmit} className="simple-login-form">
            <div className="existing-user-badge">
              <div className="user-avatar-tiny">
                <User size={16} />
              </div>
              <div className="existing-user-meta">
                <span className="existing-user-greeting">
                  Welcome back{existingUserName ? `, ${existingUserName}` : ''}!
                </span>
                <span className="existing-user-phone">
                  +91 {mobileNumber} · {userRole === 'ADMIN' ? 'Admin' : (isBackupUser ? `Relief Sevak (Covering for ${coveringForSevakName || 'Primary Sevak'})` : 'Arogya Sevak')}
                </span>
              </div>
            </div>

            <div className="simple-input-group">
              <div className="simple-label-row">
                <label htmlFor="login-password">Enter Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="simple-forgot-link"
                  disabled={loading || lockoutTimer > 0}
                  title="Send OTP to reset your password"
                >
                  {loading ? 'Sending OTP...' : 'Forgot password?'}
                </button>
              </div>
              <div className="simple-input-box">
                <Lock size={18} className="simple-input-icon" />
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoFocus
                  disabled={lockoutTimer > 0}
                  required
                />
                <button
                  type="button"
                  className="simple-toggle-pwd"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  tabIndex="-1"
                  aria-label="Toggle password visibility"
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="simple-submit-btn"
              disabled={loading || !loginPassword || lockoutTimer > 0}
            >
              {loading ? 'Signing in...' : 'Sign In to Portal'}
              {!loading && <ArrowRight size={18} />}
            </button>

            <button
              type="button"
              onClick={() => handleBackToMobile(true)}
              className="back-step-link"
            >
              <ArrowLeft size={16} />
              <span>Change Mobile Number</span>
            </button>
          </form>
        );

      // ---------------------------------------------------------------------
      // STEP 3B: FIRST-TIME VISITOR / PASSWORD RESET -> SET NEW PASSWORD
      // ---------------------------------------------------------------------
      case STEPS.SET_PASSWORD:
        return (
          <form onSubmit={handleSetPasswordSubmit} className="simple-login-form">
            <div className="new-user-welcome-card">
              <div className="new-user-icon-box">
                <KeyRound size={20} />
              </div>
              <div>
                <h4 className="new-user-title">
                  {isResetPassword ? 'Create New Password' : 'Set New Password'}
                </h4>
                <p className="new-user-subtitle">
                  {isResetPassword
                    ? `Set a new secure password for ${existingUserName || 'your account'} (+91 ${mobileNumber})`
                    : `First-time setup for ${existingUserName || 'allocated staff'} (+91 ${mobileNumber})`}
                </p>
              </div>
            </div>

            <div className="simple-input-group">
              <label htmlFor="set-new-password">New Password</label>
              <div className="simple-input-box">
                <Lock size={18} className="simple-input-icon" />
                <input
                  id="set-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter at least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="simple-toggle-pwd"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex="-1"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="simple-input-group">
              <label htmlFor="set-confirm-password">Confirm Password (Re-enter)</label>
              <div className="simple-input-box">
                <Lock size={18} className="simple-input-icon" />
                <input
                  id="set-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="simple-toggle-pwd"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="simple-submit-btn"
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading
                ? isResetPassword
                  ? 'Updating Password & Signing in...'
                  : 'Setting Password & Logging in...'
                : isResetPassword
                ? 'Update Password & Sign In'
                : 'Save Password & Sign In'}
              {!loading && <ArrowRight size={18} />}
            </button>

            {isResetPassword ? (
              <button type="button" onClick={handleBackToPassword} className="back-step-link">
                <ArrowLeft size={16} />
                <span>Cancel & Return to Login</span>
              </button>
            ) : (
              <button type="button" onClick={() => handleBackToMobile(false)} className="back-step-link">
                <ArrowLeft size={16} />
                <span>Change Mobile Number</span>
              </button>
            )}
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="simple-login-wrapper">
      <div className="simple-login-layout">
        {/* Leadership & Initiative Showcase Card */}
        <div className="leader-showcase-card">
          <div className="leader-pill-badge">
            <span className="leader-pill-dot"></span>
            <span>{mlaData.initiativeTitleMr || mlaData.initiativeTitle || 'विशेष पुढाकार · Initiative'}</span>
          </div>

          <div className="leader-photo-frame">
            <img
              src={mlaData.photoUrl || leaderPhoto}
              alt={mlaData.name || "Hon. Shri Ravindra Chavan"}
              className="leader-photo-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = leaderPhoto;
              }}
            />
          </div>

          <div className="leader-details">
            <h2 className="leader-name-mr">{mlaData.nameMr || 'मा. ना. श्री. रवींद्र चव्हाण'}</h2>
            <p className="leader-name-en">{mlaData.name || 'Hon. Shri Ravindra Chavan'}</p>
            <p className="leader-designation">{mlaData.partyTitleMr || mlaData.partyTitle || 'State President of BJP Maharashtra'}</p>
          </div>

          <div className="leader-quote-box">
            <p className="leader-quote-text">
              "{mlaData.taglineMr || mlaData.tagline || mlaData.visionQuote || 'आपल्या आरोग्यासाठी, आम्ही वचनबद्ध.'}"
            </p>
            <span className="leader-quote-sub">{mlaData.quoteSub || 'आरोग्य संपन्न महाराष्ट्र अभियान'}</span>
          </div>
        </div>

        {/* Dynamic Multi-Step Login Card */}
        <div className="simple-login-card">
          {/* Brand Header */}
          <div className="simple-login-brand">
            <div className="simple-brand-logo-box">
              <img src={logoImg} alt="ArogyaMitra Logo" className="simple-brand-logo" />
            </div>
            <h1 className="simple-brand-title">ArogyaMitra</h1>
            <p className="simple-brand-subtitle">
              {step === STEPS.MOBILE && 'Sign in to access your portal'}
              {step === STEPS.PASSWORD && 'Enter your password to proceed'}
              {step === STEPS.OTP && (isResetPassword ? 'Reset your account password' : 'Verify your mobile number')}
              {step === STEPS.SET_PASSWORD && (isResetPassword ? 'Create your new password' : 'Set your new password')}
            </p>
          </div>

          {/* 5-Minute Security Lockout Active Banner with Live Countdown */}
          {lockoutTimer > 0 ? (
            <div className="login-lockout-banner">
              <div className="lockout-timer-header">
                <div className="lockout-timer-icon">⏳</div>
                <div className="lockout-timer-info">
                  <span className="lockout-timer-title">Account Locked (5/5 Failed Attempts)</span>
                  <span className="lockout-timer-countdown">
                    Please wait <strong>{formatLockoutTime(lockoutTimer)}</strong> before trying again for <strong>+91 {mobileNumber}</strong>.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleBackToMobile(true)}
                className="lockout-change-btn"
              >
                <RotateCcw size={14} />
                <span>Change / Enter Another Number</span>
              </button>
            </div>
          ) : (
            error && <div className="simple-login-error">{error}</div>
          )}

          {/* Info / Success Message */}
          {infoMessage && <div className="simple-login-info">{infoMessage}</div>}

          {/* Form based on dynamic step */}
          <div className="simple-form-container">
            {renderFormContent()}
          </div>

          {/* Card Footer */}
          <div className="simple-login-footer">
            <span>Protected Healthcare Gateway · City Care Hospital</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

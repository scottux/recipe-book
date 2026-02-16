import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function TwoFactorVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const tempToken = location.state?.tempToken;
  const username = location.state?.username;

  // Redirect if no temp token
  if (!tempToken) {
    navigate('/login');
    return null;
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (!verificationCode) {
      setError('Please enter a verification code');
      return;
    }

    if (!useBackupCode && verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      setLoading(true);

      // Call the login endpoint with 2FA code
      const response = await api.authAPI.login({
        username,
        password: '', // Password already verified
        twoFactorToken: verificationCode,
        tempToken,
      });

      // Use the login function from AuthContext
      login(response.data);
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (useBackupCode ? 'Invalid backup code' : 'Invalid verification code')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-cookbook-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-cookbook-paper border-2 border-cookbook-aged rounded-lg shadow-cookbook p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold text-cookbook-darkbrown">
              Two-Factor Authentication
            </h2>
            <p className="mt-2 text-cookbook-accent font-body">
              {useBackupCode
                ? 'Enter a backup code'
                : 'Enter the code from your authenticator app'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label htmlFor="code" className="sr-only">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern={useBackupCode ? undefined : '[0-9]*'}
                maxLength={useBackupCode ? 12 : 6}
                value={verificationCode}
                onChange={(e) => {
                  const value = useBackupCode
                    ? e.target.value.toUpperCase()
                    : e.target.value.replace(/\D/g, '');
                  setVerificationCode(value);
                }}
                placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
                className="w-full px-4 py-3 text-center text-2xl font-mono border-2 border-cookbook-aged rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent"
                required
                autoFocus
              />
              <p className="mt-2 text-sm text-cookbook-accent font-body text-center">
                {useBackupCode
                  ? 'Enter one of your backup codes'
                  : 'Enter the 6-digit code from your app'}
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cookbook-accent text-white px-6 py-3 rounded-lg font-body hover:bg-cookbook-darkbrown transition-colors border-2 border-cookbook-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setVerificationCode('');
                  setError('');
                }}
                className="w-full border-2 border-cookbook-aged text-cookbook-darkbrown px-6 py-3 rounded-lg font-body hover:bg-cookbook-cream transition-colors"
              >
                {useBackupCode ? 'Use Authenticator Code' : 'Use Backup Code'}
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full text-cookbook-accent font-body hover:text-cookbook-darkbrown transition-colors"
              >
                ← Back to Login
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-cookbook-aged">
            <p className="text-sm text-cookbook-accent font-body text-center">
              Lost access to your authenticator?{' '}
              <button
                onClick={() => {
                  setUseBackupCode(true);
                  setError('');
                }}
                className="text-cookbook-darkbrown hover:underline font-medium"
              >
                Use a backup code
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
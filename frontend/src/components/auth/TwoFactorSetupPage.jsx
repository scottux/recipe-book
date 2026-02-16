import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function TwoFactorSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [setupData, setSetupData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = async () => {
    try {
      setLoading(true);
      const response = await api.twoFactorAPI.setup();
      setSetupData(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      const response = await api.twoFactorAPI.verify({ token: verificationCode });
      setBackupCodes(response.data.backupCodes);
      setShowBackupCodes(true);
      setSuccess('Two-factor authentication has been enabled successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code');
    }
  };

  const handleFinish = () => {
    navigate('/account');
  };

  const handleDownloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-codes-${user.username}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cookbook-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cookbook-accent"></div>
      </div>
    );
  }

  if (showBackupCodes) {
    return (
      <div className="min-h-screen bg-cookbook-cream py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-cookbook-paper border-2 border-cookbook-aged rounded-lg shadow-cookbook p-8">
            <h2 className="text-3xl font-display font-bold text-cookbook-darkbrown mb-6">
              Save Your Backup Codes
            </h2>

            {success && (
              <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 font-body">
                {success}
              </div>
            )}

            <div className="bg-yellow-50 border-2 border-yellow-200 px-4 py-3 rounded-lg mb-6">
              <p className="text-yellow-800 font-body">
                <strong>Important:</strong> Save these backup codes in a safe place. 
                You can use each code once if you lose access to your authenticator app.
              </p>
            </div>

            <div className="bg-white border-2 border-cookbook-aged rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="bg-cookbook-cream px-3 py-2 rounded border border-cookbook-aged text-center"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleDownloadBackupCodes}
                className="flex-1 bg-cookbook-accent text-white px-6 py-3 rounded-lg font-body hover:bg-cookbook-darkbrown transition-colors border-2 border-cookbook-accent"
              >
                Download Codes
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 border-2 border-cookbook-aged text-cookbook-darkbrown px-6 py-3 rounded-lg font-body hover:bg-cookbook-cream transition-colors"
              >
                Continue to Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cookbook-cream py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-cookbook-paper border-2 border-cookbook-aged rounded-lg shadow-cookbook p-8">
          <h2 className="text-3xl font-display font-bold text-cookbook-darkbrown mb-6">
            Set Up Two-Factor Authentication
          </h2>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 font-body">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Step 1: Download Authenticator App */}
            <div className="bg-white border-2 border-cookbook-aged rounded-lg p-6">
              <h3 className="text-xl font-display font-bold text-cookbook-darkbrown mb-3">
                Step 1: Download an Authenticator App
              </h3>
              <p className="text-cookbook-accent font-body mb-4">
                Install an authenticator app on your phone if you haven't already:
              </p>
              <ul className="list-disc list-inside space-y-2 text-cookbook-accent font-body">
                <li>Google Authenticator (iOS, Android)</li>
                <li>Microsoft Authenticator (iOS, Android)</li>
                <li>Authy (iOS, Android, Desktop)</li>
              </ul>
            </div>

            {/* Step 2: Scan QR Code */}
            {setupData && (
              <div className="bg-white border-2 border-cookbook-aged rounded-lg p-6">
                <h3 className="text-xl font-display font-bold text-cookbook-darkbrown mb-3">
                  Step 2: Scan QR Code
                </h3>
                <p className="text-cookbook-accent font-body mb-4">
                  Open your authenticator app and scan this QR code:
                </p>
                <div className="flex justify-center mb-4">
                  <img
                    src={setupData.qrCode}
                    alt="2FA QR Code"
                    className="border-2 border-cookbook-aged rounded-lg"
                  />
                </div>
                <div className="bg-cookbook-cream border border-cookbook-aged rounded-lg p-4">
                  <p className="text-sm text-cookbook-accent font-body mb-2">
                    Or enter this code manually:
                  </p>
                  <code className="block text-center text-sm font-mono bg-white px-4 py-2 rounded border border-cookbook-aged break-all">
                    {setupData.secret}
                  </code>
                </div>
              </div>
            )}

            {/* Step 3: Verify Code */}
            <div className="bg-white border-2 border-cookbook-aged rounded-lg p-6">
              <h3 className="text-xl font-display font-bold text-cookbook-darkbrown mb-3">
                Step 3: Verify Code
              </h3>
              <p className="text-cookbook-accent font-body mb-4">
                Enter the 6-digit code from your authenticator app:
              </p>
              <form onSubmit={handleVerify}>
                <div className="mb-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="6"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 text-center text-2xl font-mono border-2 border-cookbook-aged rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent"
                    required
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => navigate('/account')}
                    className="flex-1 border-2 border-cookbook-aged text-cookbook-darkbrown px-6 py-3 rounded-lg font-body hover:bg-cookbook-cream transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-cookbook-accent text-white px-6 py-3 rounded-lg font-body hover:bg-cookbook-darkbrown transition-colors border-2 border-cookbook-accent"
                  >
                    Verify and Enable
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI, exportAPI, twoFactorAPI } from '../../services/api';

function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Email verification state
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableError, setDisableError] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  // Check 2FA status on mount
  useEffect(() => {
    const check2FAStatus = async () => {
      try {
        const response = await twoFactorAPI.getStatus();
        setTwoFactorEnabled(response.data.enabled);
      } catch (err) {
        console.error('Failed to check 2FA status:', err);
      } finally {
        setTwoFactorLoading(false);
      }
    };

    check2FAStatus();
  }, []);

  const handleResendVerification = async () => {
    setVerificationMessage('');
    setVerificationError('');
    setVerificationLoading(true);

    try {
      const response = await authAPI.sendVerificationEmail();
      setVerificationMessage(response.data.message || 'Verification email sent!');
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setVerificationMessage('');
      }, 5000);
    } catch (err) {
      setVerificationError(
        err.response?.data?.error || 'Failed to send verification email.'
      );
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setVerificationError('');
      }, 5000);
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setDisableError('');

    if (!disablePassword) {
      setDisableError('Password is required to disable 2FA.');
      return;
    }

    setDisableLoading(true);

    try {
      await twoFactorAPI.disable(disablePassword);
      setTwoFactorEnabled(false);
      setShowDisableModal(false);
      setDisablePassword('');
    } catch (err) {
      setDisableError(
        err.response?.data?.error || 'Failed to disable 2FA. Please try again.'
      );
    } finally {
      setDisableLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password.');
      return;
    }

    setPasswordLoading(true);

    try {
      await authAPI.updatePassword(currentPassword, newPassword);
      setPasswordSuccess('Password updated successfully!');
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(
        err.response?.data?.error || 'Failed to update password. Please try again.'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');

    if (!deletePassword) {
      setDeleteError('Password is required to delete your account.');
      return;
    }

    setDeleteLoading(true);

    try {
      await authAPI.deleteAccount(deletePassword);
      // Logout and redirect to home with message
      await logout();
      navigate('/', {
        state: {
          message: 'Your account has been permanently deleted.'
        }
      });
    } catch (err) {
      setDeleteError(
        err.response?.data?.error || 'Failed to delete account. Please try again.'
      );
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-cookbook-darkbrown mb-2">
          Account Settings
        </h1>
        <p className="text-cookbook-brown font-body">
          Manage your account preferences and security
        </p>
      </div>

      {/* Account Information */}
      <div className="bg-cookbook-paper rounded-lg shadow-lg border-2 border-cookbook-aged p-6 mb-6">
        <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-4">
          Account Information
        </h2>
        <div className="space-y-3 font-body text-cookbook-brown">
          <div>
            <span className="font-medium">Username:</span>{' '}
            <span>{user?.displayName || 'N/A'}</span>
          </div>
          <div>
            <span className="font-medium">Email:</span>{' '}
            <span>{user?.email || 'N/A'}</span>
          </div>
          
          {/* Email Verification Status */}
          <div className="pt-2">
            <span className="font-medium">Email Status:</span>{' '}
            {user?.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            ) : (
              <div className="inline-flex flex-col gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Not Verified
                </span>
                
                {verificationMessage && (
                  <div className="text-sm p-2 bg-green-50 border border-green-200 rounded text-green-800">
                    {verificationMessage}
                  </div>
                )}
                
                {verificationError && (
                  <div className="text-sm p-2 bg-red-50 border border-red-200 rounded text-red-800">
                    {verificationError}
                  </div>
                )}
                
                <button
                  onClick={handleResendVerification}
                  disabled={verificationLoading}
                  className="inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verificationLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Resend Verification Email
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
          <div className="text-sm text-gray-600 pt-1">
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-cookbook-paper rounded-lg shadow-lg border-2 border-cookbook-aged p-6 mb-6">
        <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-4">
          Two-Factor Authentication
        </h2>
        <p className="text-sm text-cookbook-brown font-body mb-4">
          Add an extra layer of security to your account with 2FA
        </p>

        {twoFactorLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cookbook-accent"></div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {twoFactorEnabled ? (
                <span className="text-3xl">🔒</span>
              ) : (
                <span className="text-3xl">🔓</span>
              )}
            </div>
            <div className="flex-1">
              <div className="mb-3">
                <span className="font-body font-medium text-cookbook-darkbrown">Status:</span>{' '}
                {twoFactorEnabled ? (
                  <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Disabled
                  </span>
                )}
              </div>
              <p className="text-sm text-cookbook-brown font-body mb-4">
                {twoFactorEnabled
                  ? 'Two-factor authentication is currently enabled. You will need your authenticator app to sign in.'
                  : 'Enable two-factor authentication to add an extra layer of security to your account.'}
              </p>
              {twoFactorEnabled ? (
                <button
                  onClick={() => setShowDisableModal(true)}
                  className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-body font-medium text-sm"
                >
                  Disable 2FA
                </button>
              ) : (
                <Link
                  to="/2fa/setup"
                  className="inline-block bg-cookbook-accent text-white py-2 px-4 rounded-lg hover:bg-cookbook-brown transition-colors font-body font-medium text-sm"
                >
                  Enable 2FA
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Data Management */}
      <div className="bg-cookbook-paper rounded-lg shadow-lg border-2 border-cookbook-aged p-6 mb-6">
        <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-4">
          Data Management
        </h2>
        <p className="text-sm text-cookbook-brown font-body mb-4">
          Export or import your recipes, collections, meal plans, and shopping lists
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          {/* Export Backup */}
          <div className="border-2 border-cookbook-aged rounded-lg p-4 hover:bg-cookbook-cream transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💾</span>
              <div className="flex-1">
                <h3 className="font-body font-semibold text-cookbook-darkbrown mb-1">
                  Export Backup
                </h3>
                <p className="text-sm text-cookbook-brown mb-3">
                  Download all your data as a backup file
                </p>
                <button
                  onClick={async () => {
                    try {
                      const response = await exportAPI.exportFullBackup();
                      const blob = new Blob([response.data], { type: 'application/json' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `recipe-book-backup-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Export failed:', error);
                      alert('Failed to export backup. Please try again.');
                    }
                  }}
                  className="text-sm bg-cookbook-accent text-white py-2 px-4 rounded-lg hover:bg-cookbook-brown transition-colors font-body font-medium"
                >
                  Export Now
                </button>
              </div>
            </div>
          </div>

          {/* Import Backup */}
          <div className="border-2 border-cookbook-aged rounded-lg p-4 hover:bg-cookbook-cream transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📥</span>
              <div className="flex-1">
                <h3 className="font-body font-semibold text-cookbook-darkbrown mb-1">
                  Import Backup
                </h3>
                <p className="text-sm text-cookbook-brown mb-3">
                  Restore your data from a backup file
                </p>
                <Link
                  to="/import-backup"
                  className="inline-block text-sm bg-cookbook-accent text-white py-2 px-4 rounded-lg hover:bg-cookbook-brown transition-colors font-body font-medium"
                >
                  Import Backup
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-cookbook-paper rounded-lg shadow-lg border-2 border-cookbook-aged p-6 mb-6">
        <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-4">
          Change Password
        </h2>

        {passwordSuccess && (
          <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <p className="text-green-800 text-sm font-body">{passwordSuccess}</p>
          </div>
        )}

        {passwordError && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-red-800 text-sm font-body">{passwordError}</p>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-cookbook-darkbrown font-body mb-2"
            >
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-cookbook-aged rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-cookbook-darkbrown font-body mb-2"
            >
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-cookbook-aged rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body"
              placeholder="Enter new password (min. 8 characters)"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-cookbook-darkbrown font-body mb-2"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-cookbook-aged rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="bg-cookbook-accent text-white py-2 px-6 rounded-lg hover:bg-cookbook-brown transition-colors font-body font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Danger Zone - Delete Account */}
      <div className="bg-red-50 rounded-lg shadow-lg border-2 border-red-300 p-6">
        <h2 className="text-2xl font-display font-bold text-red-800 mb-2">
          Danger Zone
        </h2>
        <h3 className="text-lg font-body font-semibold text-red-700 mb-3">
          Delete Account
        </h3>
        <p className="text-sm text-red-700 font-body mb-4">
          This action <strong>cannot be undone</strong>. All your recipes, collections,
          meal plans, and shopping lists will be permanently deleted.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-colors font-body font-medium shadow-md hover:shadow-lg"
        >
          Delete Account
        </button>
      </div>

      {/* Disable 2FA Confirmation Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <span className="text-4xl mr-3">🔓</span>
              <h3 className="text-2xl font-display font-bold text-cookbook-darkbrown">
                Disable Two-Factor Authentication
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-sm font-body text-gray-700 mb-4">
                Disabling 2FA will make your account less secure. You will no longer need an
                authenticator app to sign in.
              </p>

              {disableError && (
                <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm font-body">{disableError}</p>
                </div>
              )}

              <form onSubmit={handleDisable2FA}>
                <label
                  htmlFor="disablePassword"
                  className="block text-sm font-medium text-gray-700 font-body mb-2"
                >
                  Enter your password to confirm:
                </label>
                <input
                  id="disablePassword"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body mb-4"
                  placeholder="Enter your password"
                  autoFocus
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisableModal(false);
                      setDisablePassword('');
                      setDisableError('');
                    }}
                    disabled={disableLoading}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-body font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={disableLoading}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-body font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {disableLoading ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <span className="text-4xl mr-3">⚠️</span>
              <h3 className="text-2xl font-display font-bold text-red-800">
                Delete Account - Are You Sure?
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-sm font-body text-gray-700 mb-4">
                This action is <strong className="text-red-600">PERMANENT</strong> and{' '}
                <strong className="text-red-600">CANNOT be undone</strong>.
              </p>

              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-body text-red-800 font-semibold mb-2">
                  The following will be deleted:
                </p>
                <ul className="text-sm font-body text-red-700 list-disc list-inside space-y-1">
                  <li>Your user account</li>
                  <li>All your recipes</li>
                  <li>All your collections</li>
                  <li>All your meal plans</li>
                  <li>All your shopping lists</li>
                </ul>
              </div>

              {deleteError && (
                <div className="mb-4 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
                  <p className="text-red-800 text-sm font-body">{deleteError}</p>
                </div>
              )}

              <form onSubmit={handleDeleteAccount}>
                <label
                  htmlFor="deletePassword"
                  className="block text-sm font-medium text-gray-700 font-body mb-2"
                >
                  Enter your password to confirm:
                </label>
                <input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-body mb-4"
                  placeholder="Enter your password"
                  autoFocus
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                    disabled={deleteLoading}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-body font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-body font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountSettingsPage;
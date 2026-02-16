import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI, exportAPI } from '../../services/api';

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
          <div className="text-sm text-gray-600">
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>
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
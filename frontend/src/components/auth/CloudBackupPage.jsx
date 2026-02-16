import { useState, useEffect } from 'react';
import { cloudBackupAPI } from '../../services/api';

export default function CloudBackupPage() {
  const [status, setStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Backup preview modal
  const [previewData, setPreviewData] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Restore modal
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreBackupId, setRestoreBackupId] = useState(null);
  const [restoreMode, setRestoreMode] = useState('merge');
  const [restorePassword, setRestorePassword] = useState('');
  
  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    enabled: false,
    frequency: 'daily',
    time: '02:00'
  });

  useEffect(() => {
    loadData();
    checkOAuthCallback();
  }, []);

  const checkOAuthCallback = () => {
    const params = new URLSearchParams(window.location.search);
    const successParam = params.get('success');
    const provider = params.get('provider');
    const errorParam = params.get('error');

    if (successParam === 'true' && provider) {
      setSuccess(`Successfully connected to ${provider === 'dropbox' ? 'Dropbox' : 'Google Drive'}!`);
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname);
      loadData();
    } else if (errorParam) {
      setError(decodeURIComponent(errorParam));
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statusRes, backupsRes, scheduleRes] = await Promise.allSettled([
        cloudBackupAPI.getStatus(),
        cloudBackupAPI.listBackups(10),
        cloudBackupAPI.getSchedule()
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value.data);
      }

      if (backupsRes.status === 'fulfilled') {
        setBackups(backupsRes.value.data.backups || []);
      }

      if (scheduleRes.status === 'fulfilled' && scheduleRes.value.data.schedule) {
        setSchedule(scheduleRes.value.data.schedule);
        setScheduleForm({
          enabled: scheduleRes.value.data.schedule.enabled || false,
          frequency: scheduleRes.value.data.schedule.frequency || 'daily',
          time: scheduleRes.value.data.schedule.time || '02:00'
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDropbox = async () => {
    try {
      setError(null);
      const res = await cloudBackupAPI.initiateDropboxAuth();
      if (res.data.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate Dropbox connection');
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setError(null);
      const res = await cloudBackupAPI.initiateGoogleAuth();
      if (res.data.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate Google Drive connection');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect? This will disable automatic backups.')) {
      return;
    }

    try {
      setError(null);
      await cloudBackupAPI.disconnect();
      setSuccess('Cloud storage disconnected successfully');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disconnect');
    }
  };

  const handleCreateBackup = async () => {
    try {
      setError(null);
      setSuccess(null);
      const res = await cloudBackupAPI.createBackup();
      setSuccess(`Backup created successfully: ${res.data.backup.filename}`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create backup');
    }
  };

  const handleDeleteBackup = async (backupId, filename) => {
    if (!confirm(`Delete backup "${filename}"?`)) {
      return;
    }

    try {
      setError(null);
      await cloudBackupAPI.deleteBackup(backupId);
      setSuccess('Backup deleted successfully');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete backup');
    }
  };

  const handlePreviewBackup = async (backupId) => {
    try {
      setError(null);
      const res = await cloudBackupAPI.previewBackup(backupId);
      setPreviewData(res.data.preview);
      setShowPreviewModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to preview backup');
    }
  };

  const handleRestoreClick = (backupId) => {
    setRestoreBackupId(backupId);
    setRestoreMode('merge');
    setRestorePassword('');
    setShowRestoreModal(true);
  };

  const handleRestoreBackup = async () => {
    try {
      setError(null);
      setSuccess(null);
      const res = await cloudBackupAPI.restoreBackup(
        restoreBackupId,
        restoreMode,
        restorePassword || null
      );
      setSuccess(`Restore completed: ${res.data.message}`);
      setShowRestoreModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore backup');
    }
  };

  const handleScheduleClick = () => {
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async () => {
    try {
      setError(null);
      await cloudBackupAPI.updateSchedule(scheduleForm);
      setSuccess('Schedule updated successfully');
      setShowScheduleModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update schedule');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cookbook-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-cookbook-darkbrown mb-2">
          Cloud Backup
        </h1>
        <p className="text-cookbook-accent font-body">
          Automatically backup your recipes to Dropbox or Google Drive
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-lg font-body">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg font-body">
          {error}
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-cookbook-paper border-2 border-cookbook-aged rounded-lg shadow-card p-6 mb-6">
        <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-4">
          Connection Status
        </h2>

        {!status?.connected ? (
          <div>
            <p className="text-cookbook-accent font-body mb-4">
              No cloud storage connected. Connect one to enable automatic backups.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleConnectDropbox}
                className="flex items-center gap-2 bg-[#0061FF] text-white px-6 py-3 rounded-lg font-body font-medium hover:bg-[#0051D5] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 2L0 6l6 4 6-4-6-4zm12 0l-6 4 6 4 6-4-6-4zM0 14l6 4 6-4-6-4-6 4zm18 0l-6 4 6 4 6-4-6-4z"/>
                </svg>
                Connect Dropbox
              </button>
              
              <button
                onClick={handleConnectGoogle}
                className="flex items-center gap-2 bg-white text-gray-700 border-2 border-gray-300 px-6 py-3 rounded-lg font-body font-medium hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Connect Google Drive
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-lg font-body text-cookbook-darkbrown">
                  <span className="font-semibold">Provider:</span>{' '}
                  {status.provider === 'dropbox' ? 'Dropbox' : 'Google Drive'}
                </p>
                {status.accountEmail && (
                  <p className="text-cookbook-accent font-body">
                    {status.accountEmail}
                  </p>
                )}
              </div>
              <button
                onClick={handleDisconnect}
                className="text-red-600 hover:text-red-700 font-body font-medium px-4 py-2 border-2 border-red-600 hover:border-red-700 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>

            {/* Statistics */}
            {status.stats && (
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t-2 border-cookbook-aged">
                <div>
                  <p className="text-sm font-body text-cookbook-accent">Total Backups</p>
                  <p className="text-2xl font-display font-bold text-cookbook-darkbrown">
                    {status.stats.totalBackups || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-body text-cookbook-accent">Auto Backups</p>
                  <p className="text-2xl font-display font-bold text-cookbook-darkbrown">
                    {status.stats.autoBackups || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-body text-cookbook-accent">Storage Used</p>
                  <p className="text-2xl font-display font-bold text-cookbook-darkbrown">
                    {formatBytes(status.stats.totalStorageUsed || 0)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Backup Operations */}
      {status?.connected && (
        <>
          {/* Manual Backup & Schedule */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-cookbook-paper border-2 border-cookbook-aged rounded-lg shadow-card p-6">
              <h3 className="text-xl font-display font-bold text-cookbook-darkbrown mb-3">
                Manual Backup
              </h3>
              <p className="text-cookbook-accent font-body mb-4">
                Create an immediate backup of all your recipes.
              </p>
              <button
                onClick={handleCreateBackup}
                className="w-full bg-cookbook-accent text-white px-4 py-3 rounded-lg font-body font-medium hover:bg-cookbook-darkbrown transition-colors"
              >
                Create Backup Now
              </button>
            </div>

            <div className="bg-cookbook-paper border-2 border-cookbook-aged rounded-lg shadow-card p-6">
              <h3 className="text-xl font-display font-bold text-cookbook-darkbrown mb-3">
                Automatic Backups
              </h3>
              <p className="text-cookbook-accent font-body mb-4">
                Schedule: {schedule?.enabled ? `${schedule.frequency} at ${schedule.time}` : 'Disabled'}
              </p>
              <button
                onClick={handleScheduleClick}
                className="w-full border-2 border-cookbook-aged text-cookbook-darkbrown px-4 py-3 rounded-lg font-body font-medium hover:bg-cookbook-cream transition-colors"
              >
                Configure Schedule
              </button>
            </div>
          </div>

          {/* Backups List */}
          <div className="bg-cookbook-paper border-2 border-cookbook-aged rounded-lg shadow-card p-6">
            <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-4">
              Your Backups
            </h2>

            {backups.length === 0 ? (
              <p className="text-cookbook-accent font-body py-8 text-center">
                No backups yet. Create your first backup above.
              </p>
            ) : (
              <div className="space-y-3">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-4 border-2 border-cookbook-aged rounded-lg hover:bg-cookbook-cream transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-body font-medium text-cookbook-darkbrown">
                        {backup.name}
                      </p>
                      <p className="text-sm text-cookbook-accent font-body">
                        {formatDate(backup.created)} • {formatBytes(backup.size)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreviewBackup(backup.id)}
                        className="text-cookbook-accent hover:text-cookbook-darkbrown font-body text-sm px-3 py-1 border-2 border-cookbook-aged rounded hover:bg-cookbook-cream transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleRestoreClick(backup.id)}
                        className="text-cookbook-accent hover:text-cookbook-darkbrown font-body text-sm px-3 py-1 border-2 border-cookbook-aged rounded hover:bg-cookbook-cream transition-colors"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.id, backup.name)}
                        className="text-red-600 hover:text-red-700 font-body text-sm px-3 py-1 border-2 border-red-600 hover:border-red-700 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-cookbook-paper border-2 border-cookbook-aged rounded-lg shadow-cookbook max-w-md w-full p-6">
            <h3 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-4">
              Backup Preview
            </h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b border-cookbook-aged">
                <span className="font-body text-cookbook-accent">Recipes:</span>
                <span className="font-body font-medium text-cookbook-darkbrown">
                  {previewData.recipeCount}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-cookbook-aged">
                <span className="font-body text-cookbook-accent">Collections:</span>
                <span className="font-body font-medium text-cookbook-darkbrown">
                  {previewData.collectionCount}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-cookbook-aged">
                <span className="font-body text-cookbook-accent">Meal Plans:</span>
                <span className="font-body font-medium text-cookbook-darkbrown">
                  {previewData.mealPlanCount}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-body text-cookbook-accent">Shopping Lists:</span>
                <span className="font-body font-medium text-cookbook-darkbrown">
                  {previewData.shoppingListCount}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowPreviewModal(false)}
              className="w-full bg-cookbook-accent text-white px-4 py-2 rounded-lg font-body font-medium hover:bg-cookbook-darkbrown transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-cookbook-paper border-2 border-cookbook-aged rounded-lg shadow-cookbook max-w-md w-full p-6">
            <h3 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-4">
              Restore Backup
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-cookbook-darkbrown font-body font-medium mb-2">
                  Restore Mode
                </label>
                <select
                  value={restoreMode}
                  onChange={(e) => setRestoreMode(e.target.value)}
                  className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent"
                >
                  <option value="merge">Merge (keep existing + add from backup)</option>
                  <option value="replace">Replace (delete existing, restore from backup)</option>
                </select>
              </div>

              <div>
                <label className="block text-cookbook-darkbrown font-body font-medium mb-2">
                  Password (for verification)
                </label>
                <input
                  type="password"
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent"
                  required
                />
              </div>

              {restoreMode === 'replace' && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg font-body text-sm">
                  <strong>Warning:</strong> Replace mode will delete all existing recipes, collections, meal plans, and shopping lists before restoring from backup.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="flex-1 border-2 border-cookbook-aged text-cookbook-darkbrown px-4 py-2 rounded-lg font-body font-medium hover:bg-cookbook-cream transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreBackup}
                disabled={!restorePassword}
                className="flex-1 bg-cookbook-accent text-white px-4 py-2 rounded-lg font-body font-medium hover:bg-cookbook-darkbrown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-cookbook-paper border-2 border-cookbook-aged rounded-lg shadow-cookbook max-w-md w-full p-6">
            <h3 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-4">
              Configure Backup Schedule
            </h3>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="schedule-enabled"
                  checked={scheduleForm.enabled}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, enabled: e.target.checked })}
                  className="w-5 h-5 text-cookbook-accent border-2 border-cookbook-aged rounded focus:ring-2 focus:ring-cookbook-accent"
                />
                <label htmlFor="schedule-enabled" className="font-body font-medium text-cookbook-darkbrown">
                  Enable automatic backups
                </label>
              </div>

              {scheduleForm.enabled && (
                <>
                  <div>
                    <label className="block text-cookbook-darkbrown font-body font-medium mb-2">
                      Frequency
                    </label>
                    <select
                      value={scheduleForm.frequency}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                      className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-cookbook-darkbrown font-body font-medium mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                      className="w-full border-2 border-cookbook-aged rounded-lg px-4 py-2 font-body focus:ring-2 focus:ring-cookbook-accent focus:border-transparent"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 border-2 border-cookbook-aged text-cookbook-darkbrown px-4 py-2 rounded-lg font-body font-medium hover:bg-cookbook-cream transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                className="flex-1 bg-cookbook-accent text-white px-4 py-2 rounded-lg font-body font-medium hover:bg-cookbook-darkbrown transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { importAPI } from '../services/api';

export default function ImportPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('merge');
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (selectedFile) => {
    setError(null);
    setSuccess(null);
    setProgress(null);
    
    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Validate file type
    if (!selectedFile.name.endsWith('.json')) {
      setError('Only JSON files are supported');
      setFile(null);
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (selectedFile.size > maxSize) {
      setError('File size exceeds 50MB limit');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    if (requiresPassword && !password) {
      setError('Password is required for encrypted backups');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress('Uploading backup file...');

    try {
      const response = await importAPI.importBackup(
        file,
        mode,
        requiresPassword ? password : null
      );

      setProgress(null);
      setSuccess({
        message: response.data.message,
        summary: response.data.summary
      });
      
      // Clear form
      setFile(null);
      setPassword('');
      setRequiresPassword(false);
      
      // Reset file input
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      setProgress(null);
      console.error('Import error:', err);
      
      if (err.response?.data) {
        const { error: errorMessage, details } = err.response.data;
        
        // Check if password is required
        if (details?.code === 'INVALID_PASSWORD' && !requiresPassword) {
          setRequiresPassword(true);
          setError('This backup file is encrypted. Please enter the password.');
        } else {
          setError(errorMessage || 'Failed to import backup file');
          
          // Show additional details if available
          if (details?.duplicateCount > 0) {
            setError(prev => `${prev}\n\nNote: ${details.duplicateCount} duplicate items were skipped.`);
          }
        }
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          <span>←</span> Back
        </button>
        <h1 className="text-3xl font-bold mb-2">Import Backup</h1>
        <p className="text-gray-600">
          Restore your recipes, collections, meal plans, and shopping lists from a backup file
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Area */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Select Backup File</h2>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="text-gray-600">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-sm font-medium">
                  Drag and drop your backup file here, or
                </p>
              </div>
              
              <label
                htmlFor="file-input"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
              >
                Browse Files
              </label>
              <input
                id="file-input"
                type="file"
                accept=".json,application/json"
                onChange={(e) => handleFileChange(e.target.files[0])}
                className="hidden"
              />
              
              <p className="text-xs text-gray-500">
                Supported: JSON files up to 50MB
              </p>
            </div>
          </div>

          {file && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg
                  className="h-8 w-8 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleFileChange(null)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Import Mode Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Import Mode</h2>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="mode"
                value="merge"
                checked={mode === 'merge'}
                onChange={(e) => setMode(e.target.value)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Merge (Recommended)</div>
                <div className="text-sm text-gray-600">
                  Add imported items to your existing data. Duplicates will be skipped.
                  Your current recipes and collections remain intact.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="mode"
                value="replace"
                checked={mode === 'replace'}
                onChange={(e) => setMode(e.target.value)}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-red-600">Replace All Data</div>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-red-600">⚠️ Warning:</span> This will delete
                  all your current recipes, collections, meal plans, and shopping lists, replacing
                  them with the backup data.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Password Field (if required) */}
        {requiresPassword && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Backup Password</h2>
            <p className="text-sm text-gray-600 mb-4">
              This backup file is encrypted. Please enter the password that was used during export.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter backup password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-red-800 whitespace-pre-line">{error}</div>
            </div>
          </div>
        )}

        {/* Progress Message */}
        {progress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg
                className="animate-spin h-5 w-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <div className="text-blue-800">{progress}</div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div className="text-green-800 font-medium">{success.message}</div>
                {success.summary && (
                  <div className="mt-2 text-sm text-green-700">
                    <div>Imported:</div>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>{success.summary.recipes} recipes</li>
                      <li>{success.summary.collections} collections</li>
                      <li>{success.summary.mealPlans} meal plans</li>
                      <li>{success.summary.shoppingLists} shopping lists</li>
                    </ul>
                    {success.summary.duplicates > 0 && (
                      <div className="mt-2 text-yellow-700">
                        Note: {success.summary.duplicates} duplicate items were skipped
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || !file}
            className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors ${
              loading || !file
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'Importing...' : 'Import Backup'}
          </button>
          
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 border border-gray-300 rounded-md font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Information Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Important Information</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Only backup files created by this application (version 2.0.0 or higher) are supported</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>The import process may take several minutes for large backup files</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>In merge mode, items with identical titles will be treated as duplicates and skipped</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Rate limit: 5 imports per hour per account</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Create a new backup before using replace mode to avoid data loss</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
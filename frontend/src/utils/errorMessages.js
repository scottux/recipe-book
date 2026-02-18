/**
 * Error Message Translation Utility
 * Converts technical error messages into user-friendly format
 */

/**
 * Translate backup/cloud storage errors into user-friendly messages
 * @param {Error|Object} error - Error object from API call
 * @returns {Object} Translated error with title, message, and suggestion
 */
export function translateBackupError(error) {
  const rawMessage = error.response?.data?.message || error.message || 'Unknown error';
  const statusCode = error.response?.status;
  
  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
    return {
      title: 'Connection Failed',
      message: 'Could not connect to the server.',
      suggestion: 'Check your internet connection and try again.'
    };
  }
  
  // Timeout errors
  if (error.code === 'ECONNABORTED' || rawMessage.includes('timeout')) {
    return {
      title: 'Request Timed Out',
      message: 'The operation took too long to complete.',
      suggestion: 'This may be due to a large backup file or slow connection. Please try again.'
    };
  }
  
  // Authentication/Authorization errors
  if (statusCode === 401 || rawMessage.toLowerCase().includes('unauthorized')) {
    return {
      title: 'Authentication Required',
      message: 'Your session may have expired.',
      suggestion: 'Please log in again and try the operation.'
    };
  }
  
  if (statusCode === 403 || rawMessage.toLowerCase().includes('forbidden')) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      suggestion: 'Contact support if you believe this is an error.'
    };
  }
  
  // Cloud storage specific errors
  if (rawMessage.toLowerCase().includes('authentication failed') || 
      rawMessage.toLowerCase().includes('invalid credentials')) {
    return {
      title: 'Cloud Storage Authentication Error',
      message: 'Your cloud storage connection has expired or been revoked.',
      suggestion: 'Disconnect and reconnect your cloud storage account to restore access.'
    };
  }
  
  if (rawMessage.toLowerCase().includes('quota') || 
      rawMessage.toLowerCase().includes('storage full') ||
      rawMessage.toLowerCase().includes('insufficient space')) {
    return {
      title: 'Storage Quota Exceeded',
      message: 'Your cloud storage is full.',
      suggestion: 'Free up space in your cloud storage account and try again.'
    };
  }
  
  // Backup file errors
  if (rawMessage.toLowerCase().includes('invalid backup') ||
      rawMessage.toLowerCase().includes('corrupted') ||
      rawMessage.toLowerCase().includes('cannot parse')) {
    return {
      title: 'Invalid Backup File',
      message: 'The backup file is corrupted or incompatible.',
      suggestion: 'Try downloading a fresh backup from cloud storage, or contact support if the issue persists.'
    };
  }
  
  if (rawMessage.toLowerCase().includes('version') && 
      rawMessage.toLowerCase().includes('incompatible')) {
    return {
      title: 'Incompatible Backup Version',
      message: 'This backup was created with a different version of the application.',
      suggestion: 'Update to the latest version or use a more recent backup.'
    };
  }
  
  // Validation errors
  if (rawMessage.toLowerCase().includes('validation') || statusCode === 422) {
    return {
      title: 'Validation Error',
      message: rawMessage,
      suggestion: 'Please check your input and try again.'
    };
  }
  
  // Rate limiting
  if (statusCode === 429 || rawMessage.toLowerCase().includes('rate limit')) {
    return {
      title: 'Too Many Requests',
      message: 'You\'ve made too many requests in a short time.',
      suggestion: 'Please wait a few minutes before trying again.'
    };
  }
  
  // Server errors
  if (statusCode >= 500 || rawMessage.toLowerCase().includes('server error')) {
    return {
      title: 'Server Error',
      message: 'The server encountered an error processing your request.',
      suggestion: 'Please try again later. If the problem persists, contact support.'
    };
  }
  
  // Default fallback
  return {
    title: 'Operation Failed',
    message: rawMessage,
    suggestion: 'If the problem persists, please contact support.'
  };
}

/**
 * Translate OAuth errors from URL parameters
 * @param {string} errorParam - Error parameter from OAuth callback URL
 * @returns {Object} Translated error with title, message, and suggestion
 */
export function translateOAuthError(errorParam) {
  if (!errorParam) {
    return null;
  }
  
  const error = decodeURIComponent(errorParam);
  const lowerError = error.toLowerCase();
  
  // OAuth-specific error codes
  if (lowerError.includes('access_denied') || lowerError.includes('denied')) {
    return {
      title: 'Authorization Denied',
      message: 'You denied access to your cloud storage. Cloud backup requires permission to store your recipe backups.',
      suggestion: 'Try connecting again and click "Allow" when prompted.',
      canRetry: true
    };
  }
  
  if (lowerError.includes('invalid_grant') || lowerError.includes('expired')) {
    return {
      title: 'Authorization Expired',
      message: 'The authorization has expired or been revoked.',
      suggestion: 'Please try connecting again.',
      canRetry: true
    };
  }
  
  if (lowerError.includes('invalid_client') || lowerError.includes('invalid_request')) {
    return {
      title: 'Configuration Error',
      message: 'There\'s a problem with the cloud storage integration configuration.',
      suggestion: 'Please contact support to resolve this issue.',
      canRetry: false
    };
  }
  
  if (lowerError.includes('server_error') || lowerError.includes('temporarily_unavailable')) {
    return {
      title: 'Cloud Provider Error',
      message: 'The cloud storage provider is temporarily unavailable.',
      suggestion: 'Please try again in a few minutes.',
      canRetry: true
    };
  }
  
  // Generic OAuth error
  return {
    title: 'Connection Failed',
    message: error,
    suggestion: 'Please try connecting again. If the problem persists, contact support.',
    canRetry: true
  };
}

/**
 * Format error for display (combines title and message)
 * @param {Object} errorObj - Error object with title, message, suggestion
 * @returns {string} Formatted error message
 */
export function formatErrorMessage(errorObj) {
  if (!errorObj) return '';
  
  let formatted = errorObj.title ? `${errorObj.title}: ` : '';
  formatted += errorObj.message || 'An error occurred';
  
  return formatted;
}
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const EmailVerificationPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setError('No verification token provided.');
        return;
      }

      try {
        const response = await api.get(`/auth/verify-email/${token}`);
        
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
        
        // Auto-redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/recipes');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setError(
          err.response?.data?.error || 
          'Failed to verify email. Please try again.'
        );
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleResendEmail = async () => {
    try {
      await api.post('/auth/send-verification');
      setMessage('A new verification email has been sent.');
    } catch (err) {
      setError(
        err.response?.data?.error || 
        'Failed to send verification email. Please try again later.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-700 rounded-full mb-4">
            <span className="text-3xl">📖</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Recipe Book</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Status Icon */}
          <div className="text-center mb-6">
            {status === 'verifying' && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {status === 'success' && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            
            {status === 'error' && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="text-center">
            {status === 'verifying' && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Verifying Your Email
                </h2>
                <p className="text-gray-600">
                  Please wait while we verify your email address...
                </p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <h2 className="text-2xl font-bold text-green-600 mb-2">
                  Email Verified!
                </h2>
                <p className="text-gray-600 mb-6">
                  {message}
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Redirecting you to your recipes in 3 seconds...
                </p>
                <Link
                  to="/recipes"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-700 text-white rounded-lg hover:from-amber-700 hover:to-orange-800 transition-all duration-200 font-medium"
                >
                  Go to Dashboard
                </Link>
              </>
            )}
            
            {status === 'error' && (
              <>
                <h2 className="text-2xl font-bold text-red-600 mb-2">
                  Verification Failed
                </h2>
                <p className="text-gray-600 mb-6">
                  {error}
                </p>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  {error.includes('expired') || error.includes('invalid') ? (
                    <button
                      onClick={handleResendEmail}
                      className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-700 text-white rounded-lg hover:from-amber-700 hover:to-orange-800 transition-all duration-200 font-medium"
                    >
                      Resend Verification Email
                    </button>
                  ) : null}
                  
                  <Link
                    to="/recipes"
                    className="block w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
                  >
                    Go to Dashboard
                  </Link>
                  
                  <Link
                    to="/settings"
                    className="block text-sm text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    Visit Account Settings
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Success Message (for resend) */}
          {message && status === 'error' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 text-center">{message}</p>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a
              href="mailto:support@recipebook.com"
              className="text-amber-600 hover:text-amber-700 hover:underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
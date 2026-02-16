import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

/**
 * Forgot Password Page
 * 
 * Allows users to request a password reset link via email.
 * Features:
 * - Email validation
 * - Rate limiting feedback
 * - Success/error messaging
 * - Security-conscious UI (doesn't reveal if email exists)
 */
const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      
      if (response.data.success) {
        setSubmitted(true);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError(
          'Too many password reset requests. Please try again later.'
        );
      } else {
        setError(
          err.response?.data?.error || 
          'An error occurred. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Check Your Email
            </h2>
          </div>

          <div className="rounded-md bg-green-50 p-6 border border-green-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-green-400"
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
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Email Sent
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    If an account exists with <strong>{email}</strong>, you will receive a
                    password reset link shortly.
                  </p>
                  <p className="mt-2">
                    Please check your email and follow the instructions to reset your
                    password.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-2">Important:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>The reset link expires in 15 minutes</li>
                <li>Check your spam folder if you don't see the email</li>
                <li>You can only use the link once</li>
              </ul>
            </div>
          </div>

          <div className="text-center space-y-2">
            <Link
              to="/login"
              className="text-green-600 hover:text-green-500 font-medium"
            >
              Back to Login
            </Link>
            <div className="text-sm text-gray-600">
              or{' '}
              <button
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
                className="text-green-600 hover:text-green-500 font-medium"
              >
                request another link
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
              disabled={loading}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/login"
                className="font-medium text-green-600 hover:text-green-500"
              >
                Back to Login
              </Link>
            </div>
            <div className="text-sm">
              <Link
                to="/register"
                className="font-medium text-green-600 hover:text-green-500"
              >
                Create an account
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
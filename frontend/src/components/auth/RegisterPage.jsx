import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.displayName);
      // Show success message instead of immediate redirect
      setUserEmail(formData.email);
      setRegistrationSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="bg-cookbook-paper rounded-lg shadow-xl border-2 border-cookbook-aged p-8">
            {/* Success Icon */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-display font-bold text-cookbook-darkbrown mb-2">
                Account Created Successfully! 🎉
              </h2>
            </div>

            {/* Verification Message */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="font-body text-sm text-cookbook-darkbrown font-medium mb-2">
                    We've sent a verification email to:
                  </p>
                  <p className="font-body text-sm font-semibold text-cookbook-accent mb-3">
                    {userEmail}
                  </p>
                  <p className="font-body text-sm text-cookbook-brown">
                    Please check your inbox and click the verification link to complete your account setup.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/recipes')}
                className="w-full bg-cookbook-accent text-white py-3 px-4 rounded-lg hover:bg-cookbook-brown transition-colors font-body font-medium shadow-md hover:shadow-lg"
              >
                Go to Dashboard
              </button>
              
              <button
                onClick={() => {
                  setRegistrationSuccess(false);
                  setLoading(false);
                }}
                className="w-full bg-white text-cookbook-accent border-2 border-cookbook-accent py-3 px-4 rounded-lg hover:bg-amber-50 transition-colors font-body font-medium"
              >
                Resend Verification Email
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-cookbook-brown font-body">
                Didn't receive the email? Check your spam folder or click above to resend.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-cookbook-paper rounded-lg shadow-xl border-2 border-cookbook-aged p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold text-cookbook-darkbrown mb-2">
              Create Account
            </h2>
            <p className="text-cookbook-brown font-body">
              Start your recipe collection today
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-body">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-cookbook-darkbrown font-body mb-2"
              >
                Display Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border-2 border-cookbook-aged rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body"
                placeholder="Your Name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-cookbook-darkbrown font-body mb-2"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border-2 border-cookbook-aged rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-cookbook-darkbrown font-body mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border-2 border-cookbook-aged rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-cookbook-brown font-body">
                Minimum 6 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-cookbook-darkbrown font-body mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border-2 border-cookbook-aged rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cookbook-accent text-white py-3 px-4 rounded-lg hover:bg-cookbook-brown transition-colors font-body font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-cookbook-brown font-body">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-cookbook-accent hover:text-cookbook-darkbrown font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
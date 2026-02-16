import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function LoginPage() {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Get success message from navigation state (e.g., after password reset)
  const successMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-cookbook-paper rounded-lg shadow-xl border-2 border-cookbook-aged p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold text-cookbook-darkbrown mb-2">
              Welcome Back
            </h2>
            <p className="text-cookbook-brown font-body">
              Sign in to access your recipes
            </p>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <p className="text-green-800 text-sm font-body">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-body">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-cookbook-darkbrown font-body mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-cookbook-aged rounded-lg focus:outline-none focus:ring-2 focus:ring-cookbook-accent focus:border-transparent font-body"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-cookbook-darkbrown font-body"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-cookbook-accent hover:text-cookbook-darkbrown font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-cookbook-brown font-body">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-cookbook-accent hover:text-cookbook-darkbrown font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t-2 border-cookbook-aged">
            <p className="text-xs text-cookbook-brown font-body text-center">
              Demo: admin@recipebook.local / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
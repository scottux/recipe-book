import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import RecipeForm from './components/RecipeForm';
import AddRecipePage from './components/AddRecipePage';
import CollectionsPage from './components/CollectionsPage';
import CollectionDetail from './components/CollectionDetail';
import MealPlanningPage from './components/MealPlanningPage';
import ShoppingListsPage from './components/ShoppingListsPage';
import ShoppingListDetail from './components/ShoppingListDetail';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import EmailVerificationPage from './components/auth/EmailVerificationPage';
import AccountSettingsPage from './components/auth/AccountSettingsPage';
import TwoFactorSetupPage from './components/auth/TwoFactorSetupPage';
import TwoFactorVerifyPage from './components/auth/TwoFactorVerifyPage';
import ImportPage from './components/ImportPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import VerificationBanner from './components/VerificationBanner';

function AppContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addRecipeDropdownOpen, setAddRecipeDropdownOpen] = useState(false);
  const addRecipeDropdownRef = useRef(null);
  const { user, logout, isAuthenticated } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addRecipeDropdownRef.current && !addRecipeDropdownRef.current.contains(event.target)) {
        setAddRecipeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
      <div className="min-h-screen bg-cookbook-cream">
        {/* Verification Banner */}
        <VerificationBanner />
        
        {/* Header */}
        <header className="bg-cookbook-paper shadow-md border-b-2 border-cookbook-aged">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <Link 
                to="/" 
                className="flex items-center gap-2 group" 
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-2xl transition-transform group-hover:scale-110">📖</span>
                <h1 className="text-lg sm:text-xl font-display font-bold text-cookbook-darkbrown">
                  My Recipe Book
                </h1>
              </Link>
              
              {/* Desktop Navigation */}
              {isAuthenticated && (
                <nav className="hidden md:flex items-center gap-1">
                  <Link
                    to="/"
                    className="px-3 py-2 text-sm font-body font-medium text-cookbook-darkbrown hover:bg-cookbook-cream rounded-lg transition-colors"
                  >
                    Recipes
                  </Link>
                  <Link
                    to="/collections"
                    className="px-3 py-2 text-sm font-body font-medium text-cookbook-darkbrown hover:bg-cookbook-cream rounded-lg transition-colors"
                  >
                    Collections
                  </Link>
                  <Link
                    to="/meal-planning"
                    className="px-3 py-2 text-sm font-body font-medium text-cookbook-darkbrown hover:bg-cookbook-cream rounded-lg transition-colors"
                  >
                    Meal Plans
                  </Link>
                  <Link
                    to="/shopping-lists"
                    className="px-3 py-2 text-sm font-body font-medium text-cookbook-darkbrown hover:bg-cookbook-cream rounded-lg transition-colors"
                  >
                    Shopping
                  </Link>
                  
                  {/* Add Recipe Dropdown */}
                  <div className="relative" ref={addRecipeDropdownRef}>
                    <button
                      onClick={() => setAddRecipeDropdownOpen(!addRecipeDropdownOpen)}
                      className="px-4 py-2 text-sm font-body font-medium bg-cookbook-accent text-white rounded-lg hover:bg-cookbook-darkbrown transition-colors flex items-center gap-1"
                    >
                      + Add Recipe
                      <svg className={`w-4 h-4 transition-transform ${addRecipeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {addRecipeDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border-2 border-cookbook-aged z-50">
                        <div className="py-1">
                          <Link
                            to="/add?tab=create"
                            onClick={() => setAddRecipeDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm font-body text-cookbook-darkbrown hover:bg-cookbook-cream transition-colors"
                          >
                            <span className="text-lg">✍️</span>
                            <div>
                              <div className="font-medium">Create Manually</div>
                              <div className="text-xs text-cookbook-accent">Write your own recipe</div>
                            </div>
                          </Link>
                          <Link
                            to="/add?tab=import"
                            onClick={() => setAddRecipeDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm font-body text-cookbook-darkbrown hover:bg-cookbook-cream transition-colors"
                          >
                            <span className="text-lg">🔗</span>
                            <div>
                              <div className="font-medium">Import from URL</div>
                              <div className="text-xs text-cookbook-accent">Paste a recipe link</div>
                            </div>
                          </Link>
                          <Link
                            to="/add?tab=discover"
                            onClick={() => setAddRecipeDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm font-body text-cookbook-darkbrown hover:bg-cookbook-cream transition-colors"
                          >
                            <span className="text-lg">🔍</span>
                            <div>
                              <div className="font-medium">Discover Recipes</div>
                              <div className="text-xs text-cookbook-accent">Search online</div>
                            </div>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="h-6 w-px bg-cookbook-aged mx-2"></div>
                  
                  <Link
                    to="/account"
                    className="px-3 py-2 text-sm font-body font-medium text-cookbook-darkbrown hover:bg-cookbook-cream rounded-lg transition-colors"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="px-3 py-2 text-sm font-body font-medium text-cookbook-accent hover:text-cookbook-darkbrown transition-colors"
                  >
                    Logout
                  </button>
                </nav>
              )}

              {/* Mobile Menu Button */}
              {isAuthenticated && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg text-cookbook-darkbrown hover:bg-cookbook-cream transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              )}
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && isAuthenticated && (
              <nav className="md:hidden py-4 border-t border-cookbook-aged">
                <div className="flex flex-col gap-1">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 text-sm font-body font-medium text-cookbook-darkbrown hover:bg-cookbook-cream rounded-lg transition-colors"
                  >
                    Recipes
                  </Link>
                  <Link
                    to="/collections"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 text-sm font-body font-medium text-cookbook-darkbrown hover:bg-cookbook-cream rounded-lg transition-colors"
                  >
                    Collections
                  </Link>
                  <Link
                    to="/meal-planning"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 text-sm font-body font-medium text-cookbook-darkbrown hover:bg-cookbook-cream rounded-lg transition-colors"
                  >
                    Meal Plans
                  </Link>
                  <Link
                    to="/shopping-lists"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 text-sm font-body font-medium text-cookbook-darkbrown hover:bg-cookbook-cream rounded-lg transition-colors"
                  >
                    Shopping
                  </Link>
                  <div className="border-t border-cookbook-aged my-2"></div>
                  <Link
                    to="/add"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 text-sm font-body font-medium bg-cookbook-accent text-white rounded-lg hover:bg-cookbook-darkbrown transition-colors text-center"
                  >
                    + Add Recipe
                  </Link>
                  <Link
                    to="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 text-sm font-body font-medium text-cookbook-darkbrown hover:bg-cookbook-cream rounded-lg transition-colors"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-2 text-sm font-body font-medium text-cookbook-accent hover:text-cookbook-darkbrown transition-colors text-left"
                  >
                    Logout
                  </button>
                </div>
              </nav>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email/:token" element={<EmailVerificationPage />} />
            <Route path="/2fa/verify" element={<TwoFactorVerifyPage />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/2fa/setup" element={<TwoFactorSetupPage />} />
            </Route>
            
            {/* Other protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<RecipeList />} />
              <Route path="/recipe/:id" element={<RecipeDetail />} />
              <Route path="/add" element={<AddRecipePage />} />
              <Route path="/edit/:id" element={<RecipeForm />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/collections/:id" element={<CollectionDetail />} />
              <Route path="/meal-planning" element={<MealPlanningPage />} />
              <Route path="/shopping-lists" element={<ShoppingListsPage />} />
              <Route path="/shopping-lists/:id" element={<ShoppingListDetail />} />
              <Route path="/account" element={<AccountSettingsPage />} />
              <Route path="/import-backup" element={<ImportPage />} />
              {/* Redirect old routes to new unified page */}
              <Route path="/search" element={<Navigate to="/add?tab=discover" replace />} />
              <Route path="/import" element={<Navigate to="/add?tab=import" replace />} />
            </Route>
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-cookbook-paper border-t-2 border-cookbook-brown mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-cookbook-accent text-sm font-body">
            <p className="italic">Preserving family recipes, one dish at a time</p>
          </div>
        </footer>
      </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AccountSettingsPage from '../AccountSettingsPage';
import * as AuthContextModule from '../../../context/AuthContext';
import { authAPI, exportAPI, twoFactorAPI } from '../../../services/api';

// Mock the API modules
vi.mock('../../../services/api', () => ({
  authAPI: {
    updatePassword: vi.fn(),
    deleteAccount: vi.fn(),
    sendVerificationEmail: vi.fn(),
    updateTimezone: vi.fn()
  },
  exportAPI: {
    exportFullBackup: vi.fn()
  },
  twoFactorAPI: {
    getStatus: vi.fn(),
    disable: vi.fn()
  }
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock the AuthContext
const mockUseAuth = vi.fn();
vi.spyOn(AuthContextModule, 'useAuth').mockImplementation(mockUseAuth);

const mockUser = {
  _id: '123',
  displayName: 'testuser',
  email: 'test@example.com',
  emailVerified: true,
  timezone: 'America/New_York',
  createdAt: '2025-01-01T00:00:00.000Z'
};

const mockLogout = vi.fn();

const renderComponent = (user = mockUser, authOverrides = {}) => {
  mockUseAuth.mockReturnValue({
    user,
    logout: mockLogout,
    ...authOverrides
  });
  
  return render(
    <BrowserRouter>
      <AccountSettingsPage />
    </BrowserRouter>
  );
};

describe('AccountSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    twoFactorAPI.getStatus.mockResolvedValue({ data: { enabled: false } });
  });

  // CRITICAL: Rendering tests (Bug Location)
  it('renders without crashing', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });
  });

  it('renders with default props', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
      expect(screen.getByText('Account Information')).toBeInTheDocument();
    });
  });

  it('displays user information', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('shows email verified status', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });

  it('shows unverified email status', async () => {
    const unverifiedUser = { ...mockUser, emailVerified: false };
    renderComponent(unverifiedUser);
    
    await waitFor(() => {
      expect(screen.getByText('Not Verified')).toBeInTheDocument();
    });
  });

  it('displays member since date', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Member since/i)).toBeInTheDocument();
    });
  });

  // Password change tests
  it('validates password length', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });
    
    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const newPasswordInput = screen.getByLabelText(/^New Password$/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);
    
    await user.type(currentPasswordInput, 'oldpass123');
    await user.type(newPasswordInput, 'short');
    await user.type(confirmPasswordInput, 'short');
    
    const updateButton = screen.getByRole('button', { name: /Update Password/i });
    await user.click(updateButton);
    
    expect(await screen.findByText(/must be at least 8 characters/i)).toBeInTheDocument();
  });

  it('validates password match', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });
    
    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const newPasswordInput = screen.getByLabelText(/^New Password$/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);
    
    await user.type(currentPasswordInput, 'oldpass123');
    await user.type(newPasswordInput, 'newpass123');
    await user.type(confirmPasswordInput, 'different123');
    
    const updateButton = screen.getByRole('button', { name: /Update Password/i });
    await user.click(updateButton);
    
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('validates new password is different', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });
    
    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const newPasswordInput = screen.getByLabelText(/^New Password$/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);
    
    await user.type(currentPasswordInput, 'samepass123');
    await user.type(newPasswordInput, 'samepass123');
    await user.type(confirmPasswordInput, 'samepass123');
    
    const updateButton = screen.getByRole('button', { name: /Update Password/i });
    await user.click(updateButton);
    
    expect(await screen.findByText(/must be different from current password/i)).toBeInTheDocument();
  });

  it('updates password successfully', async () => {
    const user = userEvent.setup();
    authAPI.updatePassword.mockResolvedValue({ data: { success: true } });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });
    
    const currentPasswordInput = screen.getByLabelText(/Current Password/i);
    const newPasswordInput = screen.getByLabelText(/^New Password$/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);
    
    await user.type(currentPasswordInput, 'oldpass123');
    await user.type(newPasswordInput, 'newpass123');
    await user.type(confirmPasswordInput, 'newpass123');
    
    const updateButton = screen.getByRole('button', { name: /Update Password/i });
    await user.click(updateButton);
    
    await waitFor(() => {
      expect(authAPI.updatePassword).toHaveBeenCalledWith('oldpass123', 'newpass123');
    });
    
    expect(await screen.findByText(/Password updated successfully/i)).toBeInTheDocument();
  });

  // Delete account tests
  it('opens delete modal when delete button clicked', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    await user.click(deleteButton);
    
    expect(screen.getByText(/Delete Account - Are You Sure/i)).toBeInTheDocument();
  });

  it('closes delete modal when cancel clicked', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });
    
    const deleteButton = screen.getByRole('button', { name: /Delete Account/i });
    await user.click(deleteButton);
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/Delete Account - Are You Sure/i)).not.toBeInTheDocument();
    });
  });

  // 2FA tests
  it('displays 2FA status', async () => {
    twoFactorAPI.getStatus.mockResolvedValue({ data: { enabled: false } });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  it('shows loading state for 2FA', async () => {
    twoFactorAPI.getStatus.mockReturnValue(new Promise(() => {})); // Never resolves
    
    const { container } = renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    });
    
    // Loading spinner should be visible
    const spinners = container.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('shows enable 2FA button when disabled', async () => {
    twoFactorAPI.getStatus.mockResolvedValue({ data: { enabled: false } });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Enable 2FA')).toBeInTheDocument();
    });
  });

  it('shows disable 2FA button when enabled', async () => {
    twoFactorAPI.getStatus.mockResolvedValue({ data: { enabled: true } });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Disable 2FA')).toBeInTheDocument();
    });
  });

  // Email verification tests
  it('shows resend verification button for unverified email', async () => {
    const unverifiedUser = { ...mockUser, emailVerified: false };
    renderComponent(unverifiedUser);
    
    await waitFor(() => {
      expect(screen.getByText(/Resend Verification Email/i)).toBeInTheDocument();
    });
  });

  it('sends verification email', async () => {
    const user = userEvent.setup();
    const unverifiedUser = { ...mockUser, emailVerified: false };
    authAPI.sendVerificationEmail.mockResolvedValue({ 
      data: { message: 'Email sent!' } 
    });
    
    renderComponent(unverifiedUser);
    
    await waitFor(() => {
      expect(screen.getByText(/Resend Verification Email/i)).toBeInTheDocument();
    });
    
    const resendButton = screen.getByText(/Resend Verification Email/i);
    await user.click(resendButton);
    
    await waitFor(() => {
      expect(authAPI.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  // Timezone tests - THIS IS WHERE THE BUG WAS
  it('renders timezone selector without crashing', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Timezone Preferences')).toBeInTheDocument();
    });
    
    // TimezoneSelector should render with combobox
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThan(0);
  });

  it('updates timezone', async () => {
    const user = userEvent.setup();
    authAPI.updateTimezone.mockResolvedValue({ data: { success: true } });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Timezone Preferences')).toBeInTheDocument();
    });
    
    const timezoneSelect = screen.getByRole('combobox');
    await user.selectOptions(timezoneSelect, 'America/Chicago');
    
    const saveButton = screen.getByRole('button', { name: /Save Timezone/i });
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(authAPI.updateTimezone).toHaveBeenCalledWith('America/Chicago');
    });
  });

  // Data management tests
  it('displays export backup button', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Export Backup')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export Now/i })).toBeInTheDocument();
    });
  });

  it('displays import backup link', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getAllByText('Import Backup').length).toBeGreaterThan(0);
    });
  });

  // Edge case tests
  it('handles null user gracefully', async () => {
    renderComponent(null);
    
    // Should not crash
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });
  });

  it('handles undefined user gracefully', async () => {
    renderComponent(undefined);
    
    // Should not crash
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });
  });

  it('handles missing user fields gracefully', async () => {
    const incompleteUser = {
      _id: '123'
      // Missing displayName, email, etc.
    };
    
    renderComponent(incompleteUser);
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
      // There will be multiple N/A values for missing fields
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    });
  });

  it('handles API errors for 2FA status', async () => {
    twoFactorAPI.getStatus.mockRejectedValue(new Error('Network error'));
    
    renderComponent();
    
    // Should not crash, should finish loading
    await waitFor(() => {
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    });
  });

  it('disables save timezone button when unchanged', async () => {
    renderComponent();
    
    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /Save Timezone/i });
      expect(saveButton).toBeDisabled();
    });
  });

  it('enables save timezone button when changed', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Timezone Preferences')).toBeInTheDocument();
    });
    
    const timezoneSelect = screen.getByRole('combobox');
    await user.selectOptions(timezoneSelect, 'America/Chicago');
    
    const saveButton = screen.getByRole('button', { name: /Save Timezone/i });
    expect(saveButton).not.toBeDisabled();
  });
});
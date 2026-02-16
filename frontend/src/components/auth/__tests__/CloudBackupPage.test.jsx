import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CloudBackupPage from '../CloudBackupPage';
import { cloudBackupAPI } from '../../../services/api';

// Mock the API
vi.mock('../../../services/api', () => ({
  cloudBackupAPI: {
    getStatus: vi.fn(),
    listBackups: vi.fn(),
    getSchedule: vi.fn(),
    initiateDropboxAuth: vi.fn(),
    initiateGoogleAuth: vi.fn(),
    disconnect: vi.fn(),
    createBackup: vi.fn(),
    deleteBackup: vi.fn(),
    previewBackup: vi.fn(),
    restoreBackup: vi.fn(),
    updateSchedule: vi.fn(),
  },
}));

// Mock window.confirm
global.confirm = vi.fn();

// Mock window.location
delete window.location;
window.location = { href: '', search: '', pathname: '/' };
window.history.replaceState = vi.fn();

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <CloudBackupPage />
    </BrowserRouter>
  );
};

describe('CloudBackupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.search = '';
    global.confirm.mockReturnValue(false);
  });

  describe('Initial Loading', () => {
    it('should show loading spinner initially', () => {
      cloudBackupAPI.getStatus.mockResolvedValue({ data: { connected: false } });
      cloudBackupAPI.listBackups.mockResolvedValue({ data: { backups: [] } });
      cloudBackupAPI.getSchedule.mockResolvedValue({ data: {} });

      renderComponent();
      
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('should load data on mount', async () => {
      cloudBackupAPI.getStatus.mockResolvedValue({
        data: { connected: false, provider: null },
      });
      cloudBackupAPI.listBackups.mockResolvedValue({
        data: { backups: [] },
      });
      cloudBackupAPI.getSchedule.mockResolvedValue({
        data: { schedule: null },
      });

      renderComponent();

      await waitFor(() => {
        expect(cloudBackupAPI.getStatus).toHaveBeenCalled();
        expect(cloudBackupAPI.listBackups).toHaveBeenCalledWith(10);
        expect(cloudBackupAPI.getSchedule).toHaveBeenCalled();
      });
    });
  });

  describe('Not Connected State', () => {
    beforeEach(async () => {
      cloudBackupAPI.getStatus.mockResolvedValue({
        data: { connected: false, provider: null },
      });
      cloudBackupAPI.listBackups.mockResolvedValue({
        data: { backups: [] },
      });
      cloudBackupAPI.getSchedule.mockResolvedValue({
        data: {},
      });
    });

    it('should show connection options when not connected', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No cloud storage connected. Connect one to enable automatic backups.')).toBeInTheDocument();
        expect(screen.getByText('Connect Dropbox')).toBeInTheDocument();
        expect(screen.getByText('Connect Google Drive')).toBeInTheDocument();
      });
    });

    it('should initiate Dropbox auth when clicked', async () => {
      cloudBackupAPI.initiateDropboxAuth.mockResolvedValue({
        data: { authUrl: 'https://dropbox.com/auth' },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Connect Dropbox')).toBeInTheDocument();
      });

      const dropboxButton = screen.getByText('Connect Dropbox');
      fireEvent.click(dropboxButton);

      await waitFor(() => {
        expect(cloudBackupAPI.initiateDropboxAuth).toHaveBeenCalled();
        expect(window.location.href).toBe('https://dropbox.com/auth');
      });
    });

    it('should initiate Google Drive auth when clicked', async () => {
      cloudBackupAPI.initiateGoogleAuth.mockResolvedValue({
        data: { authUrl: 'https://accounts.google.com/auth' },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Connect Google Drive')).toBeInTheDocument();
      });

      const googleButton = screen.getByText('Connect Google Drive');
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(cloudBackupAPI.initiateGoogleAuth).toHaveBeenCalled();
        expect(window.location.href).toBe('https://accounts.google.com/auth');
      });
    });

    it('should handle auth initiation errors', async () => {
      cloudBackupAPI.initiateDropboxAuth.mockRejectedValue({
        response: { data: { message: 'Auth failed' } },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Connect Dropbox')).toBeInTheDocument();
      });

      const dropboxButton = screen.getByText('Connect Dropbox');
      fireEvent.click(dropboxButton);

      await waitFor(() => {
        expect(screen.getByText('Auth failed')).toBeInTheDocument();
      });
    });
  });

  describe('Connected State - Dropbox', () => {
    beforeEach(() => {
      cloudBackupAPI.getStatus.mockResolvedValue({
        data: {
          connected: true,
          provider: 'dropbox',
          accountEmail: 'user@dropbox.com',
          stats: {
            totalBackups: 5,
            autoBackups: 3,
            totalStorageUsed: 2048000,
          },
        },
      });
      cloudBackupAPI.listBackups.mockResolvedValue({
        data: {
          backups: [
            {
              id: 'id:backup_1',
              name: 'recipe-book-manual-backup-2026-02-15.zip',
              created: '2026-02-15T10:00:00Z',
              size: 1024000,
            },
          ],
        },
      });
      cloudBackupAPI.getSchedule.mockResolvedValue({
        data: {
          schedule: {
            enabled: true,
            frequency: 'daily',
            time: '02:00',
          },
        },
      });
    });

    it('should display connection status for Dropbox', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Dropbox')).toBeInTheDocument();
        expect(screen.getByText('user@dropbox.com')).toBeInTheDocument();
      });
    });

    it('should display statistics', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // totalBackups
        expect(screen.getByText('3')).toBeInTheDocument(); // autoBackups
        expect(screen.getByText('1.95 MB')).toBeInTheDocument(); // storage
      });
    });

    it('should display schedule information', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/daily at 02:00/)).toBeInTheDocument();
      });
    });

    it('should handle disconnect', async () => {
      global.confirm.mockReturnValue(true);
      cloudBackupAPI.disconnect.mockResolvedValue({
        data: { message: 'Disconnected' },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeInTheDocument();
      });

      const disconnectButton = screen.getByText('Disconnect');
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
        expect(cloudBackupAPI.disconnect).toHaveBeenCalled();
      });
    });

    it('should not disconnect if user cancels', async () => {
      global.confirm.mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeInTheDocument();
      });

      const disconnectButton = screen.getByText('Disconnect');
      fireEvent.click(disconnectButton);

      expect(global.confirm).toHaveBeenCalled();
      expect(cloudBackupAPI.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Connected State - Google Drive', () => {
    beforeEach(() => {
      cloudBackupAPI.getStatus.mockResolvedValue({
        data: {
          connected: true,
          provider: 'google',
          accountEmail: 'user@gmail.com',
          stats: {
            totalBackups: 3,
            autoBackups: 2,
            totalStorageUsed: 1536000,
          },
        },
      });
      cloudBackupAPI.listBackups.mockResolvedValue({
        data: { backups: [] },
      });
      cloudBackupAPI.getSchedule.mockResolvedValue({
        data: {
          schedule: {
            enabled: false,
            frequency: 'weekly',
            time: '03:00',
          },
        },
      });
    });

    it('should display connection status for Google Drive', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Google Drive')).toBeInTheDocument();
        expect(screen.getByText('user@gmail.com')).toBeInTheDocument();
      });
    });
  });

  describe('Backup Operations', () => {
    beforeEach(() => {
      cloudBackupAPI.getStatus.mockResolvedValue({
        data: { connected: true, provider: 'dropbox' },
      });
      cloudBackupAPI.listBackups.mockResolvedValue({
        data: {
          backups: [
            {
              id: 'id:backup_1',
              name: 'backup-1.zip',
              created: '2026-02-15T10:00:00Z',
              size: 1024,
            },
          ],
        },
      });
      cloudBackupAPI.getSchedule.mockResolvedValue({
        data: { schedule: null },
      });
    });

    it('should create manual backup', async () => {
      cloudBackupAPI.createBackup.mockResolvedValue({
        data: {
          backup: {
            filename: 'new-backup.zip',
          },
          message: 'Backup created successfully',
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Create Backup Now')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create Backup Now');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(cloudBackupAPI.createBackup).toHaveBeenCalled();
        expect(screen.getByText(/Backup created successfully/)).toBeInTheDocument();
      });
    });

    it('should display backup list', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('backup-1.zip')).toBeInTheDocument();
        expect(screen.getByText('1 KB')).toBeInTheDocument();
      });
    });

    it('should preview backup', async () => {
      cloudBackupAPI.previewBackup.mockResolvedValue({
        data: {
          preview: {
            recipeCount: 10,
            collectionCount: 2,
            mealPlanCount: 3,
            shoppingListCount: 1,
          },
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeInTheDocument();
      });

      const previewButton = screen.getByText('Preview');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(cloudBackupAPI.previewBackup).toHaveBeenCalledWith('id:backup_1');
        expect(screen.getByText('Backup Preview')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument(); // recipeCount
      });
    });

    it('should close preview modal', async () => {
      cloudBackupAPI.previewBackup.mockResolvedValue({
        data: {
          preview: {
            recipeCount: 10,
            collectionCount: 2,
            mealPlanCount: 3,
            shoppingListCount: 1,
          },
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeInTheDocument();
      });

      // Open modal
      const previewButton = screen.getByText('Preview');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('Backup Preview')).toBeInTheDocument();
      });

      // Close modal
      const closeButtons = screen.getAllByText('Close');
      fireEvent.click(closeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Backup Preview')).not.toBeInTheDocument();
      });
    });

    it('should open restore modal', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Restore')).toBeInTheDocument();
      });

      const restoreButton = screen.getByText('Restore');
      fireEvent.click(restoreButton);

      await waitFor(() => {
        expect(screen.getByText('Restore Backup')).toBeInTheDocument();
        expect(screen.getByText('Restore Mode')).toBeInTheDocument();
      });
    });

    it('should restore backup in merge mode', async () => {
      cloudBackupAPI.restoreBackup.mockResolvedValue({
        data: { message: 'Restore completed successfully' },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Restore')).toBeInTheDocument();
      });

      // Open restore modal
      const restoreButton = screen.getByText('Restore');
      fireEvent.click(restoreButton);

      await waitFor(() => {
        expect(screen.getByText('Restore Backup')).toBeInTheDocument();
      });

      // Fill password
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      fireEvent.change(passwordInput, { target: { value: 'TestPassword123!' } });

      // Click restore (second button in modal)
      const restoreButtons = screen.getAllByText('Restore');
      fireEvent.click(restoreButtons[1]);

      await waitFor(() => {
        expect(cloudBackupAPI.restoreBackup).toHaveBeenCalledWith(
          'id:backup_1',
          'merge',
          'TestPassword123!'
        );
      });
    });

    it('should delete backup with confirmation', async () => {
      global.confirm.mockReturnValue(true);
      cloudBackupAPI.deleteBackup.mockResolvedValue({
        data: { message: 'Deleted' },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
        expect(cloudBackupAPI.deleteBackup).toHaveBeenCalledWith('id:backup_1');
      });
    });

    it('should not delete backup if user cancels', async () => {
      global.confirm.mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(global.confirm).toHaveBeenCalled();
      expect(cloudBackupAPI.deleteBackup).not.toHaveBeenCalled();
    });
  });

  describe('Schedule Management', () => {
    beforeEach(() => {
      cloudBackupAPI.getStatus.mockResolvedValue({
        data: { connected: true, provider: 'dropbox' },
      });
      cloudBackupAPI.listBackups.mockResolvedValue({
        data: { backups: [] },
      });
      cloudBackupAPI.getSchedule.mockResolvedValue({
        data: {
          schedule: {
            enabled: false,
            frequency: 'weekly',
            time: '02:00',
          },
        },
      });
    });

    it('should open schedule modal', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Configure Schedule')).toBeInTheDocument();
      });

      const configButton = screen.getByText('Configure Schedule');
      fireEvent.click(configButton);

      await waitFor(() => {
        expect(screen.getByText('Configure Backup Schedule')).toBeInTheDocument();
        expect(screen.getByText('Enable automatic backups')).toBeInTheDocument();
      });
    });

    it('should update schedule', async () => {
      cloudBackupAPI.updateSchedule.mockResolvedValue({
        data: {
          schedule: {
            enabled: true,
            frequency: 'daily',
            time: '03:00',
          },
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Configure Schedule')).toBeInTheDocument();
      });

      // Open modal
      const configButton = screen.getByText('Configure Schedule');
      fireEvent.click(configButton);

      await waitFor(() => {
        expect(screen.getByText('Configure Backup Schedule')).toBeInTheDocument();
      });

      // Enable schedule
      const enableCheckbox = screen.getByLabelText('Enable automatic backups');
      fireEvent.click(enableCheckbox);

      // Change frequency
      const frequencySelect = screen.getByDisplayValue('weekly');
      fireEvent.change(frequencySelect, { target: { value: 'daily' } });

      // Save
      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);

      await waitFor(() => {
        expect(cloudBackupAPI.updateSchedule).toHaveBeenCalledWith({
          enabled: true,
          frequency: 'daily',
          time: '02:00',
        });
      });
    });
  });

  describe('OAuth Callback Handling', () => {
    it('should handle successful Dropbox OAuth callback', async () => {
      window.location.search = '?success=true&provider=dropbox';

      cloudBackupAPI.getStatus.mockResolvedValue({
        data: { connected: true, provider: 'dropbox' },
      });
      cloudBackupAPI.listBackups.mockResolvedValue({
        data: { backups: [] },
      });
      cloudBackupAPI.getSchedule.mockResolvedValue({
        data: {},
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Successfully connected to Dropbox!/)).toBeInTheDocument();
        expect(window.history.replaceState).toHaveBeenCalled();
      });
    });

    it('should handle successful Google Drive OAuth callback', async () => {
      window.location.search = '?success=true&provider=google';

      cloudBackupAPI.getStatus.mockResolvedValue({
        data: { connected: true, provider: 'google' },
      });
      cloudBackupAPI.listBackups.mockResolvedValue({
        data: { backups: [] },
      });
      cloudBackupAPI.getSchedule.mockResolvedValue({
        data: {},
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Successfully connected to Google Drive!/)).toBeInTheDocument();
      });
    });

    it('should handle OAuth error callback', async () => {
      window.location.search = '?error=Connection%20failed';

      cloudBackupAPI.getStatus.mockResolvedValue({
        data: { connected: false },
      });
      cloudBackupAPI.listBackups.mockResolvedValue({
        data: { backups: [] },
      });
      cloudBackupAPI.getSchedule.mockResolvedValue({
        data: {},
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no backups', async () => {
      cloudBackupAPI.getStatus.mockResolvedValue({
        data: { connected: true, provider: 'dropbox' },
      });
      cloudBackupAPI.listBackups.mockResolvedValue({
        data: { backups: [] },
      });
      cloudBackupAPI.getSchedule.mockResolvedValue({
        data: {},
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No backups yet. Create your first backup above.')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error messages', async () => {
      cloudBackupAPI.getStatus.mockRejectedValue({
        response: { data: { message: 'Failed to load status' } },
      });
      cloudBackupAPI.listBackups.mockResolvedValue({
        data: { backups: [] },
      });
      cloudBackupAPI.getSchedule.mockResolvedValue({
        data: {},
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load status')).toBeInTheDocument();
      });
    });

    it('should handle backup creation errors', async () => {
      cloudBackupAPI.getStatus.mockResolvedValue({
        data: { connected: true, provider: 'dropbox' },
      });
      cloudBackupAPI.listBackups.mockResolvedValue({
        data: { backups: [] },
      });
      cloudBackupAPI.getSchedule.mockResolvedValue({
        data: {},
      });
      cloudBackupAPI.createBackup.mockRejectedValue({
        response: { data: { message: 'Backup failed' } },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Create Backup Now')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create Backup Now');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Backup failed')).toBeInTheDocument();
      });
    });
  });
});
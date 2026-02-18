import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimezoneSelector from '../TimezoneSelector';

describe('TimezoneSelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<TimezoneSelector value="America/New_York" onChange={mockOnChange} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders with default props', () => {
    render(<TimezoneSelector onChange={mockOnChange} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText(/Selected:/)).toBeInTheDocument();
  });

  it('displays search input', () => {
    render(<TimezoneSelector value="America/New_York" onChange={mockOnChange} />);
    expect(screen.getByPlaceholderText('Search timezones...')).toBeInTheDocument();
  });

  it('displays selected timezone value', () => {
    render(<TimezoneSelector value="America/Los_Angeles" onChange={mockOnChange} />);
    expect(screen.getByText(/Selected: America\/Los_Angeles/)).toBeInTheDocument();
  });

  it('displays help text', () => {
    render(<TimezoneSelector value="America/New_York" onChange={mockOnChange} />);
    expect(screen.getByText(/Your timezone affects when scheduled backups run/)).toBeInTheDocument();
  });

  it('calls onChange when timezone is selected', async () => {
    const user = userEvent.setup();
    render(<TimezoneSelector value="America/New_York" onChange={mockOnChange} />);
    
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'America/Chicago');
    
    expect(mockOnChange).toHaveBeenCalledWith('America/Chicago');
  });

  it('filters timezones based on search term', async () => {
    const user = userEvent.setup();
    render(<TimezoneSelector value="America/New_York" onChange={mockOnChange} />);
    
    const searchInput = screen.getByPlaceholderText('Search timezones...');
    await user.type(searchInput, 'Pacific');
    
    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');
    
    // Should only show Pacific timezones
    expect(options.length).toBeLessThan(35); // Less than total timezones
    expect(options[0].textContent).toContain('Pacific');
  });

  it('shows all timezones when search is empty', () => {
    render(<TimezoneSelector value="America/New_York" onChange={mockOnChange} />);
    
    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');
    
    // Should show all 35 common timezones
    expect(options.length).toBe(35);
  });

  it('shows "No timezones found" when search has no matches', async () => {
    const user = userEvent.setup();
    render(<TimezoneSelector value="America/New_York" onChange={mockOnChange} />);
    
    const searchInput = screen.getByPlaceholderText('Search timezones...');
    await user.type(searchInput, 'XYZ_Invalid_Search');
    
    expect(screen.getByText('No timezones found')).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    render(
      <TimezoneSelector
        value="America/New_York"
        onChange={mockOnChange}
        error="Invalid timezone selected"
      />
    );
    
    expect(screen.getByText('Invalid timezone selected')).toBeInTheDocument();
  });

  it('applies error styling when error prop is provided', () => {
    render(
      <TimezoneSelector
        value="America/New_York"
        onChange={mockOnChange}
        error="Invalid timezone"
      />
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('border-red-300');
  });

  it('disables inputs when disabled prop is true', () => {
    render(
      <TimezoneSelector
        value="America/New_York"
        onChange={mockOnChange}
        disabled={true}
      />
    );
    
    expect(screen.getByPlaceholderText('Search timezones...')).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(
      <TimezoneSelector
        value="America/New_York"
        onChange={mockOnChange}
        className="custom-class"
      />
    );
    
    const container = screen.getByRole('combobox').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('handles null value gracefully', () => {
    render(<TimezoneSelector value={null} onChange={mockOnChange} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('handles undefined value gracefully', () => {
    render(<TimezoneSelector value={undefined} onChange={mockOnChange} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('includes all major timezone categories', () => {
    render(<TimezoneSelector value="America/New_York" onChange={mockOnChange} />);
    
    const select = screen.getByRole('combobox');
    const optionsText = Array.from(select.querySelectorAll('option')).map(opt => opt.textContent);
    
    // Check for representation of major regions
    expect(optionsText.some(text => text.includes('America/'))).toBe(true);
    expect(optionsText.some(text => text.includes('Europe/'))).toBe(true);
    expect(optionsText.some(text => text.includes('Asia/'))).toBe(true);
    expect(optionsText.some(text => text.includes('Australia/'))).toBe(true);
    expect(optionsText.some(text => text.includes('UTC'))).toBe(true);
  });

  it('displays timezone offset information', () => {
    render(<TimezoneSelector value="UTC" onChange={mockOnChange} />);
    
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option'));
    
    // Each option should display offset (UTC+X or UTC-X)
    options.forEach(option => {
      expect(option.textContent).toMatch(/UTC[+-]?\d+/);
    });
  });

  it('search is case-insensitive', async () => {
    const user = userEvent.setup();
    render(<TimezoneSelector value="America/New_York" onChange={mockOnChange} />);
    
    const searchInput = screen.getByPlaceholderText('Search timezones...');
    
    // Search with lowercase
    await user.type(searchInput, 'tokyo');
    
    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');
    
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].textContent).toContain('Tokyo');
  });

  it('clears search when typing new search', async () => {
    const user = userEvent.setup();
    render(<TimezoneSelector value="America/New_York" onChange={mockOnChange} />);
    
    const searchInput = screen.getByPlaceholderText('Search timezones...');
    
    await user.type(searchInput, 'Pacific');
    expect(searchInput).toHaveValue('Pacific');
    
    await user.clear(searchInput);
    await user.type(searchInput, 'Tokyo');
    expect(searchInput).toHaveValue('Tokyo');
  });
});
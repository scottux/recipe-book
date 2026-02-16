import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PasswordStrengthIndicator from '../PasswordStrengthIndicator';

describe('PasswordStrengthIndicator', () => {
  it('should not render when password is empty', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('should show "Weak" for short password', () => {
    render(<PasswordStrengthIndicator password="abc" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('should show "Weak" for password with only lowercase', () => {
    render(<PasswordStrengthIndicator password="abcdefgh" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('should show "Fair" for password with lowercase and uppercase', () => {
    render(<PasswordStrengthIndicator password="Abcdefgh" />);
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('should show "Good" for password with lowercase, uppercase, and number', () => {
    render(<PasswordStrengthIndicator password="Abcdefg1" />);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('should show "Strong" for password with all requirements', () => {
    render(<PasswordStrengthIndicator password="Abcdefg1!" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('should display all requirement checks', () => {
    render(<PasswordStrengthIndicator password="Test123!" />);
    
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Lowercase letter')).toBeInTheDocument();
    expect(screen.getByText('Uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('Number')).toBeInTheDocument();
    expect(screen.getByText(/Special character/)).toBeInTheDocument();
  });

  it('should mark met requirements with checkmark', () => {
    const { container } = render(<PasswordStrengthIndicator password="Test123!" />);
    
    // All requirements should be met (marked with ✓)
    const checkedItems = container.querySelectorAll('.text-green-600');
    expect(checkedItems.length).toBe(5);
  });

  it('should mark unmet requirements with circle', () => {
    const { container } = render(<PasswordStrengthIndicator password="test" />);
    
    // Most requirements should be unmet (marked with ○)
    const uncheckedItems = container.querySelectorAll('.text-gray-500');
    expect(uncheckedItems.length).toBeGreaterThan(0);
  });

  it('should update strength bar width based on score', () => {
    const { container, rerender } = render(<PasswordStrengthIndicator password="test" />);
    
    // Weak password - low score
    let strengthBar = container.querySelector('[style*="width"]');
    let weakWidth = strengthBar?.style.width;
    
    // Strong password - high score
    rerender(<PasswordStrengthIndicator password="Test123!" />);
    strengthBar = container.querySelector('[style*="width"]');
    let strongWidth = strengthBar?.style.width;
    
    // Strong password should have wider bar
    expect(parseInt(strongWidth)).toBeGreaterThan(parseInt(weakWidth));
  });

  it('should show correct color for weak password', () => {
    const { container } = render(<PasswordStrengthIndicator password="weak" />);
    const strengthBar = container.querySelector('.bg-red-500');
    expect(strengthBar).toBeInTheDocument();
  });

  it('should show correct color for fair password', () => {
    const { container } = render(<PasswordStrengthIndicator password="Weakpass" />);
    const strengthBar = container.querySelector('.bg-orange-500');
    expect(strengthBar).toBeInTheDocument();
  });

  it('should show correct color for good password', () => {
    const { container } = render(<PasswordStrengthIndicator password="Goodpass1" />);
    const strengthBar = container.querySelector('.bg-yellow-500');
    expect(strengthBar).toBeInTheDocument();
  });

  it('should show correct color for strong password', () => {
    const { container } = render(<PasswordStrengthIndicator password="Strong1!" />);
    const strengthBar = container.querySelector('.bg-green-500');
    expect(strengthBar).toBeInTheDocument();
  });

  it('should accept various special characters', () => {
    const passwords = [
      'Test123!',
      'Test123@',
      'Test123#',
      'Test123$',
      'Test123%',
      'Test123^',
      'Test123&',
      'Test123*'
    ];

    passwords.forEach(password => {
      const { unmount } = render(<PasswordStrengthIndicator password={password} />);
      expect(screen.getByText('Strong')).toBeInTheDocument();
      unmount();
    });
  });

  it('should handle edge case with exactly 8 characters', () => {
    render(<PasswordStrengthIndicator password="Test123!" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('should handle very long passwords', () => {
    const longPassword = 'Test123!'.repeat(10);
    render(<PasswordStrengthIndicator password={longPassword} />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });
});
import { useMemo } from 'react';

/**
 * Password Strength Indicator Component
 * 
 * Displays visual feedback for password strength based on:
 * - Length (minimum 8 characters)
 * - Lowercase letters
 * - Uppercase letters
 * - Numbers
 * - Special characters
 */
const PasswordStrengthIndicator = ({ password }) => {
  const strength = useMemo(() => {
    if (!password) {
      return { score: 0, label: '', color: '', requirements: [] };
    }

    let score = 0;
    const requirements = [];

    // Length check (8+ characters)
    const hasMinLength = password.length >= 8;
    if (hasMinLength) {
      score += 20;
      requirements.push({ met: true, text: 'At least 8 characters' });
    } else {
      requirements.push({ met: false, text: 'At least 8 characters' });
    }

    // Lowercase letter
    const hasLowercase = /[a-z]/.test(password);
    if (hasLowercase) {
      score += 20;
      requirements.push({ met: true, text: 'Lowercase letter' });
    } else {
      requirements.push({ met: false, text: 'Lowercase letter' });
    }

    // Uppercase letter
    const hasUppercase = /[A-Z]/.test(password);
    if (hasUppercase) {
      score += 20;
      requirements.push({ met: true, text: 'Uppercase letter' });
    } else {
      requirements.push({ met: false, text: 'Uppercase letter' });
    }

    // Number
    const hasNumber = /[0-9]/.test(password);
    if (hasNumber) {
      score += 20;
      requirements.push({ met: true, text: 'Number' });
    } else {
      requirements.push({ met: false, text: 'Number' });
    }

    // Special character
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (hasSpecial) {
      score += 20;
      requirements.push({ met: true, text: 'Special character (!@#$...)' });
    } else {
      requirements.push({ met: false, text: 'Special character (!@#$...)' });
    }

    // Determine label and color based on score
    let label, color;
    if (score < 40) {
      label = 'Weak';
      color = 'bg-red-500';
    } else if (score < 60) {
      label = 'Fair';
      color = 'bg-orange-500';
    } else if (score < 80) {
      label = 'Good';
      color = 'bg-yellow-500';
    } else {
      label = 'Strong';
      color = 'bg-green-500';
    }

    return { score, label, color, requirements };
  }, [password]);

  if (!password) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-700 min-w-[60px]">
          {strength.label}
        </span>
      </div>

      {/* Requirements checklist */}
      <div className="text-xs space-y-1">
        {strength.requirements.map((req, index) => (
          <div
            key={index}
            className={`flex items-center gap-1 ${
              req.met ? 'text-green-600' : 'text-gray-500'
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              {req.met ? '✓' : '○'}
            </span>
            <span>{req.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
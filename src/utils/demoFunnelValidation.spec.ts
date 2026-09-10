import { describe, expect, it } from 'vitest';
import { validateDemoFunnelStep, validateDemoFunnelSubmission } from './demoFunnelValidation';

const completeAnswers = {
  name: 'Natalie',
  businessName: 'Glow House Salon',
  email: 'natalie@example.com',
  phone: '(361) 555-0184',
};

describe('demo funnel validation', () => {
  it('does not allow name-only submission', () => {
    expect(validateDemoFunnelSubmission({ ...completeAnswers, businessName: '', email: '', phone: '' })).toBe(
      'Enter your salon or business name.',
    );
  });

  it('requires the salon name on step one', () => {
    expect(validateDemoFunnelStep(1, { ...completeAnswers, businessName: '' })).toBe(
      'Enter your salon or business name.',
    );
  });

  it('requires a valid email and phone on step two', () => {
    expect(validateDemoFunnelStep(2, { ...completeAnswers, email: '' })).toBe('Enter a valid email address.');
    expect(validateDemoFunnelStep(2, { ...completeAnswers, phone: '555-0184' })).toBe(
      'Enter a valid mobile phone number.',
    );
  });

  it('allows the optional what-to-see step', () => {
    expect(validateDemoFunnelStep(3, completeAnswers)).toBeNull();
  });
});

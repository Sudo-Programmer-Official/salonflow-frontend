import { describe, expect, it } from 'vitest';
import { validateDemoLeadContact } from './demoLeadValidation';

describe('validateDemoLeadContact', () => {
  it('requires at least one contact method', () => {
    expect(validateDemoLeadContact('', '')).toContain('email address or 10-digit phone');
  });

  it('accepts a valid phone without requiring email', () => {
    expect(validateDemoLeadContact('', '(361) 555-0184')).toBeNull();
  });

  it('rejects malformed contact values', () => {
    expect(validateDemoLeadContact('not-an-email', '')).toContain('valid email');
    expect(validateDemoLeadContact('', '555-0184')).toContain('10-digit phone');
  });
});

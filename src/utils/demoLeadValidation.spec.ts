import { describe, expect, it } from 'vitest';
import { validateDemoLeadContact } from './demoLeadValidation';

describe('validateDemoLeadContact', () => {
  it('requires at least one contact method', () => {
    expect(validateDemoLeadContact('', '')).toContain('email address or mobile phone');
  });

  it('accepts a valid phone without requiring email', () => {
    expect(validateDemoLeadContact('', '(361) 555-0184')).toBeNull();
  });

  it('rejects malformed contact values', () => {
    expect(validateDemoLeadContact('not-an-email', '')).toContain('valid email');
    expect(validateDemoLeadContact('', '555-0184')).toContain('valid mobile phone');
  });

  it('accepts a mobile number for a non-US country', () => {
    expect(validateDemoLeadContact('', '643 438 933', 'ES')).toBeNull();
  });
});

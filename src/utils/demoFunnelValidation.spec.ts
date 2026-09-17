import { describe, expect, it } from 'vitest';
import { demoDeliveryMessage, validateDemoFunnelStep, validateDemoFunnelSubmission } from './demoFunnelValidation';

const completeAnswers = {
  name: 'Natalie',
  businessName: 'Glow House Salon',
  businessType: 'Nail Salon',
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

  it('requires a business type on the final step', () => {
    expect(validateDemoFunnelStep(3, { ...completeAnswers, businessType: '' })).toBe(
      'Choose the type of business you run.',
    );
    expect(validateDemoFunnelStep(3, completeAnswers)).toBeNull();
  });

  it('does not claim email or SMS delivery when both providers fail or are disabled', () => {
    expect(
      demoDeliveryMessage({ status: 'disabled' }, { status: 'failed' }),
    ).toBe('Your private demo link is ready.');
  });

  it('reports only the channels that actually delivered the link', () => {
    expect(demoDeliveryMessage({ status: 'sent' }, { status: 'disabled' })).toContain('email');
    expect(demoDeliveryMessage({ status: 'failed' }, { status: 'simulated' })).toContain('text message');
  });
});

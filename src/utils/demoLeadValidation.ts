import { DEFAULT_DEMO_PHONE_COUNTRY, normalizeDemoPhone } from './demoPhone';

const DEMO_EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export const validateDemoLeadContact = (
  emailValue: string,
  phoneValue: string,
  phoneCountry = DEFAULT_DEMO_PHONE_COUNTRY,
): string | null => {
  const email = emailValue.trim();
  const normalizedPhone = normalizeDemoPhone(phoneValue, phoneCountry);

  if (email && !DEMO_EMAIL_PATTERN.test(email)) {
    return 'Enter a valid email address.';
  }
  if (phoneValue.trim() && !normalizedPhone) {
    return 'Enter a valid mobile phone number or remove it.';
  }
  if (!email && !normalizedPhone) {
    return 'Enter a valid email address or mobile phone number.';
  }
  return null;
};

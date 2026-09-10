const DEMO_EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export const validateDemoLeadContact = (emailValue: string, phoneValue: string): string | null => {
  const email = emailValue.trim();
  const phoneDigits = phoneValue.replace(/\D/g, '');

  if (email && !DEMO_EMAIL_PATTERN.test(email)) {
    return 'Enter a valid email address.';
  }
  if (phoneDigits && phoneDigits.length !== 10) {
    return 'Enter a valid 10-digit phone number or remove it.';
  }
  if (!email && !phoneDigits) {
    return 'Enter a valid email address or 10-digit phone number.';
  }
  return null;
};

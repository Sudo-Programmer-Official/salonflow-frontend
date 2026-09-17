const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export type DemoFunnelAnswers = {
  name: string;
  businessName: string;
  businessType: string;
  email: string;
  phone: string;
};

export const validateDemoFunnelStep = (step: number, answers: DemoFunnelAnswers): string | null => {
  if (step === 1) {
    if (!answers.name.trim()) return 'Enter your name.';
    if (!answers.businessName.trim()) return 'Enter your salon or business name.';
    if (!answers.businessType.trim()) return 'Choose the type of business you run.';
    return null;
  }

  if (step === 2) {
    if (!answers.phone.replace(/\D/g, '').match(/^\d{10,15}$/)) {
      return 'Enter a valid mobile phone number.';
    }
    if (!EMAIL_PATTERN.test(answers.email.trim())) return 'Enter a valid email address.';
  }

  return null;
};

export const validateDemoFunnelSubmission = (answers: DemoFunnelAnswers): string | null =>
  validateDemoFunnelStep(1, answers) || validateDemoFunnelStep(2, answers);

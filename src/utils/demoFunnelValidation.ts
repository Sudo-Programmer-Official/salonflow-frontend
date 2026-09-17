const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export type DemoFunnelAnswers = {
  name: string;
  businessName: string;
  businessType: string;
  email: string;
  phone: string;
};

export type DemoDeliveryStatus = { status?: string | null } | null | undefined;

const successfulDeliveryStatuses = new Set(['sent', 'simulated']);

const deliverySucceeded = (delivery: DemoDeliveryStatus): boolean =>
  successfulDeliveryStatuses.has((delivery?.status ?? '').trim().toLowerCase());

export const demoDeliveryMessage = (
  emailStatus: DemoDeliveryStatus,
  smsStatus: DemoDeliveryStatus,
): string => {
  const emailDelivered = deliverySucceeded(emailStatus);
  const smsDelivered = deliverySucceeded(smsStatus);

  if (emailDelivered && smsDelivered) {
    return 'Your private demo link is ready. We also sent a copy to your email and phone.';
  }
  if (emailDelivered) {
    return 'Your private demo link is ready. We also sent a copy to your email.';
  }
  if (smsDelivered) {
    return 'Your private demo link is ready. We also sent a copy by text message.';
  }
  return 'Your private demo link is ready.';
};

export const validateDemoFunnelStep = (step: number, answers: DemoFunnelAnswers): string | null => {
  if (step === 1) {
    if (!answers.name.trim()) return 'Enter your name.';
    if (!answers.businessName.trim()) return 'Enter your salon or business name.';
    return null;
  }

  if (step === 2) {
    if (!answers.phone.replace(/\D/g, '').match(/^\d{10,15}$/)) {
      return 'Enter a valid mobile phone number.';
    }
    if (!EMAIL_PATTERN.test(answers.email.trim())) return 'Enter a valid email address.';
  }

  if (step === 3 && !answers.businessType.trim()) {
    return 'Choose the type of business you run.';
  }

  return null;
};

export const validateDemoFunnelSubmission = (answers: DemoFunnelAnswers): string | null =>
  validateDemoFunnelStep(1, answers) || validateDemoFunnelStep(2, answers) || validateDemoFunnelStep(3, answers);

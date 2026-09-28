import type { BusinessSettings } from '../api/settings';

export type PaymentFlowDecision = 'manual' | 'integrated' | 'terminal_unavailable';
export type PaymentExecutionMode = 'manual' | 'native_device' | 'server_terminal';

export type PaymentFlowInput = Pick<
  BusinessSettings,
  'paymentMode' | 'paymentProvider' | 'requireTerminalReady' | 'allowManualPaymentFallback'
> & {
  executionMode?: PaymentExecutionMode;
  nativeAvailable: boolean;
  terminalReady: boolean;
};

export function resolvePaymentFlow(input: PaymentFlowInput): PaymentFlowDecision {
  if (input.paymentMode !== 'integrated') return 'manual';

  const unavailable = () =>
    input.allowManualPaymentFallback ? 'manual' : 'terminal_unavailable';

  const executionMode = input.executionMode ?? 'server_terminal';
  if (executionMode === 'manual') return 'manual';
  if (input.paymentProvider === 'none') return unavailable();
  if (executionMode === 'native_device' && !input.nativeAvailable) return unavailable();
  if (input.requireTerminalReady && !input.terminalReady) return unavailable();

  return 'integrated';
}

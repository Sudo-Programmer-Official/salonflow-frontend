import { describe, expect, it } from 'vitest';
import { resolvePaymentFlow, type PaymentFlowInput } from './paymentFlow';

const baseInput: PaymentFlowInput = {
  paymentMode: 'manual',
  paymentProvider: 'none',
  requireTerminalReady: true,
  allowManualPaymentFallback: true,
  nativeAvailable: false,
  terminalReady: false,
};

describe('resolvePaymentFlow', () => {
  it('keeps legacy tenants on manual payments by default', () => {
    expect(resolvePaymentFlow(baseInput)).toBe('manual');
  });

  it('does not activate integrated payments in a browser', () => {
    expect(
      resolvePaymentFlow({
        ...baseInput,
        paymentMode: 'integrated',
        paymentProvider: 'stripe_terminal',
        executionMode: 'native_device',
        nativeAvailable: false,
        allowManualPaymentFallback: false,
      }),
    ).toBe('terminal_unavailable');
  });

  it('uses manual fallback when integrated hardware is unavailable', () => {
    expect(
      resolvePaymentFlow({
        ...baseInput,
        paymentMode: 'integrated',
        paymentProvider: 'stripe_terminal',
        allowManualPaymentFallback: true,
      }),
    ).toBe('manual');
  });

  it('requires native capability and terminal readiness for integrated flow', () => {
    const enabled = {
      ...baseInput,
      paymentMode: 'integrated' as const,
      paymentProvider: 'stripe_terminal' as const,
      executionMode: 'native_device' as const,
      nativeAvailable: true,
      terminalReady: true,
    };

    expect(resolvePaymentFlow(enabled)).toBe('integrated');
    expect(resolvePaymentFlow({ ...enabled, terminalReady: false })).toBe('manual');
  });

  it('does not allow a missing provider to masquerade as hardware readiness', () => {
    expect(
      resolvePaymentFlow({
        ...baseInput,
        paymentMode: 'integrated',
        executionMode: 'native_device',
        nativeAvailable: true,
        terminalReady: true,
        allowManualPaymentFallback: false,
      }),
    ).toBe('terminal_unavailable');
  });

  it('keeps server-driven terminal execution available to browser/PWA runtimes', () => {
    expect(
      resolvePaymentFlow({
        ...baseInput,
        paymentMode: 'integrated',
        paymentProvider: 'stripe_terminal',
        executionMode: 'server_terminal',
        nativeAvailable: false,
        terminalReady: true,
        allowManualPaymentFallback: false,
      }),
    ).toBe('integrated');
  });

  it('defaults configured integrated payments to the server-terminal path', () => {
    expect(
      resolvePaymentFlow({
        ...baseInput,
        paymentMode: 'integrated',
        paymentProvider: 'square',
        nativeAvailable: false,
        terminalReady: true,
        allowManualPaymentFallback: false,
      }),
    ).toBe('integrated');
  });

  it('treats native SDK execution as unavailable without the native runtime', () => {
    expect(
      resolvePaymentFlow({
        ...baseInput,
        paymentMode: 'integrated',
        paymentProvider: 'stripe_terminal',
        executionMode: 'native_device',
        nativeAvailable: false,
        terminalReady: true,
        allowManualPaymentFallback: false,
      }),
    ).toBe('terminal_unavailable');
  });
});

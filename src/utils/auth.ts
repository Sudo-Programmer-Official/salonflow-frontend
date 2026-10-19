import { revokeNativeSession } from '../api/auth';

export const clearAuthState = () => {
  const keys = [
    'token',
    'role',
    'tenantId',
    'tenantSubdomain',
    'client',
    'email',
    'impersonationActive',
    'impersonationBusinessName',
    'impersonationOriginalToken',
    'impersonationOriginalRole',
    'impersonationOriginalTenant',
    'demoAccessSession',
    'demoProspectName',
    'demoProspectBusinessName',
    'demoTemplateLabel',
    'demoTemplateKey',
    'salonflow:nativeDeviceId',
  ];

  keys.forEach((key) => localStorage.removeItem(key));
};

export const logout = (redirectPath = '/app/login') => {
  void revokeNativeSession();
  clearAuthState();
  window.location.href = redirectPath;
};

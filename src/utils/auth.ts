export const clearAuthState = () => {
  const keys = [
    'token',
    'role',
    'tenantId',
    'client',
    'email',
    'impersonationActive',
    'impersonationBusinessName',
    'impersonationOriginalToken',
    'impersonationOriginalRole',
    'impersonationOriginalTenant',
  ];

  keys.forEach((key) => localStorage.removeItem(key));
};

export const logout = (redirectPath = '/app/login') => {
  clearAuthState();
  window.location.href = redirectPath;
};

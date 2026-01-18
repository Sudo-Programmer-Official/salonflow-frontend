export const clearAuthState = () => {
  const keys = [
    'token',
    'role',
    'tenantId',
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

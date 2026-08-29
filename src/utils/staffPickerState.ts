export type ServiceStaffPickerState = {
  persistedStaffId: string | null;
  pendingStaffId: string | null;
};

export const createServiceStaffPickerState = (
  persistedStaffId?: string | null,
): ServiceStaffPickerState => {
  const normalizedStaffId = persistedStaffId ?? null;
  return {
    persistedStaffId: normalizedStaffId,
    pendingStaffId: normalizedStaffId,
  };
};

export const selectServiceStaff = (
  state: ServiceStaffPickerState,
  staffId: string | null,
): ServiceStaffPickerState => ({
  ...state,
  pendingStaffId: staffId,
});

export const commitServiceStaff = (
  state: ServiceStaffPickerState,
): ServiceStaffPickerState => ({
  persistedStaffId: state.pendingStaffId,
  pendingStaffId: state.pendingStaffId,
});

export const cancelServiceStaff = (
  state: ServiceStaffPickerState,
): ServiceStaffPickerState => ({
  ...state,
  pendingStaffId: state.persistedStaffId,
});

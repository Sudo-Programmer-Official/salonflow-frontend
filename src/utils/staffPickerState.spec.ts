import { describe, expect, test } from 'vitest';
import {
  cancelServiceStaff,
  commitServiceStaff,
  createServiceStaffPickerState,
  selectServiceStaff,
} from './staffPickerState';

describe('service staff picker state', () => {
  test('initializes checked from the persisted service-line technician', () => {
    expect(createServiceStaffPickerState('caden')).toEqual({
      persistedStaffId: 'caden',
      pendingStaffId: 'caden',
    });
  });

  test('switches technician and preserves the new checked state after reopening', () => {
    const opened = createServiceStaffPickerState('caden');
    const switched = selectServiceStaff(opened, 'lena');
    const saved = commitServiceStaff(switched);

    expect(saved.pendingStaffId).toBe('lena');
    expect(createServiceStaffPickerState(saved.persistedStaffId).pendingStaffId).toBe('lena');
  });

  test('cancel restores the persisted assignment without mutating it', () => {
    const opened = createServiceStaffPickerState('caden');
    const changed = selectServiceStaff(opened, 'lena');

    expect(cancelServiceStaff(changed)).toEqual({
      persistedStaffId: 'caden',
      pendingStaffId: 'caden',
    });
  });
});

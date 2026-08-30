import { describe, expect, it } from 'vitest';
import { serviceLineStaffContext } from './serviceLineStaffContext';

describe('serviceLineStaffContext', () => {
  it('shows other service assignments without treating them as the edited line selection', () => {
    const lines = [
      { id: 'acrylic', serviceName: 'Acrylic Remove Only', staffId: 'caden' },
      { id: 'manicure', serviceName: 'Basic/Classic Manicure', staffId: null },
    ];

    expect(serviceLineStaffContext(lines, 'manicure', 'caden')).toBe('Assigned · Acrylic Remove Only');
    expect(serviceLineStaffContext(lines, 'manicure', 'june')).toBe('');
  });

  it('does not describe the service line currently being edited', () => {
    const lines = [{ id: 'acrylic', serviceName: 'Acrylic Remove Only', staffId: 'caden' }];

    expect(serviceLineStaffContext(lines, 'acrylic', 'caden')).toBe('');
  });
});

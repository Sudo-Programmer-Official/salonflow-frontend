import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const shellSource = readFileSync(
  resolve(process.cwd(), 'src/components/admin/StaffPickerModalShell.vue'),
  'utf8',
);

describe('staff picker modal shell layout', () => {
  test('keeps the footer outside the independently scrolling staff list', () => {
    const listStart = shellSource.indexOf('class="staff-picker-list"');
    const footerStart = shellSource.indexOf('class="staff-picker-footer"');

    expect(listStart).toBeGreaterThanOrEqual(0);
    expect(footerStart).toBeGreaterThan(listStart);
    expect(shellSource).toContain('.staff-picker-list {');
    expect(shellSource).toContain('overflow-y: auto;');
    expect(shellSource).toContain('flex: 0 0 auto;');
  });
});

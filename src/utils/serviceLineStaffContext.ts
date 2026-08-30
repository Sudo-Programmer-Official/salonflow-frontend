export type ServiceLineStaffContext = {
  id?: string | null;
  serviceName: string;
  staffId?: string | null;
};

/**
 * Describe service lines assigned to a technician other than the line being edited.
 * Visit-level membership and the current line's checked state are intentionally
 * kept separate from this display-only context.
 */
export const serviceLineStaffContext = (
  lines: readonly ServiceLineStaffContext[] | null | undefined,
  currentLineId: string | null | undefined,
  staffId: string,
) => {
  const assignments = (lines ?? [])
    .filter((line) => line.id !== currentLineId && line.staffId === staffId)
    .map((line) => line.serviceName.trim())
    .filter(Boolean);

  return assignments.length ? `Assigned · ${assignments.join(' • ')}` : '';
};

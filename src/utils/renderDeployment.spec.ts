import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const renderBlueprint = readFileSync(
  new URL('../../render.yaml', import.meta.url),
  'utf8',
);

describe('Render frontend deployment', () => {
  it('keeps staging domains on the frontend service', () => {
    expect(renderBlueprint).toContain('staging.salonflow.studio');
    expect(renderBlueprint).toContain('platform.staging.salonflow.studio');
    expect(renderBlueprint).toContain('demo.staging.salonflow.studio');
    expect(renderBlueprint).toContain("'*.staging.salonflow.studio'");
  });

  it('rewrites Vue Router paths to the SPA entry document', () => {
    expect(renderBlueprint).toMatch(
      /type: rewrite\s+source: \/\*\s+destination: \/index\.html/,
    );
  });
});

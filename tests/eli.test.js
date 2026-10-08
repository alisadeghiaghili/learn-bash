import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELI_TIERS, ELI_METADATA, SANDBOX_ELI, LEVEL_ELI, getEli, hasEli } from '../src/level/eli.js';
import { LEVELS } from '../src/level/levels.js';

test('ELI system defines all 5 progressive tiers', () => {
  assert.deepEqual(ELI_TIERS, ['eli5', 'eli10', 'eli15', 'eli20', 'eliphd']);
  for (const tier of ELI_TIERS) {
    assert.ok(ELI_METADATA[tier], `Metadata missing for tier ${tier}`);
    assert.ok(ELI_METADATA[tier].badge, `Badge missing for tier ${tier}`);
    assert.ok(ELI_METADATA[tier].title, `Title missing for tier ${tier}`);
    assert.ok(ELI_METADATA[tier].perspective, `Perspective missing for tier ${tier}`);
    assert.ok(ELI_METADATA[tier].color, `Color missing for tier ${tier}`);
  }
});

test('SANDBOX_ELI defines explanations for all 5 tiers', () => {
  for (const tier of ELI_TIERS) {
    assert.ok(typeof SANDBOX_ELI[tier] === 'string' && SANDBOX_ELI[tier].length > 20, `SANDBOX_ELI missing tier ${tier}`);
  }
});

test('every level in curriculum has 5-tier ELI explanation', () => {
  assert.ok(LEVELS.length >= 38, `Expected at least 38 levels, got ${LEVELS.length}`);
  for (const lvl of LEVELS) {
    assert.ok(lvl.eli, `Level ${lvl.id} is missing eli property`);
    assert.ok(hasEli(lvl.id), `hasEli should return true for ${lvl.id}`);
    for (const tier of ELI_TIERS) {
      const text = getEli(lvl, tier);
      assert.ok(typeof text === 'string' && text.length > 15, `Level ${lvl.id} tier ${tier} text too short or invalid`);
    }
  }
});

test('getEli falls back gracefully for unknown tiers or levels', () => {
  const sample = LEVELS[0];
  const fallback = getEli(sample, 'unknown_tier');
  assert.ok(fallback.length > 0);
  const sandboxFallback = getEli(null, 'eli5');
  assert.equal(sandboxFallback, SANDBOX_ELI.eli5);
});

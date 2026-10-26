import type { ProjectMapDetails } from '../types';

// Supplement the first demo project with the values supplied in the original Sketch.
// Keep these separate from saved UI state so existing local sessions also see them.
export const projectMapDetailSamples: Record<string, ProjectMapDetails> = {
  '0': {
    fullFoldAreaKm2: 596,
    processing: { shotCount: 550000, binSizeMeters: [25, 25], aspectRatio: 0.8, maxOffsetKm: 8 },
  },
};

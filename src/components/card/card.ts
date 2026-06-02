import type { ComponentRenderer } from '../render-context.js';
import { fallbackResult } from '../fallback.js';

/**
 * Stub renderer — Phase 0 placeholder so dispatch is exhaustive and each
 * component task owns exactly one file. The owning task replaces this body with
 * the real Card → Block Kit mapping.
 */
export const renderCard: ComponentRenderer<'Card'> = (node) =>
  fallbackResult(node, 'not implemented');

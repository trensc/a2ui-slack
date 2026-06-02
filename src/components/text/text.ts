import type { ComponentRenderer } from '../render-context.js';
import { fallbackResult } from '../fallback.js';

/**
 * Stub renderer — Phase 0 placeholder so dispatch is exhaustive and each
 * component task owns exactly one file. The owning task replaces this body with
 * the real Text → Block Kit mapping.
 */
export const renderText: ComponentRenderer<'Text'> = (node) =>
  fallbackResult(node, 'not implemented');

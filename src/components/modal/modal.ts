import type { ComponentRenderer } from '../render-context.js';
import { fallbackResult } from '../fallback.js';

/**
 * Stub renderer — Phase 0 placeholder so dispatch is exhaustive and each
 * component task owns exactly one file. The owning task replaces this body with
 * the real Modal → Block Kit mapping.
 */
export const renderModal: ComponentRenderer<'Modal'> = (node) =>
  fallbackResult(node, 'not implemented');

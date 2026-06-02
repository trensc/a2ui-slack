import type { ComponentRenderer } from '../render-context.js';
import { fallbackResult } from '../fallback.js';

/**
 * Stub renderer — Phase 0 placeholder so dispatch is exhaustive and each
 * component task owns exactly one file. The owning task replaces this body with
 * the real Button → Block Kit mapping.
 */
export const renderButton: ComponentRenderer<'Button'> = (node) =>
  fallbackResult(node, 'not implemented');

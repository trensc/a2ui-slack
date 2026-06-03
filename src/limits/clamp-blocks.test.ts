import { describe, it, expect } from 'vitest';
import type { KnownBlock } from '@slack/types';
import { clampBlocks, MESSAGE_BLOCK_MAX, VIEW_BLOCK_MAX } from './clamp-blocks.js';

function divider(): KnownBlock {
  return { type: 'divider' };
}

function dividers(count: number): KnownBlock[] {
  return Array.from({ length: count }, divider);
}

describe('clamp-blocks constants', () => {
  it('exports the Slack block-count limits', () => {
    expect(MESSAGE_BLOCK_MAX).toBe(50);
    expect(VIEW_BLOCK_MAX).toBe(100);
  });
});

describe('clampBlocks', () => {
  it('leaves a list exactly at the limit unchanged and not truncated', () => {
    const input = dividers(MESSAGE_BLOCK_MAX);
    const result = clampBlocks(input, MESSAGE_BLOCK_MAX);
    expect(result.blocks).toHaveLength(MESSAGE_BLOCK_MAX);
    expect(result.truncated).toBe(false);
  });

  it('truncates a list one over the limit and sets truncated', () => {
    const input = dividers(MESSAGE_BLOCK_MAX + 1);
    const result = clampBlocks(input, MESSAGE_BLOCK_MAX);
    expect(result.blocks).toHaveLength(MESSAGE_BLOCK_MAX);
    expect(result.truncated).toBe(true);
  });

  it('leaves a list under the limit unchanged and not truncated', () => {
    const result = clampBlocks(dividers(3), MESSAGE_BLOCK_MAX);
    expect(result.blocks).toHaveLength(3);
    expect(result.truncated).toBe(false);
  });

  it('returns an empty list with no truncation for empty input', () => {
    const result = clampBlocks([], MESSAGE_BLOCK_MAX);
    expect(result.blocks).toEqual([]);
    expect(result.truncated).toBe(false);
  });

  it('clamps to empty without throwing when max is 0', () => {
    const result = clampBlocks(dividers(3), 0);
    expect(result.blocks).toEqual([]);
    expect(result.truncated).toBe(true);
  });

  it('clamps to empty without throwing when max is negative', () => {
    const result = clampBlocks(dividers(3), -5);
    expect(result.blocks).toEqual([]);
    expect(result.truncated).toBe(true);
  });

  it('does not report truncation when an empty list meets a zero max', () => {
    const result = clampBlocks([], 0);
    expect(result.blocks).toEqual([]);
    expect(result.truncated).toBe(false);
  });

  it('does not mutate the input array', () => {
    const input = dividers(MESSAGE_BLOCK_MAX + 1);
    clampBlocks(input, MESSAGE_BLOCK_MAX);
    expect(input).toHaveLength(MESSAGE_BLOCK_MAX + 1);
  });

  it('returns a fresh array even when nothing is dropped', () => {
    const input = dividers(2);
    const result = clampBlocks(input, MESSAGE_BLOCK_MAX);
    expect(result.blocks).not.toBe(input);
  });

  it('honors the view limit passed by the caller', () => {
    const input = dividers(VIEW_BLOCK_MAX + 1);
    const result = clampBlocks(input, VIEW_BLOCK_MAX);
    expect(result.blocks).toHaveLength(VIEW_BLOCK_MAX);
    expect(result.truncated).toBe(true);
  });
});

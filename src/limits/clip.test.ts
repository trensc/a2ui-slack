import { describe, it, expect } from 'vitest';
import { clip } from './clip.js';

describe('clip', () => {
  it('returns the text unchanged when shorter than max', () => {
    expect(clip('hello', 10)).toBe('hello');
  });

  it('returns the text unchanged when exactly at max', () => {
    expect(clip('hello', 5)).toBe('hello');
  });

  it('truncates and appends an ellipsis when over max, staying within max', () => {
    const result = clip('hello world', 5);
    expect(result).toBe('hell…');
    expect(result.length).toBe(5);
  });

  it('returns just an ellipsis when max is 1', () => {
    expect(clip('hello', 1)).toBe('…');
  });

  it('returns an empty string when max is 0', () => {
    expect(clip('hello', 0)).toBe('');
  });

  it('returns an empty string when max is negative', () => {
    expect(clip('hello', -3)).toBe('');
  });

  it('handles an empty input', () => {
    expect(clip('', 5)).toBe('');
  });

  it('truncates a long string to a small max', () => {
    expect(clip('abcdefghij', 3)).toBe('ab…');
  });
});

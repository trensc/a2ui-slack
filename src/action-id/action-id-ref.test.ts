import { describe, expect, it } from 'vitest';
import { actionRef, inputRef } from './action-id-ref.js';

describe('actionRef', () => {
  it('omits the action field when no value is given', () => {
    expect(actionRef('c')).toEqual({ kind: 'action', componentId: 'c' });
  });

  it('carries the action value when present', () => {
    expect(actionRef('c', 'deploy')).toEqual({
      kind: 'action',
      componentId: 'c',
      action: 'deploy',
    });
  });
});

describe('inputRef', () => {
  it('omits the custom marker when none is given (built-in input)', () => {
    expect(inputRef('c', '/path')).toEqual({
      kind: 'input',
      componentId: 'c',
      path: '/path',
    });
  });

  it('carries the custom marker when present', () => {
    expect(inputRef('c', '/path', { component: 'Card', param: 'note' })).toEqual({
      kind: 'input',
      componentId: 'c',
      path: '/path',
      custom: { component: 'Card', param: 'note' },
    });
  });
});

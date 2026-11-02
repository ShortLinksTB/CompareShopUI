import { describe, expect, it } from 'vitest';
import { getApplicationTitle } from './pageMetadata';

describe('getApplicationTitle', () => {
  it('uses an English application title for English', () => {
    expect(getApplicationTitle('en')).toBe('GiaTot - Smart Price Comparison');
  });

  it('preserves the existing Vietnamese title for Vietnamese and Indonesian', () => {
    expect(getApplicationTitle('vi')).toBe('GiaTot - So sánh giá thông minh');
    expect(getApplicationTitle('id')).toBe('GiaTot - So sánh giá thông minh');
  });
});

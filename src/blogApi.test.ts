import { describe, expect, it } from 'vitest';
import { articleCoverUrl } from './blogApi';

describe('articleCoverUrl', () => {
  it('builds the root public Files URL for GUIDs from a versioned API base', () => {
    const guid = '6f9619ff-8b86-d011-b42d-00cf4fc964ff';
    expect(articleCoverUrl(guid, 'https://api-compareshop-dev.giamha.online/api/v1')).toBe(
      `https://api-compareshop-dev.giamha.online/files/${guid}`,
    );
  });

  it('preserves the optional cover fallback', () => {
    expect(articleCoverUrl(null, 'https://api.example.com/api/v1')).toBeNull();
  });
});

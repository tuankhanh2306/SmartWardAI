import { expect, it } from 'vitest';
import { splitSearchMatch } from '../core/searchMatch';

it('preserves the original accented phrase for each match', () => {
  const label = 'Trợ cấp và trợ cấp'.normalize('NFD');
  expect(splitSearchMatch(label, ' TRO CAP ')).toEqual([
    { text: 'Trợ cấp', matched: true },
    { text: ' và ', matched: false },
    { text: 'trợ cấp', matched: true },
  ]);
  expect(splitSearchMatch('Đăng ký', 'dang')[0]).toEqual({ text: 'Đăng', matched: true });
});

it('leaves empty and unrelated queries unmarked', () => {
  for (const query of [' ', 'hộ tịch']) {
    expect(splitSearchMatch('Trợ cấp', query)).toEqual([{ text: 'Trợ cấp', matched: false }]);
  }
});

import { normalizeVietnameseText } from './angiangWards';

export function splitSearchMatch(label: string, query: string) {
  const needle = normalizeVietnameseText(query);
  const text = label.normalize('NFC');
  // Preserve spaces in the label so the match offsets align with the displayed text.
  const folded = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  const parts: { text: string; matched: boolean }[] = [];
  let start = 0;
  let index = needle ? folded.indexOf(needle) : -1;
  while (index !== -1) {
    if (index > start) parts.push({ text: text.slice(start, index), matched: false });
    start = index + needle.length;
    parts.push({ text: text.slice(index, start), matched: true });
    index = folded.indexOf(needle, start);
  }
  if (start < text.length) parts.push({ text: text.slice(start), matched: false });
  return parts;
}

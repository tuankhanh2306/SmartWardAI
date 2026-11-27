import React from 'react';

/**
 * Strips Vietnamese diacritics and lowercases text for accent-insensitive search matching.
 */
export function normalizeVi(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

/**
 * Highlights all accent-insensitive occurrences of `query` inside `text`
 * with a yellow <mark> matching the Wai search recommendation UI.
 */
export function highlightMatchedText(text: string, query: string): React.ReactNode {
  const cleanQuery = normalizeVi(query).trim();
  if (!cleanQuery || !text) return text;

  let norm = '';
  const mapStart: number[] = [];
  const mapEnd: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const stripped = ch
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase();

    if (stripped.length > 0) {
      for (let k = 0; k < stripped.length; k++) {
        norm += stripped[k];
        mapStart.push(i);
        mapEnd.push(i + 1);
      }
    } else if (mapEnd.length > 0) {
      mapEnd[mapEnd.length - 1] = i + 1;
    }
  }

  const ranges: Array<[number, number]> = [];
  let cursor = 0;
  while (cursor <= norm.length - cleanQuery.length) {
    const idx = norm.indexOf(cleanQuery, cursor);
    if (idx === -1) break;
    const origStart = mapStart[idx];
    const origEnd = mapEnd[idx + cleanQuery.length - 1];
    ranges.push([origStart, origEnd]);
    cursor = idx + cleanQuery.length;
  }

  if (ranges.length === 0) return text;

  const nodes: React.ReactNode[] = [];
  let pos = 0;
  ranges.forEach(([start, end], idx) => {
    if (start > pos) {
      nodes.push(<React.Fragment key={`t-${idx}`}>{text.slice(pos, start)}</React.Fragment>);
    }
    nodes.push(
      <mark
        key={`m-${idx}`}
        className="bg-[#FFEB99] text-black font-bold rounded-sm"
      >
        {text.slice(start, end)}
      </mark>
    );
    pos = end;
  });

  if (pos < text.length) {
    nodes.push(<React.Fragment key="t-end">{text.slice(pos)}</React.Fragment>);
  }

  return <>{nodes}</>;
}

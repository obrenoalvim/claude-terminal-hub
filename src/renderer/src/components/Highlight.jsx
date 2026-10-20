import { useMemo } from 'react';
import { highlight } from '../../../shared/text';

export default function Highlight({ text, terms }) {
  const segments = useMemo(() => highlight(text, terms), [text, terms]);
  return segments.map((segment, i) =>
    segment.match ? <mark key={i}>{segment.text}</mark> : <span key={i}>{segment.text}</span>
  );
}

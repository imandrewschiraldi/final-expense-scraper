import type { ReactNode } from "react";

// Captures http(s):// and bare www. URLs; the capture group makes
// String.split() return matches inline with the surrounding text.
const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<>"')\]]+)/gi;
// Sentence punctuation that's almost always NOT part of the URL itself
// (e.g. "check this out: https://x.com." or "(see https://x.com)") but
// gets swept up by the greedy match above.
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;

/** Turns bare URLs in plain chat text into clickable links, leaving
 *  everything else as plain text. Chat messages are stored and rendered as
 *  plain text (no markdown), so this is what makes a pasted link clickable. */
export function linkifyText(text: string): ReactNode[] {
  const segments = text.split(URL_PATTERN);
  const nodes: ReactNode[] = [];

  segments.forEach((segment, i) => {
    // split() with a single capturing group alternates [text, match, text, match, ...].
    const isUrl = i % 2 === 1;
    if (!isUrl) {
      if (segment) nodes.push(segment);
      return;
    }

    const trailingMatch = segment.match(TRAILING_PUNCTUATION);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const url = trailing ? segment.slice(0, -trailing.length) : segment;
    const href = url.toLowerCase().startsWith("http") ? url : `https://${url}`;

    nodes.push(
      <a
        key={`link-${i}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-teal-light underline hover:text-teal"
      >
        {url}
      </a>,
    );
    if (trailing) nodes.push(trailing);
  });

  return nodes;
}

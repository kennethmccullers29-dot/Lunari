import { Fragment, type ReactNode } from "react";

const INLINE_RE = /(\*[^*\n]+\*)|(_[^_\n]+_)|(~[^~\n]+~)|(`[^`\n]+`)/g;

function formatInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  let match: RegExpExecArray | null;

  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const inner = token.slice(1, -1);
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("*")) {
      nodes.push(<strong key={key}>{inner}</strong>);
    } else if (token.startsWith("_")) {
      nodes.push(<em key={key}>{inner}</em>);
    } else if (token.startsWith("~")) {
      nodes.push(<s key={key}>{inner}</s>);
    } else {
      nodes.push(
        <code key={key} className="rounded bg-neutral-200/70 px-1 py-0.5 font-mono text-[13px]">
          {inner}
        </code>
      );
    }
    lastIndex = INLINE_RE.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

const CODE_BLOCK_RE = /```([\s\S]*?)```/g;

export function formatMessageText(text: string): ReactNode {
  const segments: ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  let match: RegExpExecArray | null;

  CODE_BLOCK_RE.lastIndex = 0;
  while ((match = CODE_BLOCK_RE.exec(text))) {
    if (match.index > lastIndex) {
      segments.push(
        <Fragment key={`t-${i}`}>{formatInline(text.slice(lastIndex, match.index), `t-${i}`)}</Fragment>
      );
    }
    segments.push(
      <pre
        key={`b-${i}`}
        className="my-1 overflow-x-auto rounded-md bg-neutral-900 px-3 py-2 text-[13px] text-neutral-50"
      >
        <code>{match[1].trim()}</code>
      </pre>
    );
    lastIndex = CODE_BLOCK_RE.lastIndex;
    i++;
  }
  if (lastIndex < text.length) {
    segments.push(<Fragment key={`t-${i}`}>{formatInline(text.slice(lastIndex), `t-${i}`)}</Fragment>);
  }
  return segments;
}

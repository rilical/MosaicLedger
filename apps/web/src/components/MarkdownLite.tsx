'use client';

import * as React from 'react';

type Block =
  | { type: 'hr' }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: Array<{ indent: number; text: string }> }
  | { type: 'paragraph'; lines: string[] };

function renderInline(text: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  let i = 0;
  const pushText = (s: string) => {
    if (!s) return;
    out.push(s);
  };

  while (i < text.length) {
    const boldAt = text.indexOf('**', i);
    const codeAt = text.indexOf('`', i);

    const nextAt = boldAt === -1 ? codeAt : codeAt === -1 ? boldAt : Math.min(boldAt, codeAt);

    if (nextAt === -1) {
      pushText(text.slice(i));
      break;
    }

    pushText(text.slice(i, nextAt));

    if (nextAt === boldAt) {
      const close = text.indexOf('**', boldAt + 2);
      if (close !== -1) {
        const inner = text.slice(boldAt + 2, close);
        out.push(
          <strong key={`b_${boldAt}_${close}`} style={{ fontWeight: 700 }}>
            {inner}
          </strong>,
        );
        i = close + 2;
        continue;
      }
      // Unclosed; treat literally.
      pushText('**');
      i = boldAt + 2;
      continue;
    }

    // Inline code
    const close = text.indexOf('`', codeAt + 1);
    if (close !== -1) {
      const inner = text.slice(codeAt + 1, close);
      out.push(
        <code
          key={`c_${codeAt}_${close}`}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.92em',
            padding: '1px 6px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.06)',
          }}
        >
          {inner}
        </code>,
      );
      i = close + 1;
      continue;
    }

    // Unclosed; treat literally.
    pushText('`');
    i = codeAt + 1;
  }

  return out.length === 1 ? out[0] : <>{out}</>;
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];

  let paragraph: string[] = [];
  let listItems: Array<{ indent: number; text: string }> = [];

  const flushParagraph = () => {
    const content = paragraph.map((l) => l.trimEnd()).filter(Boolean);
    if (content.length) blocks.push({ type: 'paragraph', lines: content });
    paragraph = [];
  };
  const flushList = () => {
    if (listItems.length) blocks.push({ type: 'list', items: listItems });
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }

    if (trimmed === '---') {
      flushList();
      flushParagraph();
      blocks.push({ type: 'hr' });
      continue;
    }

    const headingMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (headingMatch) {
      flushList();
      flushParagraph();
      blocks.push({ type: 'heading', text: headingMatch[1] ?? '' });
      continue;
    }

    const listMatch = line.match(/^(\s*)-\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      const spaces = (listMatch[1] ?? '').length;
      const indent = Math.floor(spaces / 2);
      listItems.push({ indent, text: listMatch[2] ?? '' });
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushList();
  flushParagraph();
  return blocks;
}

export function MarkdownLite(props: { text: string }) {
  const blocks = React.useMemo(() => parseBlocks(props.text), [props.text]);

  if (!props.text.trim()) return null;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {blocks.map((b, idx) => {
        if (b.type === 'hr') {
          return (
            <hr
              key={`hr_${idx}`}
              style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.10)' }}
            />
          );
        }

        if (b.type === 'heading') {
          return (
            <div
              key={`h_${idx}`}
              style={{ fontWeight: 750, letterSpacing: '0.02em', fontSize: 13 }}
            >
              {renderInline(b.text)}
            </div>
          );
        }

        if (b.type === 'list') {
          return (
            <div key={`ul_${idx}`} style={{ display: 'grid', gap: 6 }}>
              {b.items.map((it, j) => (
                <div
                  key={`li_${idx}_${j}`}
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginLeft: Math.min(5, Math.max(0, it.indent)) * 14,
                  }}
                >
                  <div aria-hidden style={{ opacity: 0.65 }}>
                    •
                  </div>
                  <div style={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap' }}>
                    {renderInline(it.text)}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        return (
          <div key={`p_${idx}`} style={{ display: 'grid', gap: 6 }}>
            {b.lines.map((l, j) => (
              <div key={`pl_${idx}_${j}`} style={{ whiteSpace: 'pre-wrap' }}>
                {renderInline(l)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

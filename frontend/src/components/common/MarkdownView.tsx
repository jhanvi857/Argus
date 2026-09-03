import React from 'react';

interface MarkdownViewProps {
  content: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Lightweight, zero-dependency Markdown renderer for interview questions & prep snippets.
 * Formats headings, bold text, lists, code blocks, and links with clean typography.
 */
export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, style, className }) => {
  if (!content) return null;

  // Split into blocks by double newlines or single newlines with headers/lists
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  const renderInline = (text: string): React.ReactNode => {
    // Process bold, italic, inline code, and links
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Inline Code: `code`
      const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/s);
      // Bold: **text**
      const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/s);
      // Italic: *text*
      const italicMatch = remaining.match(/^(.*?)\*([^*]+)\*(.*)$/s);
      // Link: [text](url)
      const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)$/s);

      // Find the earliest matching markdown tag
      type MatchInfo = { type: 'code' | 'bold' | 'italic' | 'link'; match: RegExpMatchArray; index: number };
      const matches: MatchInfo[] = [];

      if (codeMatch && codeMatch[1] !== undefined) matches.push({ type: 'code', match: codeMatch, index: codeMatch[1].length });
      if (boldMatch && boldMatch[1] !== undefined) matches.push({ type: 'bold', match: boldMatch, index: boldMatch[1].length });
      if (italicMatch && italicMatch[1] !== undefined) matches.push({ type: 'italic', match: italicMatch, index: italicMatch[1].length });
      if (linkMatch && linkMatch[1] !== undefined) matches.push({ type: 'link', match: linkMatch, index: linkMatch[1].length });

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      // Sort by earliest match index
      matches.sort((a, b) => a.index - b.index);
      const first = matches[0];

      if (first.type === 'code') {
        const [, prefix, codeContent, rest] = first.match;
        if (prefix) parts.push(renderInline(prefix));
        parts.push(
          <code
            key={`code-${key++}`}
            style={{
              padding: '2px 5px',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '4px',
              fontSize: '11.5px',
              fontFamily: 'var(--font-mono, monospace)',
              color: 'var(--gray-900)'
            }}
          >
            {codeContent}
          </code>
        );
        remaining = rest;
      } else if (first.type === 'bold') {
        const [, prefix, boldContent, rest] = first.match;
        if (prefix) parts.push(renderInline(prefix));
        parts.push(<strong key={`b-${key++}`} style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{boldContent}</strong>);
        remaining = rest;
      } else if (first.type === 'italic') {
        const [, prefix, italicContent, rest] = first.match;
        if (prefix) parts.push(renderInline(prefix));
        parts.push(<em key={`i-${key++}`}>{italicContent}</em>);
        remaining = rest;
      } else if (first.type === 'link') {
        const [, prefix, linkText, linkUrl, rest] = first.match;
        if (prefix) parts.push(renderInline(prefix));
        parts.push(
          <a
            key={`link-${key++}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--primary)', textDecoration: 'underline' }}
          >
            {linkText}
          </a>
        );
        remaining = rest;
      }
    }

    return parts.length === 1 ? parts[0] : <React.Fragment>{parts}</React.Fragment>;
  };

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} style={{ margin: '6px 0 8px', paddingLeft: '20px', lineHeight: 1.55 }}>
            {currentList.items.map((it, idx) => (
              <li key={idx} style={{ marginBottom: '3px', fontSize: '12.5px', color: 'var(--gray-800)' }}>
                {renderInline(it)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} style={{ margin: '6px 0 8px', paddingLeft: '20px', lineHeight: 1.55 }}>
            {currentList.items.map((it, idx) => (
              <li key={idx} style={{ marginBottom: '3px', fontSize: '12.5px', color: 'var(--gray-800)' }}>
                {renderInline(it)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Code block toggle (```)
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <pre
            key={`codeblock-${elements.length}`}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              padding: '10px 12px',
              borderRadius: '6px',
              overflowX: 'auto',
              fontSize: '12px',
              fontFamily: 'var(--font-mono, monospace)',
              margin: '8px 0'
            }}
          >
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        inCodeBlock = false;
        codeBlockContent = [];
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(rawLine);
      continue;
    }

    if (!line) {
      flushList();
      continue;
    }

    if (line === '#' || line === '##' || line === '###' || line === '####') {
      flushList();
      continue;
    }

    // Headings (##, ###, #)
    if (line.startsWith('#### ')) {
      const headingText = line.replace('#### ', '').trim();
      if (!headingText) continue;
      flushList();
      elements.push(
        <h5 key={`h4-${elements.length}`} style={{ margin: '10px 0 4px', fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)' }}>
          {renderInline(headingText)}
        </h5>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      const headingText = line.replace('### ', '').trim();
      if (!headingText) continue;
      flushList();
      elements.push(
        <h4 key={`h3-${elements.length}`} style={{ margin: '12px 0 4px', fontSize: '13.5px', fontWeight: 700, color: 'var(--gray-900)' }}>
          {renderInline(headingText)}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      const headingText = line.replace('## ', '').trim();
      if (!headingText) continue;
      flushList();
      elements.push(
        <h3 key={`h2-${elements.length}`} style={{ margin: '12px 0 6px', fontSize: '14px', fontWeight: 800, color: 'var(--gray-900)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '3px' }}>
          {renderInline(headingText)}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      const headingText = line.replace('# ', '').trim();
      if (!headingText) continue;
      flushList();
      elements.push(
        <h2 key={`h1-${elements.length}`} style={{ margin: '14px 0 6px', fontSize: '15px', fontWeight: 800, color: 'var(--gray-900)' }}>
          {renderInline(headingText)}
        </h2>
      );
      continue;
    }

    // Bullet Lists (- , * )
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const itemText = line.substring(2);
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // Ordered Lists (1. , 2. )
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      const itemText = olMatch[2];
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // Checkbox / Task items (e.g. [x] Code Quality:)
    if (line.startsWith('[x] ') || line.startsWith('[ ] ') || line.startsWith('☑ ') || line.startsWith('✅ ')) {
      flushList();
      const isChecked = !line.startsWith('[ ] ');
      const cleanText = line.replace(/^(\[[x ]\]|☑|✅)\s*/, '');
      elements.push(
        <div key={`task-${elements.length}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', margin: '4px 0', fontSize: '12.5px', color: 'var(--gray-800)' }}>
          <span style={{ color: isChecked ? '#16a34a' : 'var(--gray-400)', fontWeight: 700, marginTop: '1px' }}>
            {isChecked ? '✅' : '⬜'}
          </span>
          <div style={{ flex: 1, lineHeight: 1.5 }}>{renderInline(cleanText)}</div>
        </div>
      );
      continue;
    }

    // Blockquote (> )
    if (line.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          style={{
            margin: '6px 0',
            padding: '4px 10px',
            borderLeft: '3px solid var(--primary)',
            background: 'var(--gray-50)',
            fontSize: '12px',
            color: 'var(--gray-600)',
            fontStyle: 'italic'
          }}
        >
          {renderInline(line.replace(/^>\s*/, ''))}
        </blockquote>
      );
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${elements.length}`} style={{ margin: '6px 0', fontSize: '12.5px', color: 'var(--gray-800)', lineHeight: 1.6 }}>
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  return (
    <div className={className} style={{ ...style, fontFamily: 'inherit' }}>
      {elements}
    </div>
  );
};

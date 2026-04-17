/**
 * BBS Markdown Renderer
 *
 * Converts markdown content into BBS-style pre-formatted HTML with
 * ANSI color classes. Designed for rendering inside a <pre> or
 * white-space:pre container.
 *
 * Supports:
 *   - Headings (## rendered as section separators)
 *   - Bold (**text**) → white/bright
 *   - Italic (*text*) → cyan
 *   - Inline color tags: {yellow}text{/} {green}text{/} etc.
 *   - Code blocks (``` → darkgray)
 *   - Inline code (`code`) → darkgray
 *   - Lists (- item) → with BBS bullet chars
 *   - Horizontal rules (---) → box-drawing line
 *   - Links [text](url) → clickable in lcyan
 *   - Blockquotes (> text) → indented, gray
 *
 * Usage:
 *   const renderer = new BBSMarkdown({ width: 55, theme: themeObj });
 *   const html = renderer.render(markdownString);
 */

class BBSMarkdown {
  constructor(opts) {
    this.width = opts?.width || 55;
    this.theme = opts?.theme || BBSMarkdown.DEFAULT_THEME;
  }

  static get DEFAULT_THEME() {
    return {
      heading_bar: 'c',     // cyan separator lines
      heading_text: 'W',    // white heading text
      bold: 'W',            // white/bright
      italic: 'C',          // light cyan
      code: 'd',            // dark gray
      code_block: 'd',
      bullet: 'Y',          // yellow bullet
      link: 'C',            // light cyan links
      link_hover: 'Y',
      blockquote: 'd',      // dark gray
      hr: 'c',              // cyan
      text: 'w',            // default light gray
    };
  }

  // Color name to CSS class mapping
  static get COLORS() {
    return {
      'black': 'k', 'blue': 'b', 'green': 'g', 'cyan': 'c',
      'red': 'r', 'magenta': 'm', 'brown': 'br', 'gray': 'd',
      'darkgray': 'd', 'lightblue': 'B', 'lightgreen': 'G',
      'lightcyan': 'C', 'lightred': 'R', 'lightmagenta': 'M',
      'yellow': 'Y', 'white': 'W',
    };
  }

  render(markdown) {
    if (!markdown) return '';

    // Strip frontmatter
    markdown = markdown.replace(/^---[\s\S]*?---\n*/m, '');

    const lines = markdown.split('\n');
    const output = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code blocks
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
          output.push('');
        }
        continue;
      }

      if (inCodeBlock) {
        output.push(this._span(this.theme.code_block, ' ' + this._escapeHtml(line)));
        continue;
      }

      // Headings
      if (line.startsWith('## ')) {
        const text = line.substring(3);
        output.push('');
        output.push(this._span(this.theme.heading_bar, '─'.repeat(this.width)));
        output.push(' ' + this._span(this.theme.heading_text, text));
        output.push(this._span(this.theme.heading_bar, '─'.repeat(this.width)));
        output.push('');
        continue;
      }

      if (line.startsWith('# ')) {
        const text = line.substring(2);
        output.push('');
        output.push(this._span(this.theme.heading_bar, '═'.repeat(this.width)));
        output.push(' ' + this._span(this.theme.heading_text, '■ ' + text));
        output.push(this._span(this.theme.heading_bar, '═'.repeat(this.width)));
        output.push('');
        continue;
      }

      // Horizontal rule
      if (/^---+$/.test(line.trim())) {
        output.push(this._span(this.theme.hr, '─'.repeat(this.width)));
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        const text = line.substring(2);
        output.push('  ' + this._span(this.theme.blockquote, '│ ' + this._processInline(text)));
        continue;
      }

      // Unordered list
      if (/^\s*[-*]\s/.test(line)) {
        const text = line.replace(/^\s*[-*]\s/, '');
        output.push(' ' + this._span(this.theme.bullet, '►') + ' ' + this._processInline(text));
        continue;
      }

      // Ordered list
      if (/^\s*\d+\.\s/.test(line)) {
        const match = line.match(/^\s*(\d+)\.\s(.*)/);
        if (match) {
          output.push(' ' + this._span(this.theme.bullet, match[1] + '.') + ' ' + this._processInline(match[2]));
        }
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        output.push('');
        continue;
      }

      // Regular paragraph line
      output.push(' ' + this._processInline(line));
    }

    return output.join('\n');
  }

  // Process inline formatting
  _processInline(text) {
    // Escape HTML first
    text = this._escapeHtml(text);

    // Color tags: {yellow}text{/}
    text = text.replace(/\{(\w+)\}(.*?)\{\/\}/g, (_, color, content) => {
      const cls = BBSMarkdown.COLORS[color] || 'w';
      return `<span class="${cls}">${content}</span>`;
    });

    // Bold: **text** → white
    text = text.replace(/\*\*(.+?)\*\*/g, (_, content) => {
      return `<span class="${this.theme.bold}">${content}</span>`;
    });

    // Italic: *text* → cyan
    text = text.replace(/\*(.+?)\*/g, (_, content) => {
      return `<span class="${this.theme.italic}">${content}</span>`;
    });

    // Inline code: `text` → darkgray
    text = text.replace(/`(.+?)`/g, (_, content) => {
      return `<span class="${this.theme.code}">${content}</span>`;
    });

    // Links: [text](url) → clickable
    text = text.replace(/\[(.+?)\]\((.+?)\)/g, (_, label, url) => {
      return `<a href="${url}" target="_blank">${label}</a>`;
    });

    return text;
  }

  _span(cls, content) {
    return `<span class="${cls}">${content}</span>`;
  }

  _escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export default BBSMarkdown;

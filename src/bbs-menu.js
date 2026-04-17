/**
 * BBS Menu Component
 *
 * A keyboard-navigable menu that renders inside a pre-formatted terminal.
 * Supports arrow keys, hotkeys, Enter to select, mouse hover/click,
 * and wrap-around navigation.
 *
 * Usage:
 *   const menu = new BBSMenu({
 *     items: [
 *       { key: 'A', label: 'About Me', target: 'about' },
 *       { key: 'P', label: 'Projects', target: 'projects' },
 *       { separator: true },
 *       { key: 'Q', label: 'Quit', action: 'quit' },
 *     ],
 *     width: 35,         // box width in chars
 *     title: 'MAIN MENU',
 *     theme: themeObj,    // color palette
 *     onSelect: (item) => { ... },
 *     container: document.getElementById('menu-area'),
 *   });
 */

class BBSMenu {
  constructor(opts) {
    this.items = opts.items || [];
    this.selectableItems = this.items.filter(i => !i.separator);
    this.width = opts.width || 35;
    this.title = opts.title || 'MENU';
    this.theme = opts.theme || BBSMenu.DEFAULT_THEME;
    this.onSelect = opts.onSelect || function() {};
    this.container = opts.container;
    this.activeIndex = 0;
    this.focused = false;

    this._render();
    this._bindKeys();
    this._bindMouse();
  }

  static get DEFAULT_THEME() {
    return {
      border: 'c',     // cyan
      title: 'W',      // white
      key: 'Y',        // yellow
      keyBracket: 'd',  // dark gray
      label: 'W',      // white
      active_bg: '#0000AA',  // blue background
      active_fg: '#FFFFFF',  // white text
      separator: 'c',
    };
  }

  // Render the menu as pre-formatted text with spans
  _render() {
    const t = this.theme;
    const w = this.width;
    const innerW = w - 2; // minus left and right border chars

    let lines = [];

    // Top border
    lines.push(this._span(t.border, '┌' + '─'.repeat(innerW) + '┐'));

    // Title
    const titlePad = this._padCenter(this.title, innerW);
    lines.push(this._span(t.border, '│') + this._span(t.title, titlePad) + this._span(t.border, '│'));

    // Title separator
    lines.push(this._span(t.border, '├' + '─'.repeat(innerW) + '┤'));

    // Menu items
    let selectIdx = 0;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];

      if (item.separator) {
        lines.push(this._span(t.border, '├' + '─'.repeat(innerW) + '┤'));
        continue;
      }

      const isActive = selectIdx === this.activeIndex;
      const content = this._renderItem(item, innerW, isActive);
      const rowId = `bbs-menu-row-${selectIdx}`;
      const idx = selectIdx;

      if (isActive) {
        lines.push(
          `<span id="${rowId}" class="bbs-menu-item bbs-menu-active" data-idx="${idx}">`
          + this._span(t.border, '│')
          + `<span class="bbs-menu-highlight">${content}</span>`
          + this._span(t.border, '│')
          + '</span>'
        );
      } else {
        lines.push(
          `<span id="${rowId}" class="bbs-menu-item" data-idx="${idx}">`
          + this._span(t.border, '│')
          + content
          + this._span(t.border, '│')
          + '</span>'
        );
      }
      selectIdx++;
    }

    // Bottom border
    lines.push(this._span(t.border, '└' + '─'.repeat(innerW) + '┘'));

    this.container.innerHTML = lines.join('\n');
  }

  _renderItem(item, width, isActive) {
    const t = this.theme;
    const keyPart = this._span(t.keyBracket, '[') + this._span(t.key, item.key) + this._span(t.keyBracket, ']');
    const labelText = ` ${item.label}`;
    // key part is 3 visible chars: [X]
    // total content = ' ' + [X] + ' Label' + padding
    const usedChars = 1 + 3 + labelText.length; // space + [X] + label
    const padLen = width - usedChars;
    const padding = padLen > 0 ? ' '.repeat(padLen) : '';

    if (isActive) {
      // When active, return plain text (will be wrapped in highlight span)
      return ` [${item.key}] ${item.label}${padding}`;
    }

    return ' ' + keyPart + this._span(t.label, labelText) + padding;
  }

  _padCenter(text, width) {
    const pad = width - text.length;
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
  }

  _span(cls, text) {
    return `<span class="${cls}">${text}</span>`;
  }

  // Keyboard handling
  _bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (!this.focused) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key;

      // Arrow navigation
      if (key === 'ArrowUp' || key === 'k') {
        e.preventDefault();
        this._moveUp();
        return;
      }
      if (key === 'ArrowDown' || key === 'j') {
        e.preventDefault();
        this._moveDown();
        return;
      }
      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        this._selectCurrent();
        return;
      }
      if (key === 'Home') {
        e.preventDefault();
        this.activeIndex = 0;
        this._render();
        return;
      }
      if (key === 'End') {
        e.preventDefault();
        this.activeIndex = this.selectableItems.length - 1;
        this._render();
        return;
      }

      // Hotkey
      const upper = key.toUpperCase();
      const found = this.selectableItems.findIndex(i => i.key === upper);
      if (found >= 0) {
        e.preventDefault();
        this.activeIndex = found;
        this._render();
        this._selectCurrent();
      }
    });
  }

  // Mouse handling
  _bindMouse() {
    this.container.addEventListener('mouseover', (e) => {
      const row = e.target.closest('.bbs-menu-item');
      if (row) {
        const idx = parseInt(row.dataset.idx, 10);
        if (!isNaN(idx) && idx !== this.activeIndex) {
          this.activeIndex = idx;
          this._render();
        }
      }
    });

    this.container.addEventListener('click', (e) => {
      const row = e.target.closest('.bbs-menu-item');
      if (row) {
        const idx = parseInt(row.dataset.idx, 10);
        if (!isNaN(idx)) {
          this.activeIndex = idx;
          this._selectCurrent();
        }
      }
    });
  }

  _moveUp() {
    this.activeIndex--;
    if (this.activeIndex < 0) this.activeIndex = this.selectableItems.length - 1;
    this._render();
  }

  _moveDown() {
    this.activeIndex++;
    if (this.activeIndex >= this.selectableItems.length) this.activeIndex = 0;
    this._render();
  }

  _selectCurrent() {
    const item = this.selectableItems[this.activeIndex];
    if (item) this.onSelect(item);
  }

  // Public API
  focus() {
    this.focused = true;
  }

  blur() {
    this.focused = false;
  }

  reset() {
    this.activeIndex = 0;
    this._render();
  }

  setItems(items) {
    this.items = items;
    this.selectableItems = items.filter(i => !i.separator);
    this.activeIndex = 0;
    this._render();
  }
}

// CSS required for the menu (inject into page)
BBSMenu.CSS = `
.bbs-menu-item {
  cursor: pointer;
  display: inline;
}
.bbs-menu-highlight {
  background: var(--blue, #0000AA);
  color: var(--white, #FFFFFF);
}
.bbs-menu-item:hover .bbs-menu-highlight,
.bbs-menu-item:hover {
  background: var(--blue, #0000AA);
}
.bbs-menu-item:hover span {
  color: var(--white, #FFFFFF) !important;
}
`;

export default BBSMenu;

/**
 * BBS Core — Renderer and Router
 *
 * The main orchestrator that ties together menus, pages, markdown
 * rendering, sounds, and keyboard navigation into a complete BBS
 * experience.
 *
 * Lifecycle:
 *   1. Load site config (site.yaml parsed to JS object)
 *   2. Show intro sequence (Terminate dialer)
 *   3. Render header art + main menu
 *   4. Route to pages on menu selection
 *   5. Handle quit sequence
 *
 * Usage:
 *   const bbs = new BBSCore({
 *     config: siteConfig,      // parsed site.yaml
 *     container: document.getElementById('terminal'),
 *     statusBar: document.getElementById('statusbar'),
 *   });
 *   bbs.boot();
 */

import BBSMenu from './bbs-menu.js';
import BBSMarkdown from './bbs-markdown.js';
import BBSSounds from './bbs-sounds.js';

class BBSCore {
  constructor(opts) {
    this.config = opts.config;
    this.container = opts.container;
    this.statusBar = opts.statusBar;

    this.sounds = new BBSSounds({ enabled: this.config.sounds?.enabled });
    this.markdown = new BBSMarkdown({ width: 55 });
    this.menu = null;
    this.currentPage = null;
    this.pages = {};          // page id -> rendered HTML cache
    this.blogPosts = [];      // loaded blog posts

    // State
    this.state = 'intro';     // intro | main | page | blog | quit
  }

  // Boot the BBS — show intro, then transition to main
  async boot() {
    this.state = 'intro';
    await this._showIntro();
    this._showMain();
  }

  // Render the main screen: header + menu
  _showMain() {
    this.state = 'main';
    this.currentPage = null;

    let html = '';

    // Header art
    if (this.config.header?.art) {
      html += this.config.header.art;
    }

    // Tagline bar
    html += '\n';

    // Menu container placeholder
    html += '<span id="bbs-menu-container"></span>\n';

    // Prompt
    html += '\n<span id="bbs-prompt"><span class="G">Command &gt;</span> <span class="cur"></span></span>';

    this.container.innerHTML = html;

    // Initialize menu
    this.menu = new BBSMenu({
      items: this.config.menu,
      width: 35,
      title: 'MAIN MENU',
      container: document.getElementById('bbs-menu-container'),
      onSelect: (item) => this._onMenuSelect(item),
    });
    this.menu.focus();
    this.container.focus();

    this._updateStatusBar('connected');
  }

  // Handle menu selection
  _onMenuSelect(item) {
    if (item.action === 'quit') {
      this._showQuit();
      return;
    }

    if (item.target === 'blog') {
      this._showBlogIndex();
      return;
    }

    this._showPage(item.target);
  }

  // Show a content page
  _showPage(pageId) {
    this.state = 'page';
    this.currentPage = pageId;
    this.menu?.blur();

    const pageConfig = this.config.pages[pageId];
    if (!pageConfig) {
      this._showError(`Page not found: ${pageId}`);
      return;
    }

    // Check cache
    if (!this.pages[pageId]) {
      // In compiled mode, pages are pre-rendered.
      // In dev mode, fetch and render markdown.
      this.pages[pageId] = this._renderPagePlaceholder(pageId);
    }

    let html = '';

    // Page header with nav bar
    html += this._renderPageNav(pageId);

    // Page content
    html += '\n' + this.pages[pageId];

    // Footer
    html += '\n\n';
    html += '<span class="c">───────────────────────────────────────────────────────</span>\n';
    html += ' <span class="ml" onclick="bbs._showMain()"><span class="Y">Press</span> <span class="W">[M]</span> <span class="Y">to return to Main Menu</span></span>';

    this.container.innerHTML = html;
    this.container.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Render the nav bar shown at top of each page
  _renderPageNav(currentPageId) {
    const items = this.config.menu.filter(i => !i.separator && i.target && i.action !== 'quit');
    let nav = '<span class="c">═══════════════════════════════════════════════════════</span>\n';

    // Find current page title
    const current = items.find(i => i.target === currentPageId);
    if (current) {
      nav += ` <span class="W">■ ${current.label.toUpperCase()}</span>\n`;
    }

    nav += '<span class="c">═══════════════════════════════════════════════════════</span>\n';

    // Nav links
    const links = items.map(item => {
      return `<span class="ml" onclick="bbs._showPage('${item.target}')"><span class="d">[</span><span class="Y">${item.key}</span><span class="d">]</span></span>`;
    });
    nav += ' ' + links.join(' ') + '  <span class="ml" onclick="bbs._showMain()"><span class="d">[</span><span class="Y">M</span><span class="d">]enu</span></span>';

    return nav;
  }

  // Placeholder page renderer (used when markdown not yet loaded)
  _renderPagePlaceholder(pageId) {
    return `\n <span class="d">Loading ${pageId}...</span>`;
  }

  // Register a pre-rendered page (used by the build system)
  registerPage(pageId, markdownContent) {
    this.pages[pageId] = this.markdown.render(markdownContent);
  }

  // Blog index
  _showBlogIndex() {
    this.state = 'blog';
    this.menu?.blur();

    let html = this._renderPageNav('blog');
    html += '\n';

    if (this.blogPosts.length === 0) {
      html += ' <span class="d">No posts yet. Check back soon.</span>';
    } else {
      this.blogPosts.forEach((post, i) => {
        html += `\n <span class="Y">${post.date}</span> <span class="ml" onclick="bbs._showBlogPost(${i})"><span class="W">${post.title}</span></span>`;
      });
    }

    html += '\n\n<span class="c">───────────────────────────────────────────────────────</span>\n';
    html += ' <span class="ml" onclick="bbs._showMain()"><span class="Y">Press</span> <span class="W">[M]</span> <span class="Y">to return to Main Menu</span></span>';

    this.container.innerHTML = html;
    this.container.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Show a single blog post
  _showBlogPost(index) {
    const post = this.blogPosts[index];
    if (!post) return;

    this.state = 'blog';

    let html = '';
    html += '<span class="c">═══════════════════════════════════════════════════════</span>\n';
    html += ` <span class="W">${post.title}</span>\n`;
    html += ` <span class="d">${post.date}</span>`;
    if (post.tags) html += `  <span class="d">[${post.tags.join(', ')}]</span>`;
    html += '\n<span class="c">═══════════════════════════════════════════════════════</span>\n';

    html += this.markdown.render(post.content);

    // Nav
    html += '\n\n<span class="c">───────────────────────────────────────────────────────</span>\n';
    const navParts = [];
    if (index > 0) {
      navParts.push(`<span class="ml" onclick="bbs._showBlogPost(${index-1})"><span class="d">[</span><span class="Y">P</span><span class="d">]rev</span></span>`);
    }
    if (index < this.blogPosts.length - 1) {
      navParts.push(`<span class="ml" onclick="bbs._showBlogPost(${index+1})"><span class="d">[</span><span class="Y">N</span><span class="d">]ext</span></span>`);
    }
    navParts.push('<span class="ml" onclick="bbs._showBlogIndex()"><span class="d">[</span><span class="Y">B</span><span class="d">]log index</span></span>');
    navParts.push('<span class="ml" onclick="bbs._showMain()"><span class="d">[</span><span class="Y">M</span><span class="d">]enu</span></span>');
    html += ' ' + navParts.join('  ');

    this.container.innerHTML = html;
    this.container.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Register blog posts
  registerBlogPost(post) {
    // post: { title, date, tags, content (raw markdown) }
    this.blogPosts.push(post);
    this.blogPosts.sort((a, b) => b.date.localeCompare(a.date)); // newest first
  }

  // Quit sequence
  _showQuit() {
    this.state = 'quit';
    this.menu?.blur();

    const msgs = this.config.quit?.messages || ['Goodbye.'];
    this.container.innerHTML = '';
    this._updateStatusBar('nocarrier');

    msgs.forEach((msg, i) => {
      setTimeout(() => {
        const span = document.createElement('span');
        const isLast = i === msgs.length - 1;
        const isNoCarrier = msg === 'NO CARRIER';

        span.className = isNoCarrier ? 'R' : isLast ? 'G' : (i < 2 ? 'Y' : 'd');
        span.textContent = '\n ' + msg;

        if (isNoCarrier) {
          this.sounds.disconnect();
        }

        if (isLast) {
          span.style.cursor = 'pointer';
          span.classList.add('ml');
          span.onclick = () => this.boot();
        }

        this.container.appendChild(span);
      }, i * 1300);
    });
  }

  // Error display
  _showError(msg) {
    this.container.innerHTML = `\n <span class="R">ERROR:</span> <span class="w">${msg}</span>\n\n <span class="ml" onclick="bbs._showMain()"><span class="Y">[M]</span> <span class="Y">Back to Menu</span></span>`;
  }

  // Status bar updates
  _updateStatusBar(state) {
    if (!this.statusBar) return;
    const bars = {
      intro:     ' ALT-D Dial │ ALT-H Hangup │ ALT-X Exit │ F1 Phonebook',
      connected: ' ALT-H Help │ ALT-Z Hangup │ 115200,8N1 │ ANSI │ Node 1 │ Terminate 5.0',
      nocarrier: ' NO CARRIER',
    };
    this.statusBar.textContent = bars[state] || bars.connected;
  }

  // Global keyboard handler
  _bindGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const k = e.key.toUpperCase();

      if (this.state === 'page' || this.state === 'blog') {
        if (k === 'M') { e.preventDefault(); this._showMain(); return; }
        // Hotkey navigation from any page
        const menuItem = this.config.menu.find(i => i.key === k && !i.separator);
        if (menuItem && menuItem.target) {
          e.preventDefault();
          this._showPage(menuItem.target);
        }
      }

      if (this.state === 'quit' && k === 'R') {
        e.preventDefault();
        this.boot();
      }
    });

    // Keep focus on terminal
    document.addEventListener('click', (e) => {
      if (e.target.tagName !== 'A') this.container?.focus();
    });
  }
}

export default BBSCore;

# CLAUDE.md - BBS.css Framework

## What This Is

A web framework for building personal homepages, blogs, and interactive sites that look and feel like a 1990s Bulletin Board System. Inspired by RemoteAccess BBS, Terminate terminal software, FidoNet, BlueWave offline readers, and the entire dial-up modem era.

The site is compiled by a Rust CLI (`bbs-build`) from markdown content + a YAML config. Build output is a multi-page static site under `dist/`, one HTML file per page, with proper `<title>`, `<meta>`, and OpenGraph tags so search engines and social unfurlers see real content. The `src/` directory still holds the original JS reference modules but those are now reference-only; the canonical renderer lives in Rust.

## Project Structure

```
bbs-framework/
  CLAUDE.md              # You are here
  README.md              # Architecture overview and design principles
  Cargo.toml             # Rust workspace manifest
  crates/
    bbs-build/           # The static site generator
      Cargo.toml
      templates/
        bbs.css          # Shared stylesheet (embedded via include_str!)
        bbs.js           # Shared client runtime (embedded via include_str!)
      src/
        main.rs          # CLI entry (clap)
        build.rs         # Orchestration: read config, render, write dist
        config.rs        # site.yaml -> typed structs (serde_yml)
        content.rs       # Markdown loader + frontmatter splitter
        markdown.rs      # Markdown -> BBS inline-span HTML
        template.rs      # Per-page HTML templates
  src/                   # Original JS reference modules (now reference-only)
    bbs-core.js          # Main orchestrator (superseded by Rust + bbs.js)
    bbs-menu.js          # Menu component (arrow keys still TODO)
    bbs-markdown.js      # JS markdown renderer (superseded by markdown.rs)
    bbs-sounds.js        # Web Audio engine (folded into templates/bbs.js)
    bbs-theme.js         # ANSI color theme definitions
  content/
    site.yaml            # Site configuration (name, menu, pages, quit msgs)
    pages/
      about.md           # Content pages in markdown with frontmatter
      ...
    blog/
      2026-04-14-hello-world.md
  themes/                # (planned) External theme files
  dist/                  # Generated output (gitignore candidate)
    index.html           # Landing page with Terminate dialer
    about/index.html     # One file per page
    blog/index.html
    blog/<slug>/index.html
    assets/{bbs.css, bbs.js}
```

## Critical Rendering Rules

These were learned through painful iteration. Violating any of them breaks character alignment.

### Rule 1: Single Pre Block, Inline Elements Only

The entire terminal output MUST be inside a single `white-space: pre` container. All child elements MUST be inline (`<span>`). Never use `<div>`, `<p>`, `<pre>` (nested), or `<a>` with `display: block` inside the pre container. Block-level elements inject phantom line breaks that destroy the character grid.

```html
<!-- CORRECT: everything is inline spans -->
<div id="t" style="white-space: pre"><span class="ml" onclick="go('about')"><span class="c">|</span> <span class="Y">A</span> About Me <span class="c">|</span></span>
<span class="ml" onclick="go('projects')"><span class="c">|</span> <span class="Y">P</span> Projects  <span class="c">|</span></span></div>

<!-- WRONG: div breaks the pre flow -->
<div id="t" style="white-space: pre"><div class="menu-row" onclick="go('about')">| A About Me |</div>
<div class="menu-row" onclick="go('projects')">| P Projects  |</div></div>
```

### Rule 2: Panel Display Inline, Not Block

Content panels toggle between `display: none` and `display: inline`. Never `display: block` -- that breaks the pre-formatted character flow.

```css
.pn { display: none; }
.pn.on { display: inline; }
```

### Rule 3: Dynamic Text Must Be Padded Inside the Span

When JavaScript updates text inside a `<span>` that sits between border characters (`║ <span>text</span> ║`), the text MUST be padded to a fixed width INSIDE the span. If padding is outside the span (between `</span>` and `║`), it won't adjust when the text changes.

```javascript
// CORRECT: pad inside the span
function pad(text, width) {
  while (text.length < width) text += ' ';
  return text.substring(0, width);
}
function setLog(n, text, cls) {
  el.textContent = pad(text, 60);  // Always exactly 60 chars
}

// The HTML has all padding inside the span:
// ║</span> <span id="modem-log">Ready.                       </span> <span>║
//                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                              padding is INSIDE the span

// WRONG: padding outside the span
// ║</span> <span id="modem-log">Ready.</span>                        <span>║
//                                     ^^^^^^^^^^^^^^^^
//                                     these spaces stay when JS changes text
```

### Rule 4: Count Every Character

Every line inside a bordered box must have exactly the same visible character count. Use a verification script:

```python
import re
# Strip HTML tags, count visible chars, verify all lines match
clean = re.sub(r'<[^>]+>', '', line)
clean = clean.replace('&amp;', '&').replace('&gt;', '>').replace('&lt;', '<')
assert len(clean) == target_width
```

The header box in the reference implementation is 80 chars wide. The menu box is 35. The intro (Terminate) box is 64. Every single line must hit these numbers exactly.

### Rule 5: Unicode Box-Drawing Character Widths

Characters like `╔═╗║╚╝─│┌┐└┘├┤▄▀█▓░` have `east_asian_width=Ambiguous`. They render as single-width in the PxPlus IBM VGA font but may be double-width in fallback fonts (Courier New on some systems).

Mitigation:
- Use `font-display: block` on the @font-face to prevent FOIT with wrong-width fallback
- Gate page visibility on `document.fonts.ready` to ensure PxPlus loads before showing content
- Set font stack to `'PxPlus', monospace` (not `'Courier New'` -- let the browser pick its own monospace fallback if PxPlus fails)

### Rule 6: Focus Management for Keyboard Navigation

The terminal container needs `tabindex="0"` and explicit `.focus()` calls:
- On page load after font ready
- After every panel navigation
- After every click (except on `<a>` links)
- After returning from quit/redial sequence

Without this, keystrokes go to the browser URL bar instead of the BBS.

## Color System

Uses the standard CGA/VGA 16-color ANSI palette as CSS custom properties. Short class names map to colors:

```
.k  = black       .b  = blue        .g  = green       .c  = cyan
.r  = red         .m  = magenta     .br = brown       .w  = light gray
.d  = dark gray   .B  = light blue  .G  = light green .C  = light cyan
.R  = light red   .M  = light mag   .Y  = yellow      .W  = white
```

The `.ml` class makes any span clickable with blue-background hover highlighting (mimicking BBS menu selection).

## Application State Machine

```
intro --> main --> page --> main
                   |
                   +--> blog_index --> blog_post --> blog_index
                   |
                   +--> quit --> redial --> intro
```

- **intro**: Terminate dialer screen. Click/keypress triggers dial sequence.
- **main**: Header art + main menu. Hotkeys or arrow keys (planned) select items.
- **page**: Content panel. Nav bar at top, [M] return at bottom.
- **quit**: Timed message sequence with humor. [R] or click to redial.
- **redial**: Returns to intro, replays full ATDT/ring/modem negotiation.

## Sound Engine (Web Audio API)

All sounds are synthesized, no audio files:
- **DTMF tones**: Real dual-frequency pairs per digit (697-941 Hz low, 1209-1477 Hz high)
- **US phone ring**: 440+480 Hz dual tone, two bursts
- **Modem negotiation**: Three-phase buffer: carrier (1200/2400 Hz), scrambled negotiation (frequency sweep + noise), handshake squeal (1800 Hz sweep)
- **Disconnect**: 480+620 Hz busy tone

Audio context is lazy-initialized on first user interaction (browser autoplay policy).

## CRT Effects

- **Scanlines**: `repeating-linear-gradient` on `body::after`, 2px period, ~6% opacity
- **Vignette**: `radial-gradient` on `body::before`, transparent center fading to dark edges
- **Power-on flicker**: CSS `@keyframes poweron` with brightness flashes over 1.5s

## Menu Component Design (src/bbs-menu.js)

The menu should support:
- **Arrow up/down**: Move highlight with wrap-around
- **Enter/Space**: Select highlighted item
- **Hotkey letters**: Instant select (e.g., press A for About)
- **j/k**: Vim-style navigation
- **Home/End**: Jump to first/last item
- **Mouse hover**: Highlight follows cursor
- **Mouse click**: Select item
- **Separators**: Non-selectable divider lines between groups

The active item gets a full-width blue background highlight, identical to how RemoteAccess BBS menus worked.

## Markdown Renderer Design (src/bbs-markdown.js)

Converts markdown to pre-formatted ANSI-colored HTML:
- `# Heading` --> `═══════` separator + bright white text + `═══════`
- `## Subheading` --> `───────` separator lines
- `**bold**` --> white/bright (class W)
- `*italic*` --> light cyan (class C)
- `{yellow}text{/}` --> custom inline color tags
- `` `code` `` --> dark gray (class d)
- `- list item` --> `►` bullet in yellow
- `---` --> box-drawing horizontal rule
- `> blockquote` --> indented with `│` prefix in gray
- `[link](url)` --> clickable in light cyan

## Build System

Implemented by the Rust CLI `bbs-build` (in `crates/bbs-build/`). Pipeline:

1. Reads `content/site.yaml` into typed structs via `serde_yml`.
2. Walks `content/pages/*.md`, splitting YAML frontmatter from body. Pages whose source `.md` does not exist are skipped with a warning (the menu may still link to them — handle as TODO).
3. Walks `content/blog/*.md`, sorted newest-first by frontmatter date or filename `YYYY-MM-DD-` prefix.
4. Renders each markdown body to inline-span HTML through `markdown.rs` (a faithful port of `src/bbs-markdown.js`, plus a multi-line `{color}...{/}` pre-pass using Unicode private-use sentinels).
5. Emits **per-page HTML files** (not a single bundle): `dist/index.html`, `dist/<page>/index.html`, `dist/blog/index.html`, `dist/blog/<slug>/index.html`. Each file has its own `<title>`, `<meta description>`, `<link rel="canonical">`, and OpenGraph tags.
6. Writes shared `dist/assets/bbs.css` and `dist/assets/bbs.js` (both embedded into the binary via `include_str!`, then materialized at build time).

Run it with:

```
cargo run --release -p bbs-build       # from workspace root
# or, after `cargo install --path crates/bbs-build`:
bbs-build
```

The compiled binary is fully self-contained (no runtime file dependencies other than the project's `content/` directory).

## Roadmap

### Phase 1: Arrow-Key Menu
Add ↑/↓ navigation with a visible highlight bar to the main menu and page nav strips. Infrastructure is already in place — every clickable nav element carries a `data-key` attribute and `bbs.js` already binds keydowns. Extend `bbs.js` to track a focused-item index and re-style on arrow keys; Enter follows the link.

### Phase 2: Build Compiler  ✅ DONE
Implemented as the Rust CLI `bbs-build`. See "Build System" above.

### Phase 3: Blog Engine  ✅ MOSTLY DONE
Blog index and per-post pages are generated. [N]ext/[P]rev/[B]ack nav works on post pages. Still TODO: pagination on the index when post count exceeds `blog.posts_per_page`, RSS feed, tag pages.

### Phase 4: Theme Switcher
Runtime theme switcher (e.g., [T] hotkey from any screen) cycling through CGA, Amber, Green Phosphor, Ice. Persist choice in localStorage. Themes are CSS custom-property overrides; the build can ship multiple `<link rel="stylesheet">` blocks or a single `bbs.css` with `[data-theme="amber"]` selectors.

### Phase 5: TUI Client
Native terminal client in Rust (crossterm/ratatui) that reads the same `site.yaml` + markdown content and renders a real TUI. Prep: extract a `bbs-core` shared crate from `bbs-build` (move `config.rs`, `content.rs`, `markdown.rs`) so the TUI can depend on it. Could serve over SSH for the authentic BBS-over-modem experience.

### Phase 6: Distribution
Publish `bbs-build` to crates.io so `cargo install bbs-build` works for anyone. Add a `bbs-build init` subcommand that scaffolds a new site (sample `site.yaml`, sample `about.md`, sample blog post). Optionally provide a Homebrew tap (`brew install sakalsiz/tap/bbs-build`) so non-Rust users have a one-step install.

### Phase 7: Deploy Workflow
GitHub Actions workflow that runs `cargo run --release -p bbs-build` on push to `main` and publishes `dist/` to GitHub Pages (or Cloudflare Pages / Netlify). Edit markdown → `git push` → live in ~60s.

## Writing Style

The project owner (Mustafa) prefers:
- No em dashes or semicolons in written content
- Direct, technical communication
- BBS-era humor and references are encouraged
- The 555-0142 phone number is fictional (555-01xx range reserved for fiction)

## Font

PxPlus IBM VGA 8x16 from the WebPxPlus project:
```
https://cdn.jsdelivr.net/gh/idleberg/WebPxPlus@master/fonts/WebPlus_IBM_VGA_8x16.woff
```
This is the authentic IBM VGA font that renders all CP437 box-drawing and block characters at exactly 1ch width. It is the only font where the Unicode art alignment is guaranteed to work.

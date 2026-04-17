# BBS.css — A BBS-style web framework

Build personal homepages, blogs, and interactive sites that look and feel like
a 1990s Bulletin Board System. Full keyboard navigation, ANSI color theming,
arrow-key menus, markdown content, modem sound effects, and CRT aesthetics.

## Architecture

```
bbs-framework/
  src/
    bbs-core.js       — Main library: renderer, router, keyboard engine
    bbs-menu.js       — Menu component (arrow keys, hotkeys, mouse)
    bbs-markdown.js   — Markdown-to-ANSI renderer
    bbs-sounds.js     — Web Audio modem/DTMF/ring sound engine
    bbs-intro.js      — Terminate-style dial-up intro sequence
    bbs-theme.js      — ANSI color theme loader
    bbs-blog.js       — Blog engine (list + post view from markdown)
  content/
    site.yaml          — Site config (name, phone number, tagline, etc.)
    pages/
      about.md         — Content pages in markdown
      projects.md
      links.md
    blog/
      2026-04-14-hello-world.md
  themes/
    default.css        — CGA/VGA 16-color
    amber.css          — Amber monochrome CRT
    green.css          — Green phosphor
  dist/
    index.html         — Built single-file output
```

## Design Principles

1. **Single HTML file output** — The framework compiles to one .html file with
   everything inlined. Drop it anywhere. No server required.

2. **Content in Markdown** — Write pages in .md with YAML frontmatter. The
   framework converts them to BBS-style rendered output with ANSI colors.

3. **Keyboard-first, mouse-supported** — Arrow keys navigate menus. Hotkeys
   jump to sections. Mouse clicks work too. Tab cycles focus.

4. **TUI-compatible page format** — The page definition format (YAML + MD) is
   designed to be renderable by both the web library and a future Rust/Go TUI
   client that runs in an actual terminal.

5. **Themeable** — Swap the 16-color palette. Ship with CGA, amber, and green
   phosphor themes.

## Menu Component

Menus support:
- Arrow up/down to highlight items
- Enter to select
- Hotkey letters (first letter or explicit [X] markers)
- Mouse hover highlighting and click
- Wrapping (down from last item goes to first)
- Nested submenus (future)

## Markdown Extensions

Standard markdown plus:
- `:::ansi-box` / `:::` for bordered boxes
- `{.color-name}` for inline ANSI color spans
- `---` renders as box-drawing line separators
- Code blocks render in darkgray
- Front matter `menu_key: A` sets the hotkey for page navigation

## Blog Engine

- Posts are .md files in content/blog/ with date-prefixed filenames
- Blog index auto-generates from file listing
- Post view renders with BBS-style header (date, title, reading time)
- Navigation: [N]ext, [P]rev, [B]ack to index

## Future: TUI Client

The same site.yaml + markdown content can be rendered by a native terminal
client using crossterm (Rust) or tcell (Go), providing a real BBS experience
over SSH or direct terminal access.

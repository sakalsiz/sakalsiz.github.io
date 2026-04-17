//! HTML page templates.
//!
//! All visible text inside the `#t` pre-block must be rendered as inline spans
//! (Rule 1 from CLAUDE.md). Bordered boxes must hit exact character widths
//! (Rule 4). The functions in this module assemble those characters by hand.

use crate::build::RenderedPage;
use crate::config::{MenuItem, SiteConfig};
use crate::content::BlogPost;
use crate::markdown::Renderer;

pub const CSS: &str = include_str!("../templates/bbs.css");
pub const JS: &str = include_str!("../templates/bbs.js");

/// Width of the menu box on the landing page (border to border, inclusive).
const MENU_WIDTH: usize = 35;
/// Inner content width inside the menu box (excludes the two `│` borders).
const MENU_INNER: usize = MENU_WIDTH - 2;
/// Width of the rule lines used in the per-page nav bar / footer.
const RULE_WIDTH: usize = 55;
/// Width of the intro dialer box (border to border).
const INTRO_INNER: usize = 62;
/// Width of the dynamic log fields inside the intro dialer.
const INTRO_LOG_WIDTH: usize = 60;

// ===========================================================================
// Public render entry points
// ===========================================================================

/// Landing page (`/`): full Terminate intro + main menu.
pub fn render_landing(
    config: &SiteConfig,
    pages: &[RenderedPage],
    posts: &[BlogPost],
    renderer: &Renderer,
) -> String {
    let _ = (pages, posts);

    let title = format!("{} - Node 1", config.site.name);
    let description = effective_description(config, None, None);

    let intro = render_intro(config);
    let main = render_main_screen(config, renderer);
    let body = format!(
        r#"
{intro}
{main}
<div id="quit-screen" data-messages='{quit_json}'></div>
<div id="statusbar" class="sb">{statusbar}</div>
"#,
        intro = intro,
        main = main,
        quit_json = json_string_array(&config.quit.messages),
        statusbar = STATUS_INTRO,
    );

    wrap_html(&PageMeta {
        title,
        description,
        canonical: "/".to_string(),
        og_type: "website",
        og_title: config.site.name.clone(),
    }, &body)
}

/// A regular content page like `/about/`.
pub fn render_page(
    config: &SiteConfig,
    page: &RenderedPage,
    all_pages: &[RenderedPage],
) -> String {
    let title = format!("{} - {}", page.title, config.site.name);
    let description = effective_description(config, page.description.as_deref(), Some(&page.title));

    let nav = render_page_nav(config, &page.id, &page.title.to_uppercase(), all_pages);
    let footer = render_page_footer();

    let body = format!(
        r#"
<div id="t" tabindex="0">{nav}

{content}

{footer}</div>
<div id="quit-screen" data-messages='{quit_json}'></div>
<div id="statusbar" class="sb">{statusbar}</div>
"#,
        nav = nav,
        content = page.body_html,
        footer = footer,
        quit_json = json_string_array(&config.quit.messages),
        statusbar = STATUS_CONNECTED,
    );

    wrap_html(&PageMeta {
        title,
        description,
        canonical: format!("/{}/", page.id),
        og_type: "article",
        og_title: page.title.clone(),
    }, &body)
}

/// Blog index at `/blog/`.
pub fn render_blog_index(
    config: &SiteConfig,
    posts: &[BlogPost],
    all_pages: &[RenderedPage],
) -> String {
    let title = format!("Blog - {}", config.site.name);
    let description = effective_description(config, None, Some("Blog"));

    let nav = render_page_nav(config, "blog", "BLOG", all_pages);
    let footer = render_page_footer();

    let mut listing = String::new();
    if posts.is_empty() {
        listing.push_str(&format!(
            "\n {}",
            span("d", "No posts yet. Check back soon.")
        ));
    } else {
        // Right-align numbers. Biggest number = newest = top of list.
        let total = posts.len();
        let num_width = total.to_string().len();
        for (i, post) in posts.iter().enumerate() {
            let n = total - i;
            let n_padded = format!("{:>width$}", n, width = num_width);
            listing.push_str(&format!(
                "\n <a class=\"ml\" data-menu-item data-blog-number=\"{n}\" href=\"/blog/{slug}/\"> {n_span}. {date} {title}</a>",
                n = n,
                n_span = span("d", &n_padded),
                date = span("Y", &escape_attr(&post.date)),
                slug = escape_attr(&post.slug),
                title = span("W", &escape_html(&post.title)),
            ));
        }

        // [G]o to post number — activating this swaps the bottom prompt
        // into "Blog number > _" input mode (handled in bbs.js). Reachable
        // via click or the G hotkey; intentionally not in the arrow-nav
        // rotation so up/down stays focused on actual post selection.
        listing.push_str(&format!(
            "\n\n <span class=\"ml\" data-key=\"G\" onclick=\"bbsBlogPrompt()\">{lb}{ks}{rb}{label}</span>",
            lb = span("d", "["),
            ks = span("Y", "G"),
            rb = span("d", "]"),
            label = span("W", "o to post number"),
        ));
    }

    let body = format!(
        r#"
<div id="t" tabindex="0">{nav}
{listing}

{footer}</div>
<div id="quit-screen" data-messages='{quit_json}'></div>
<div id="statusbar" class="sb">{statusbar}</div>
"#,
        nav = nav,
        listing = listing,
        footer = footer,
        quit_json = json_string_array(&config.quit.messages),
        statusbar = STATUS_CONNECTED,
    );

    wrap_html(&PageMeta {
        title,
        description,
        canonical: "/blog/".to_string(),
        og_type: "website",
        og_title: format!("Blog - {}", config.site.name),
    }, &body)
}

/// A blog post at `/blog/<slug>/`.
pub fn render_blog_post(
    config: &SiteConfig,
    post: &BlogPost,
    body_html: &str,
    prev: Option<&BlogPost>,
    next: Option<&BlogPost>,
    _all_pages: &[RenderedPage],
) -> String {
    let title = format!("{} - {}", post.title, config.site.name);
    let description = effective_description(config, post.description.as_deref(), Some(&post.title));

    let mut header = String::new();
    header.push_str(&format!("{}\n", span("c", &"═".repeat(RULE_WIDTH))));
    header.push_str(&format!(" {}\n", span("W", &escape_html(&post.title))));
    let mut date_line = format!(" {}", span("d", &escape_html(&post.date)));
    if !post.tags.is_empty() {
        date_line.push_str(&format!(
            "  {}",
            span("d", &format!("[{}]", escape_html(&post.tags.join(", "))))
        ));
    }
    header.push_str(&date_line);
    header.push('\n');
    header.push_str(&span("c", &"═".repeat(RULE_WIDTH)));

    let mut nav_parts: Vec<String> = Vec::new();
    if let Some(p) = prev {
        nav_parts.push(format!(
            "<a class=\"ml\" data-menu-item href=\"/blog/{slug}/\" data-key=\"P\">{}{}{}</a>",
            span("d", "["),
            span("Y", "P"),
            span("d", "]rev"),
            slug = escape_attr(&p.slug),
        ));
    }
    if let Some(n) = next {
        nav_parts.push(format!(
            "<a class=\"ml\" data-menu-item href=\"/blog/{slug}/\" data-key=\"N\">{}{}{}</a>",
            span("d", "["),
            span("Y", "N"),
            span("d", "]ext"),
            slug = escape_attr(&n.slug),
        ));
    }
    nav_parts.push(format!(
        "<a class=\"ml\" data-menu-item href=\"/blog/\" data-key=\"B\">{}{}{}</a>",
        span("d", "["),
        span("Y", "B"),
        span("d", "]log index"),
    ));
    nav_parts.push(format!(
        "<a class=\"ml\" data-menu-item href=\"/\" data-key=\"M\">{}{}{}</a>",
        span("d", "["),
        span("Y", "M"),
        span("d", "]enu"),
    ));

    let footer = format!(
        "{}\n {}\n\n{}",
        span("c", &"─".repeat(RULE_WIDTH)),
        nav_parts.join("  "),
        render_prompt(),
    );

    let body = format!(
        r#"
<div id="t" tabindex="0">{header}

{content}

{footer}</div>
<div id="quit-screen" data-messages='{quit_json}'></div>
<div id="statusbar" class="sb">{statusbar}</div>
"#,
        header = header,
        content = body_html,
        footer = footer,
        quit_json = json_string_array(&config.quit.messages),
        statusbar = STATUS_CONNECTED,
    );

    wrap_html(&PageMeta {
        title,
        description,
        canonical: format!("/blog/{}/", post.slug),
        og_type: "article",
        og_title: post.title.clone(),
    }, &body)
}

// ===========================================================================
// Sub-templates
// ===========================================================================

/// Render the Terminate-style intro dialer block.
fn render_intro(config: &SiteConfig) -> String {
    let phone = &config.site.phone;
    let phone_digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();

    let term = &config.terminal;
    let line_settings = format!(
        " {com_label} {com}    {speed_label} {speed}   {parity_label} {parity}",
        com_label = span("W", "COM Port:"),
        com = span("G", &escape_html(no_empty(&term.com_port, "COM1"))),
        speed_label = span("W", "Speed:"),
        speed = span("G", &escape_html(&config.site.baud.to_string())),
        parity_label = span("W", "Parity:"),
        parity = span("G", &escape_html(no_empty(&term.parity, "8N1"))),
    );
    let line_modem = format!(
        " {} {}",
        span("W", "Modem:"),
        span("G", &escape_html(no_empty(&term.modem, "Generic Modem"))),
    );
    let line_emul = format!(
        " {} {}",
        span("W", "Emulation:"),
        span("Y", &escape_html(no_empty(&term.emulation, "ANSI-BBS"))),
    );
    let line_phonebook = format!(
        " {} {}",
        span("W", "Phonebook Entry:"),
        span("C", &escape_html(&config.site.name)),
    );
    let line_number = format!(
        " {} {}",
        span("W", "Number:"),
        span("G", &escape_html(phone)),
    );

    let dial_status_pad = pad_to(
        "Click anywhere or press any key to dial...",
        INTRO_LOG_WIDTH,
    );

    let title_label = span("W", &format!(" {}", escape_html(no_empty(&term.software, "Terminate 5.0"))));
    let title_extra = span("d", "Unregistered Evaluation Copy");

    // Header line: "║ {title}   {extra}     ║"
    let title_visible = format!(" {}", no_empty(&term.software, "Terminate 5.0"));
    let extra_visible = "Unregistered Evaluation Copy";
    let header_inner = format!("{} {}", title_visible, extra_visible);
    let header_pad = saturating_pad(&header_inner, INTRO_INNER);
    let header_row = format!(
        "{title_label}{spaces_between}{title_extra}{end_pad}",
        title_label = title_label,
        spaces_between = " ".repeat(INTRO_INNER.saturating_sub(title_visible.chars().count() + extra_visible.chars().count())),
        title_extra = title_extra,
        end_pad = "",
    );
    let _ = header_pad; // already accounted for above

    let intro = format!(
        r#"<div id="intro" data-phone-digits="{phone_digits_attr}">
{c_top}
{c_pipe}{header_row}{c_pipe_end}
{c_mid}
{c_pipe}{spacer}{c_pipe_end}
{c_pipe}{settings}{settings_pad}{c_pipe_end}
{c_pipe}{modem_line}{modem_pad}{c_pipe_end}
{c_pipe}{emul_line}{emul_pad}{c_pipe_end}
{c_pipe}{spacer}{c_pipe_end}
{c_mid}
{c_pipe}{spacer}{c_pipe_end}
{c_pipe}{phonebook}{phonebook_pad}{c_pipe_end}
{c_pipe}{number}{number_pad}{c_pipe_end}
{c_pipe}{spacer}{c_pipe_end}
{c_pipe} <span id="dial-status" class="Y">{dial_status}</span> {c_pipe_end}
{c_pipe}{spacer}{c_pipe_end}
{c_mid}
{c_pipe} <span id="modem-log"  class="d">{empty_log}</span> {c_pipe_end}
{c_pipe} <span id="modem-log2" class="d">{empty_log}</span> {c_pipe_end}
{c_pipe} <span id="modem-log3" class="d">{empty_log}</span> {c_pipe_end}
{c_pipe} <span id="modem-log4" class="d">{empty_log}</span> {c_pipe_end}
{c_bot}

<span class="d"> ALT-D Dial │ ALT-H Hangup │ ALT-X Exit │ F1 Phonebook</span>
</div>"#,
        phone_digits_attr = escape_attr(&phone_digits),
        c_top = span("c", &format!("╔{}╗", "═".repeat(INTRO_INNER))),
        c_mid = span("c", &format!("╠{}╣", "═".repeat(INTRO_INNER))),
        c_bot = span("c", &format!("╚{}╝", "═".repeat(INTRO_INNER))),
        c_pipe = span("c", "║"),
        c_pipe_end = span("c", "║"),
        spacer = " ".repeat(INTRO_INNER),
        header_row = header_row,
        settings = line_settings,
        settings_pad = pad_after(&visible_text_settings(&config), INTRO_INNER),
        modem_line = line_modem,
        modem_pad = pad_after(&format!(" Modem: {}", no_empty(&term.modem, "Generic Modem")), INTRO_INNER),
        emul_line = line_emul,
        emul_pad = pad_after(&format!(" Emulation: {}", no_empty(&term.emulation, "ANSI-BBS")), INTRO_INNER),
        phonebook = line_phonebook,
        phonebook_pad = pad_after(&format!(" Phonebook Entry: {}", config.site.name), INTRO_INNER),
        number = line_number,
        number_pad = pad_after(&format!(" Number: {}", phone), INTRO_INNER),
        dial_status = dial_status_pad,
        empty_log = " ".repeat(INTRO_LOG_WIDTH),
    );
    intro
}

fn visible_text_settings(cfg: &SiteConfig) -> String {
    let term = &cfg.terminal;
    format!(
        " COM Port: {com}    Speed: {speed}   Parity: {parity}",
        com = no_empty(&term.com_port, "COM1"),
        speed = cfg.site.baud,
        parity = no_empty(&term.parity, "8N1"),
    )
}

/// Render the main BBS screen: header art + menu box + prompt with cursor.
fn render_main_screen(config: &SiteConfig, renderer: &Renderer) -> String {
    let header = render_header_art(config, renderer);
    let menu = render_menu_box(config);
    let prompt = render_prompt();
    format!(
        r#"<div id="t" tabindex="0" style="display:none">{header}

{menu}

{prompt}</div>"#,
        header = header,
        menu = menu,
        prompt = prompt,
    )
}

/// Render the header art block. Authors may use `{color}...{/}` tags inside
/// `header.art` to colorize segments (same syntax as markdown body content).
/// The whole block is wrapped in a default blue span so untagged border
/// characters render in the BBS standard color.
fn render_header_art(config: &SiteConfig, renderer: &Renderer) -> String {
    let art = config.header.art.trim_end_matches('\n');
    if art.is_empty() {
        return String::new();
    }
    let processed = renderer.render_inline_only(art);
    format!("<span class=\"b\">{}</span>", processed)
}

/// Render the main menu as a 35-char-wide box with hotkey links to real URLs.
fn render_menu_box(config: &SiteConfig) -> String {
    let mut lines: Vec<String> = Vec::new();

    // Top border.
    lines.push(span("c", &format!("┌{}┐", "─".repeat(MENU_INNER))));

    // Title row: "│{title_text}{padding}│"  — width = MENU_INNER between borders.
    let title_text = " MAIN MENU";
    let title_pad = " ".repeat(MENU_INNER.saturating_sub(title_text.chars().count()));
    lines.push(format!(
        "{}{}{}{}",
        span("c", "│"),
        span("W", title_text),
        title_pad,
        span("c", "│"),
    ));

    // Mid border.
    lines.push(span("c", &format!("├{}┤", "─".repeat(MENU_INNER))));

    for item in &config.menu {
        match item {
            MenuItem::Separator { .. } => {
                lines.push(span("c", &format!("├{}┤", "─".repeat(MENU_INNER))));
            }
            MenuItem::Entry { key, label, target, action } => {
                let visible = format!(" [{}] {}", key, label);
                let pad = " ".repeat(MENU_INNER.saturating_sub(visible.chars().count()));
                let inner = format!(
                    "{lb} {kbr_open}{key_span}{kbr_close} {label_span}{pad}",
                    lb = "",
                    kbr_open = span("d", "["),
                    key_span = span("Y", &escape_html(key)),
                    kbr_close = span("d", "]"),
                    label_span = span("W", &escape_html(label)),
                    pad = pad,
                );
                let href = match (target.as_deref(), action.as_deref()) {
                    (_, Some("quit")) => None, // handled via JS, see below
                    (Some(t), _) if t == "blog" => Some("/blog/".to_string()),
                    (Some(t), _) => Some(format!("/{}/", t)),
                    _ => None,
                };
                let row = if let Some(href) = href {
                    format!(
                        "<a class=\"ml\" data-menu-item href=\"{href}\" data-key=\"{key}\">{lb}{inner}{rb}</a>",
                        href = escape_attr(&href),
                        key = escape_attr(key),
                        lb = span("c", "│"),
                        inner = inner,
                        rb = span("c", "│"),
                    )
                } else if action.as_deref() == Some("quit") {
                    format!(
                        "<span class=\"ml\" data-menu-item onclick=\"bbsQuit()\" data-key=\"{key}\">{lb}{inner}{rb}</span>",
                        key = escape_attr(key),
                        lb = span("c", "│"),
                        inner = inner,
                        rb = span("c", "│"),
                    )
                } else {
                    format!(
                        "{lb}{inner}{rb}",
                        lb = span("c", "│"),
                        inner = inner,
                        rb = span("c", "│"),
                    )
                };
                lines.push(row);
            }
        }
    }

    // Bottom border.
    lines.push(span("c", &format!("└{}┘", "─".repeat(MENU_INNER))));

    lines.join("\n")
}

/// Render the title strip at the top of every content page. Only a single
/// [M]enu link follows the title bar — full per-page hotkey navigation lives
/// only on the main menu.
fn render_page_nav(
    _config: &SiteConfig,
    _current_id: &str,
    current_title_upper: &str,
    _all_pages: &[RenderedPage],
) -> String {
    let mut nav = String::new();
    nav.push_str(&span("c", &"═".repeat(RULE_WIDTH)));
    nav.push('\n');
    nav.push_str(&format!(
        " {}",
        span("W", &format!("■ {}", escape_html(current_title_upper)))
    ));
    nav.push('\n');
    nav.push_str(&span("c", &"═".repeat(RULE_WIDTH)));
    nav.push('\n');

    // Title-bar [M]enu link: clickable + hotkey-addressable, but not in the
    // arrow-nav rotation. Sub-pages don't need a focus highlight on their
    // single back-link.
    let menu_link = format!(
        "<a class=\"ml\" href=\"/\" data-key=\"M\">{lb}{ks}{rb}</a>",
        lb = span("d", "["),
        ks = span("Y", "M"),
        rb = span("d", "]enu"),
    );
    nav.push(' ');
    nav.push_str(&menu_link);

    nav
}

fn render_page_footer() -> String {
    format!(
        "{}\n <a class=\"ml\" href=\"/\" data-key=\"M\">{press} {bracket}{key}{bracket_close} {tail}</a>\n\n{prompt}",
        span("c", &"─".repeat(RULE_WIDTH)),
        press = span("Y", "Press"),
        bracket = span("W", "["),
        key = span("W", "M"),
        bracket_close = span("W", "]"),
        tail = span("Y", "to return to Main Menu"),
        prompt = render_prompt(),
    )
}

/// The blinking-cursor prompt line shown at the bottom of every screen.
fn render_prompt() -> String {
    " <span id=\"bbs-prompt\"><span class=\"G\">Command &gt;</span> <span class=\"cur\"></span></span>".to_string()
}

// ===========================================================================
// Document wrapper
// ===========================================================================

struct PageMeta {
    title: String,
    description: String,
    canonical: String,
    og_type: &'static str,
    og_title: String,
}

const STATUS_INTRO: &str = " ALT-D Dial │ ALT-H Hangup │ ALT-X Exit │ F1 Phonebook";
const STATUS_CONNECTED: &str =
    " ALT-H Help │ ALT-Z Hangup │ 115200,8N1 │ ANSI │ Node 1 │ bbs-build";

fn wrap_html(meta: &PageMeta, body: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{og_title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta name="generator" content="bbs-build">
<link rel="stylesheet" href="/assets/bbs.css">
</head>
<body class="loading">{body}<script src="/assets/bbs.js"></script>
</body>
</html>
"#,
        title = escape_attr(&meta.title),
        desc = escape_attr(&meta.description),
        canonical = escape_attr(&meta.canonical),
        og_type = meta.og_type,
        og_title = escape_attr(&meta.og_title),
        body = body,
    )
}

// ===========================================================================
// Helpers
// ===========================================================================

fn span(cls: &str, content: &str) -> String {
    format!("<span class=\"{}\">{}</span>", cls, content)
}

fn no_empty<'a>(s: &'a str, fallback: &'a str) -> &'a str {
    if s.is_empty() { fallback } else { s }
}

fn pad_to(text: &str, width: usize) -> String {
    let count = text.chars().count();
    if count >= width { text.chars().take(width).collect() } else {
        let mut s = text.to_string();
        s.push_str(&" ".repeat(width - count));
        s
    }
}

fn saturating_pad(visible: &str, target_width: usize) -> String {
    let n = visible.chars().count();
    if n >= target_width { String::new() } else { " ".repeat(target_width - n) }
}

/// Pad with spaces so that the *visible text* fills `width` columns. Use this
/// when emitting trailing spaces inside a bordered box: pass the visible-only
/// text (no HTML tags) and append the result after the styled spans.
fn pad_after(visible: &str, width: usize) -> String {
    saturating_pad(visible, width)
}

fn escape_html(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for ch in s.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            _ => out.push(ch),
        }
    }
    out
}

fn escape_attr(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for ch in s.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(ch),
        }
    }
    out
}

/// Encode a slice of strings as a JSON array using only escape semantics that
/// are also valid HTML attribute content (we wrap with single quotes, so we
/// must escape `'`).
fn json_string_array(items: &[String]) -> String {
    let mut out = String::from("[");
    for (i, s) in items.iter().enumerate() {
        if i > 0 { out.push(','); }
        out.push('"');
        for ch in s.chars() {
            match ch {
                '"' => out.push_str("\\\""),
                '\\' => out.push_str("\\\\"),
                '\n' => out.push_str("\\n"),
                '\r' => out.push_str("\\r"),
                '\t' => out.push_str("\\t"),
                '\u{0000}'..='\u{001F}' => {
                    out.push_str(&format!("\\u{:04x}", ch as u32));
                }
                _ => out.push(ch),
            }
        }
        out.push('"');
    }
    out.push(']');
    // Make it safe inside a single-quoted HTML attribute. Escape & first to
    // avoid double-encoding entities we introduce on the next steps.
    let mut safe = String::with_capacity(out.len());
    for ch in out.chars() {
        match ch {
            '&' => safe.push_str("&amp;"),
            '\'' => safe.push_str("&#39;"),
            '<' => safe.push_str("&lt;"),
            _ => safe.push(ch),
        }
    }
    safe
}

/// Compute the description shown in <meta description> and OG tags.
fn effective_description(
    config: &SiteConfig,
    page_desc: Option<&str>,
    page_title: Option<&str>,
) -> String {
    if let Some(d) = page_desc { if !d.is_empty() { return d.to_string(); } }
    if let Some(t) = page_title {
        return format!("{} - {}", t, config.site.tagline);
    }
    if !config.site.tagline.is_empty() {
        return format!("{} — {}", config.site.name, config.site.tagline);
    }
    config.site.name.clone()
}

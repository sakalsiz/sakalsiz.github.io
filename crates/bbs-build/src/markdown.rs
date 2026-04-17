//! BBS markdown renderer. Mirrors `src/bbs-markdown.js` semantics.
//!
//! Output is *only* inline `<span>` and `<a>` elements separated by `\n`,
//! ready to drop into a `white-space: pre` container without breaking the
//! character grid.

use regex::Regex;

pub struct Renderer {
    pub width: usize,
    /// DOTALL color tag regex used during the multi-line pre-pass.
    color_tag_multiline: Regex,
    bold: Regex,
    italic: Regex,
    code: Regex,
    link: Regex,
    hr: Regex,
    bullet: Regex,
    numbered: Regex,
    /// Final pass — convert color sentinels to real `<span>` tags.
    sentinel_open: Regex,
}

/// Sentinel codepoints used to mark color tag boundaries between the multi-line
/// pre-pass and the per-line processor. Both live in the Unicode Private Use
/// Area so they will never collide with user content.
const COLOR_OPEN: char = '\u{E001}';
const COLOR_CLOSE: char = '\u{E002}';

impl Default for Renderer {
    fn default() -> Self {
        Self {
            width: 55,
            color_tag_multiline: Regex::new(r"(?s)\{(\w+)\}(.*?)\{/\}").unwrap(),
            bold: Regex::new(r"\*\*(.+?)\*\*").unwrap(),
            italic: Regex::new(r"\*(.+?)\*").unwrap(),
            code: Regex::new(r"`(.+?)`").unwrap(),
            link: Regex::new(r"\[(.+?)\]\((.+?)\)").unwrap(),
            hr: Regex::new(r"^---+$").unwrap(),
            bullet: Regex::new(r"^\s*[-*]\s+(.*)$").unwrap(),
            numbered: Regex::new(r"^\s*(\d+)\.\s+(.*)$").unwrap(),
            sentinel_open: Regex::new(r"\x{E001}([a-zA-Z]+)\x{E001}").unwrap(),
        }
    }
}

impl Renderer {
    /// Render plain text with `{color}...{/}` color tags expanded and any HTML
    /// metacharacters escaped. Use this for things like header ANSI art where
    /// you want author-controlled inline colors but no markdown structure
    /// (no headings, lists, paragraphs).
    pub fn render_inline_only(&self, text: &str) -> String {
        let with_sentinels = self.preprocess_color_tags(text);
        let escaped = escape_html(&with_sentinels);
        self.replace_color_sentinels(&escaped)
    }

    /// Render a markdown document. Frontmatter, if present, is ignored —
    /// callers should pass the body half from `content::split_frontmatter`.
    pub fn render(&self, markdown: &str) -> String {
        // Pre-pass: convert color tags (which can span multiple lines) into
        // sentinel codepoints that survive per-line processing untouched.
        let pre = self.preprocess_color_tags(markdown);

        let mut out: Vec<String> = Vec::new();
        let mut in_code = false;

        for raw_line in pre.lines() {
            let line = raw_line;

            // Fenced code block toggle.
            if line.starts_with("```") {
                in_code = !in_code;
                if in_code {
                    out.push(String::new());
                }
                continue;
            }

            if in_code {
                out.push(span("d", &format!(" {}", escape_html(line))));
                continue;
            }

            // Headings.
            if let Some(text) = line.strip_prefix("## ") {
                out.push(String::new());
                out.push(span("c", &"─".repeat(self.width)));
                out.push(format!(" {}", span("W", &escape_html(text))));
                out.push(span("c", &"─".repeat(self.width)));
                out.push(String::new());
                continue;
            }
            if let Some(text) = line.strip_prefix("# ") {
                out.push(String::new());
                out.push(span("c", &"═".repeat(self.width)));
                out.push(format!(" {}", span("W", &format!("■ {}", escape_html(text)))));
                out.push(span("c", &"═".repeat(self.width)));
                out.push(String::new());
                continue;
            }

            // Horizontal rule.
            if self.hr.is_match(line.trim()) {
                out.push(span("c", &"─".repeat(self.width)));
                continue;
            }

            // Blockquote.
            if let Some(text) = line.strip_prefix("> ") {
                out.push(format!(
                    "  {}",
                    span("d", &format!("│ {}", self.process_inline(text)))
                ));
                continue;
            }

            // Unordered list.
            if let Some(caps) = self.bullet.captures(line) {
                let text = &caps[1];
                out.push(format!(
                    " {} {}",
                    span("Y", "►"),
                    self.process_inline(text)
                ));
                continue;
            }

            // Ordered list.
            if let Some(caps) = self.numbered.captures(line) {
                let n = &caps[1];
                let text = &caps[2];
                out.push(format!(
                    " {} {}",
                    span("Y", &format!("{}.", n)),
                    self.process_inline(text)
                ));
                continue;
            }

            // Empty line.
            if line.trim().is_empty() {
                out.push(String::new());
                continue;
            }

            // Default paragraph line.
            out.push(format!(" {}", self.process_inline(line)));
        }

        // Final pass: replace color sentinels with real <span> tags.
        let joined = out.join("\n");
        self.replace_color_sentinels(&joined)
    }

    /// Replace `{color}...{/}` blocks with sentinel codepoints. Skips fenced
    /// code blocks so authors can write literal `{green}` examples in code.
    fn preprocess_color_tags(&self, md: &str) -> String {
        let mut prose = String::new();
        let mut out = String::with_capacity(md.len());
        let mut in_code = false;

        for line in md.split_inclusive('\n') {
            let stripped = line.trim_end_matches('\n');
            if stripped.starts_with("```") {
                if !in_code {
                    out.push_str(&self.substitute_color_tags(&prose));
                    prose.clear();
                }
                out.push_str(line);
                in_code = !in_code;
                continue;
            }
            if in_code {
                out.push_str(line);
            } else {
                prose.push_str(line);
            }
        }
        if !prose.is_empty() {
            out.push_str(&self.substitute_color_tags(&prose));
        }
        out
    }

    fn substitute_color_tags(&self, prose: &str) -> String {
        self.color_tag_multiline
            .replace_all(prose, |caps: &regex::Captures| {
                let cls = color_class(&caps[1]);
                format!("{}{}{}{}{}", COLOR_OPEN, cls, COLOR_OPEN, &caps[2], COLOR_CLOSE)
            })
            .into_owned()
    }

    fn replace_color_sentinels(&self, s: &str) -> String {
        let opened = self
            .sentinel_open
            .replace_all(s, |caps: &regex::Captures| {
                format!("<span class=\"{}\">", &caps[1])
            });
        opened.replace(COLOR_CLOSE, "</span>")
    }

    /// Apply inline transformations: bold, italic, code, links.
    /// Color tags are handled in the document-level pre-pass (see
    /// `preprocess_color_tags`) so they can span multiple lines.
    fn process_inline(&self, text: &str) -> String {
        let escaped = escape_html(text);

        // Bold first (consumes **...** before italic sees the asterisks).
        let s = self.bold.replace_all(&escaped, |caps: &regex::Captures| {
            format!("<span class=\"W\">{}</span>", &caps[1])
        });

        // Italic.
        let s = self.italic.replace_all(&s, |caps: &regex::Captures| {
            format!("<span class=\"C\">{}</span>", &caps[1])
        });

        // Inline code.
        let s = self.code.replace_all(&s, |caps: &regex::Captures| {
            format!("<span class=\"d\">{}</span>", &caps[1])
        });

        // Links.
        let s = self.link.replace_all(&s, |caps: &regex::Captures| {
            format!(
                "<a href=\"{}\" target=\"_blank\" rel=\"noopener\">{}</a>",
                &caps[2], &caps[1]
            )
        });

        s.into_owned()
    }
}

fn span(cls: &str, content: &str) -> String {
    format!("<span class=\"{}\">{}</span>", cls, content)
}

/// Map color names to CSS classes (matches BBSMarkdown.COLORS in JS).
fn color_class(name: &str) -> &'static str {
    match name {
        "black" => "k",
        "blue" => "b",
        "green" => "g",
        "cyan" => "c",
        "red" => "r",
        "magenta" => "m",
        "brown" => "br",
        "gray" | "darkgray" => "d",
        "lightblue" => "B",
        "lightgreen" => "G",
        "lightcyan" => "C",
        "lightred" => "R",
        "lightmagenta" => "M",
        "yellow" => "Y",
        "white" => "W",
        _ => "w",
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_paragraph_with_color_tag() {
        let r = Renderer::default();
        let out = r.render("Hello {yellow}world{/}.");
        assert!(out.contains("<span class=\"Y\">world</span>"));
    }

    #[test]
    fn renders_bullet_list() {
        let r = Renderer::default();
        let out = r.render("- one\n- two");
        assert!(out.contains("<span class=\"Y\">►</span> one"));
        assert!(out.contains("<span class=\"Y\">►</span> two"));
    }

    #[test]
    fn renders_h1_with_marker() {
        let r = Renderer::default();
        let out = r.render("# Hello");
        assert!(out.contains("■ Hello"));
        assert!(out.contains(&"═".repeat(55)));
    }

    #[test]
    fn escapes_html_in_paragraphs() {
        let r = Renderer::default();
        let out = r.render("a < b & c");
        assert!(out.contains("a &lt; b &amp; c"));
    }
}

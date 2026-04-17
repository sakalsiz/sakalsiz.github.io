//! Loaders for markdown content (pages + blog posts).

use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context, Result};
use serde::Deserialize;
use walkdir::WalkDir;

#[derive(Debug, Default, Deserialize)]
pub struct Frontmatter {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub menu_key: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub draft: bool,
}

pub struct Page {
    pub path: PathBuf,
    pub frontmatter: Frontmatter,
    pub body: String,
}

pub struct BlogPost {
    pub slug: String,
    pub title: String,
    pub date: String,
    pub tags: Vec<String>,
    pub description: Option<String>,
    pub body: String,
}

/// Load a single .md page. Returns Page even if frontmatter is absent.
pub fn load_page(path: &Path) -> Result<Page> {
    let raw = fs::read_to_string(path)
        .with_context(|| format!("reading {}", path.display()))?;
    let (fm, body) = split_frontmatter(&raw)?;
    Ok(Page {
        path: path.to_path_buf(),
        frontmatter: fm,
        body,
    })
}

/// Load every non-draft .md file in `dir`, sorted newest-first by frontmatter date
/// (or filename date prefix as a fallback).
pub fn load_blog_posts(dir: &Path) -> Result<Vec<BlogPost>> {
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut posts: Vec<BlogPost> = Vec::new();
    for entry in WalkDir::new(dir).max_depth(1).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() { continue; }
        if path.extension().and_then(|s| s.to_str()) != Some("md") { continue; }

        let page = load_page(path)?;
        if page.frontmatter.draft { continue; }

        let file_stem = path.file_stem().and_then(|s| s.to_str())
            .ok_or_else(|| anyhow!("invalid filename: {}", path.display()))?;

        // Filename convention: YYYY-MM-DD-slug.md → strip date prefix for slug.
        let (file_date, slug) = parse_slug(file_stem);
        let date = page.frontmatter.date.clone()
            .or(file_date)
            .unwrap_or_else(|| "1970-01-01".to_string());
        let title = page.frontmatter.title.clone()
            .unwrap_or_else(|| slug.clone());

        posts.push(BlogPost {
            slug,
            title,
            date,
            tags: page.frontmatter.tags,
            description: page.frontmatter.description,
            body: page.body,
        });
    }

    // Newest first.
    posts.sort_by(|a, b| b.date.cmp(&a.date));
    Ok(posts)
}

/// Split `---\n...---\n` frontmatter from body. If absent, returns default frontmatter
/// and the original body.
fn split_frontmatter(raw: &str) -> Result<(Frontmatter, String)> {
    let trimmed = raw.trim_start_matches('\u{feff}');
    if !trimmed.starts_with("---") {
        return Ok((Frontmatter::default(), raw.to_string()));
    }
    // Find the closing ---. It must be on a line by itself.
    let after_open = &trimmed[3..];
    let after_open = after_open.strip_prefix('\n').unwrap_or(after_open);

    if let Some(end_idx) = find_closing_fence(after_open) {
        let yaml = &after_open[..end_idx];
        let rest = &after_open[end_idx..];
        let rest = rest.strip_prefix("---").unwrap_or(rest);
        let rest = rest.strip_prefix('\n').unwrap_or(rest);
        let fm: Frontmatter = if yaml.trim().is_empty() {
            Frontmatter::default()
        } else {
            serde_yml::from_str(yaml).context("parsing frontmatter YAML")?
        };
        Ok((fm, rest.to_string()))
    } else {
        // No closing fence — treat whole file as body.
        Ok((Frontmatter::default(), raw.to_string()))
    }
}

/// Find the byte index where a `---` line starts (line of just `---`).
fn find_closing_fence(s: &str) -> Option<usize> {
    let mut idx = 0;
    for line in s.split_inclusive('\n') {
        let stripped = line.trim_end_matches('\n').trim_end_matches('\r');
        if stripped == "---" {
            return Some(idx);
        }
        idx += line.len();
    }
    None
}

/// Pull a YYYY-MM-DD prefix off a filename stem. Returns (date, slug).
fn parse_slug(stem: &str) -> (Option<String>, String) {
    if stem.len() >= 11 && stem.as_bytes()[10] == b'-' {
        let date = &stem[..10];
        let bytes = date.as_bytes();
        let is_date = bytes[4] == b'-'
            && bytes[7] == b'-'
            && bytes[..4].iter().all(|b| b.is_ascii_digit())
            && bytes[5..7].iter().all(|b| b.is_ascii_digit())
            && bytes[8..10].iter().all(|b| b.is_ascii_digit());
        if is_date {
            return (Some(date.to_string()), stem[11..].to_string());
        }
    }
    (None, stem.to_string())
}

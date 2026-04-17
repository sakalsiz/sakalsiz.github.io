//! Typed view of `content/site.yaml`.

use std::collections::HashMap;
use std::fs;
use std::path::Path;

use anyhow::{Context, Result};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct SiteConfig {
    pub site: Site,
    #[serde(default)]
    pub terminal: Terminal,
    #[serde(default)]
    pub header: Header,
    #[serde(default)]
    pub menu: Vec<MenuItem>,
    #[serde(default)]
    pub pages: HashMap<String, String>,
    #[serde(default)]
    pub blog: Blog,
    #[serde(default)]
    pub quit: Quit,
    #[serde(default)]
    pub sounds: Sounds,
}

#[derive(Debug, Deserialize)]
pub struct Site {
    pub name: String,
    #[serde(default)]
    pub tagline: String,
    #[serde(default)]
    pub location: String,
    #[serde(default)]
    pub phone: String,
    #[serde(default)]
    pub sysop: String,
    #[serde(default = "default_baud")]
    pub baud: u32,
    #[serde(default = "default_nodes")]
    pub nodes: u32,
    #[serde(default)]
    pub theme: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub base_url: Option<String>,
}

fn default_baud() -> u32 { 14400 }
fn default_nodes() -> u32 { 1 }

#[derive(Debug, Default, Deserialize)]
pub struct Terminal {
    #[serde(default)]
    pub software: String,
    #[serde(default)]
    pub com_port: String,
    #[serde(default)]
    pub modem: String,
    #[serde(default)]
    pub emulation: String,
    #[serde(default)]
    pub parity: String,
}

#[derive(Debug, Default, Deserialize)]
pub struct Header {
    #[serde(rename = "type", default)]
    pub kind: String,
    #[serde(default)]
    pub art: String,
}

/// A single line in the main menu. Either a normal entry or a separator.
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum MenuItem {
    Separator { separator: bool },
    Entry {
        key: String,
        label: String,
        #[serde(default)]
        target: Option<String>,
        #[serde(default)]
        action: Option<String>,
    },
}

impl MenuItem {
    pub fn is_separator(&self) -> bool {
        matches!(self, MenuItem::Separator { .. })
    }

    pub fn as_entry(&self) -> Option<MenuEntry<'_>> {
        match self {
            MenuItem::Entry { key, label, target, action } => Some(MenuEntry {
                key, label, target: target.as_deref(), action: action.as_deref(),
            }),
            _ => None,
        }
    }
}

pub struct MenuEntry<'a> {
    pub key: &'a str,
    pub label: &'a str,
    pub target: Option<&'a str>,
    pub action: Option<&'a str>,
}

#[derive(Debug, Deserialize)]
pub struct Blog {
    #[serde(default = "default_posts_dir")]
    pub posts_dir: String,
    #[serde(default = "default_posts_per_page")]
    pub posts_per_page: u32,
    #[serde(default)]
    pub date_format: Option<String>,
}

impl Default for Blog {
    fn default() -> Self {
        Self {
            posts_dir: default_posts_dir(),
            posts_per_page: default_posts_per_page(),
            date_format: None,
        }
    }
}

fn default_posts_dir() -> String { "blog/".into() }
fn default_posts_per_page() -> u32 { 10 }

#[derive(Debug, Default, Deserialize)]
pub struct Quit {
    #[serde(default)]
    pub messages: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct Sounds {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_true")]
    pub dial_tones: bool,
    #[serde(default = "default_true")]
    pub ring: bool,
    #[serde(default = "default_true")]
    pub modem_negotiation: bool,
    #[serde(default = "default_true")]
    pub disconnect: bool,
}

impl Default for Sounds {
    fn default() -> Self {
        Self {
            enabled: true,
            dial_tones: true,
            ring: true,
            modem_negotiation: true,
            disconnect: true,
        }
    }
}

fn default_true() -> bool { true }

impl SiteConfig {
    pub fn load(path: &Path) -> Result<Self> {
        let raw = fs::read_to_string(path)
            .with_context(|| format!("reading {}", path.display()))?;
        let cfg: SiteConfig = serde_yml::from_str(&raw)
            .with_context(|| format!("parsing {}", path.display()))?;
        Ok(cfg)
    }

    /// Iterate menu entries (skipping separators) that point to a content page,
    /// preserving menu order.
    pub fn nav_entries(&self) -> impl Iterator<Item = MenuEntry<'_>> {
        self.menu.iter().filter_map(|item| {
            let entry = item.as_entry()?;
            // Skip Quit and Blog from nav-link lists; they're rendered separately.
            if entry.action.is_some() { return None; }
            entry.target?;
            Some(entry)
        })
    }
}

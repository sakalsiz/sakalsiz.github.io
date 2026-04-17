//! bbs-build — compile a BBS-style site from site.yaml + markdown.

// Many config struct fields are parsed for forward compatibility but not yet
// consumed by the renderer. Silence the dead-code noise so genuine warnings
// remain visible.
#![allow(dead_code)]

mod build;
mod config;
mod content;
mod markdown;
mod template;

use std::path::PathBuf;

use anyhow::Result;
use clap::Parser;

/// Compile a BBS-style site to static HTML.
#[derive(Debug, Parser)]
#[command(name = "bbs-build", version, about)]
struct Cli {
    /// Path to the project root (must contain content/site.yaml).
    #[arg(short, long, default_value = ".")]
    root: PathBuf,

    /// Output directory (relative to root, or absolute).
    #[arg(short, long, default_value = "dist")]
    out: PathBuf,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    build::run(&cli.root, &cli.out)
}

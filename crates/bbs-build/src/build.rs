//! Build orchestration: read config, render every page, write to dist/.

use std::fs;
use std::path::Path;

use anyhow::{Context, Result};

use crate::config::SiteConfig;
use crate::content::{load_blog_posts, load_page};
use crate::markdown::Renderer;
use crate::template;

/// Run a full build.
pub fn run(root: &Path, out: &Path) -> Result<()> {
    let out = if out.is_absolute() {
        out.to_path_buf()
    } else {
        root.join(out)
    };

    let cfg_path = root.join("content/site.yaml");
    let config = SiteConfig::load(&cfg_path)
        .with_context(|| format!("failed to load {}", cfg_path.display()))?;

    println!("==> bbs-build");
    println!("    root: {}", root.display());
    println!("    out:  {}", out.display());
    println!("    site: {}", config.site.name);

    // Wipe and recreate dist/.
    if out.exists() {
        fs::remove_dir_all(&out)
            .with_context(|| format!("failed to clean {}", out.display()))?;
    }
    fs::create_dir_all(&out)?;

    // Shared assets (CSS + JS) live under dist/assets/.
    let assets_dir = out.join("assets");
    fs::create_dir_all(&assets_dir)?;
    fs::write(assets_dir.join("bbs.css"), template::CSS)?;
    fs::write(assets_dir.join("bbs.js"), template::JS)?;

    // CNAME file for GitHub Pages custom domain.
    if let Some(ref base_url) = config.site.base_url {
        let domain = base_url.trim_start_matches("https://").trim_start_matches("http://").trim_end_matches('/');
        if !domain.is_empty() {
            fs::write(out.join("CNAME"), domain)?;
        }
    }
    fs::write(out.join("favicon.ico"), template::FAVICON)?;

    let renderer = Renderer::default();

    // Load and render every content page.
    let content_dir = root.join("content");
    let mut rendered_pages: Vec<RenderedPage> = Vec::new();
    for (id, rel_path) in &config.pages {
        let md_path = content_dir.join(rel_path);
        if !md_path.exists() {
            eprintln!("    skip {}: {} not found", id, md_path.display());
            continue;
        }
        let page = load_page(&md_path)
            .with_context(|| format!("failed to load {}", md_path.display()))?;
        let body_html = renderer.render(&page.body);
        rendered_pages.push(RenderedPage {
            id: id.clone(),
            title: page.frontmatter.title.unwrap_or_else(|| id.clone()),
            description: page.frontmatter.description,
            body_html,
        });
    }

    // Load blog posts (sorted newest first).
    let blog_dir = content_dir.join(config.blog.posts_dir.trim_end_matches('/'));
    let blog_posts = load_blog_posts(&blog_dir)
        .with_context(|| format!("failed to load blog posts from {}", blog_dir.display()))?;

    // ===== Write intro page (CRT dialer at /) =====
    let intro_html = template::render_intro_page(&config);
    fs::write(out.join("index.html"), intro_html)?;
    println!("    wrote index.html (intro)");

    // ===== Write main BBS page (header + menu at /main/) =====
    let main_dir = out.join("main");
    fs::create_dir_all(&main_dir)?;
    let main_html = template::render_main_page(&config, &renderer);
    fs::write(main_dir.join("index.html"), main_html)?;
    println!("    wrote main/index.html");

    // ===== Write per-page pages =====
    for page in &rendered_pages {
        let dir = out.join(&page.id);
        fs::create_dir_all(&dir)?;
        let html = template::render_page(&config, page, &rendered_pages);
        fs::write(dir.join("index.html"), html)?;
        println!("    wrote {}/index.html", page.id);
    }

    // ===== Write blog index + per-post pages =====
    let blog_out = out.join("blog");
    fs::create_dir_all(&blog_out)?;
    let blog_index_html = template::render_blog_index(&config, &blog_posts, &rendered_pages);
    fs::write(blog_out.join("index.html"), blog_index_html)?;
    println!("    wrote blog/index.html");

    for (i, post) in blog_posts.iter().enumerate() {
        let post_dir = blog_out.join(&post.slug);
        fs::create_dir_all(&post_dir)?;
        let body_html = renderer.render(&post.body);
        // Posts are sorted newest first. We follow the index ordering:
        //   [P]rev  -> the post above this one in the index (newer)
        //   [N]ext  -> the post below this one in the index (older)
        // So that pressing N from post #1 advances to post #2 in the list.
        let prev = if i > 0 { Some(&blog_posts[i - 1]) } else { None };
        let next = if i + 1 < blog_posts.len() {
            Some(&blog_posts[i + 1])
        } else {
            None
        };
        let html = template::render_blog_post(
            &config,
            post,
            &body_html,
            prev,
            next,
            &rendered_pages,
        );
        fs::write(post_dir.join("index.html"), html)?;
        println!("    wrote blog/{}/index.html", post.slug);
    }

    println!("==> done. {} page(s), {} blog post(s).",
             rendered_pages.len(), blog_posts.len());
    Ok(())
}

/// A page after markdown rendering, ready for templating.
pub struct RenderedPage {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub body_html: String,
}

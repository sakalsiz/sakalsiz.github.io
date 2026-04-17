---
title: "From HTML to Rust: Rewriting the Build"
date: 2026-04-13
tags: [rust, build, framework]
description: Why I moved bbs-css from a single hand-edited HTML file to a proper Rust static site generator.
---

When I started this site, the entire thing was {yellow}one HTML file{/}.

That was on purpose. Single files are easy to reason about. The
file was the source, the file was the build, the file was the
deploy. No tools, no compilation, no surprises. You opened it in
a browser and it worked.

It also did not scale.

## The breaking point

Once I had more than two pages of content, the cost of a single
HTML file showed up everywhere. Every typo fix meant editing a
specific row inside a specific bordered box that had to keep
exactly 80 visible characters per line, including invisible color
spans. Every new menu entry meant updating the menu box AND every
page's nav strip. Adding a blog post meant pasting markdown into
HTML, then hand-converting bullets and color tags.

I needed a build step.

## Why Rust

I had three options on the table:

 {lightcyan}▓▓{/} {white}JavaScript{/}: would have shipped today.
    Mature ecosystem, the renderer was already half-written in JS.

 {lightgreen}▓▓{/} {white}Go{/}: simple, fast, fine for SSGs.
    No real reason to pick it over the next one.

 {yellow}▓▓{/} {white}Rust{/}: I wanted to learn it.

Static site generators are a canonical Rust learning project. The
scope is contained. The output is immediately visible. Every piece
touches a core concept: ownership, error handling with `Result`,
serde for config, `regex` for the markdown engine, `include_str!`
for embedding the CSS and JS into the binary.

I picked Rust. The project became `bbs-build`.

## What I built

A Cargo workspace with one binary crate. About eight hundred lines
of Rust. The CLI reads `content/site.yaml`, walks `content/pages/`
and `content/blog/`, renders markdown to BBS-style inline-span HTML,
and writes per-page output to `dist/`. Each page gets its own
`<title>`, `<meta description>`, `<link rel="canonical">`, and
OpenGraph tags. Search engines and link unfurlers see real content.

The whole compile takes {white}under a second{/} after the first run.

## What I learned

Rust is not as scary as the discourse claims. Most of what I
hit was the borrow checker telling me, accurately, that something
I tried to do was wrong. The compiler errors are some of the best
I've ever read. `cargo` makes the toolchain almost invisible.

The hardest part was {gray}not the language{/}. It was deciding what
the build OUTPUT should look like. Single self-contained HTML?
Multiple per-page HTML files for SEO? Hybrid with hydration? I
went with multi-page static, no client-side markdown rendering.
Each page is independently servable. The Rust binary owns the
rendering pipeline. JavaScript only handles interaction.

Clean separation. Easy to reason about. Easy to ship.

## Up next

I want to extract a `bbs-core` shared crate so that a future TUI
client written in Rust can reuse the same parser and content model.
SSH into a BBS in 2026. {green}Why not.{/}

{gray}--- END OF MESSAGE ---{/}

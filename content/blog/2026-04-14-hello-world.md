---
title: "Hello World: Why I Built a BBS Homepage in 2026"
date: 2026-04-14
tags: [bbs, nostalgia, web, personal]
description: Why a founder in California built his personal homepage to look and sound like a 1993 bulletin board system. It starts with a kid in Alanya, Turkey.
---

Some things deserve to stay simple.

The modern web is a bloated mess of JavaScript frameworks, cookie
banners, and autoplaying videos. Meanwhile, the most honest form
of self-expression on the internet was always the BBS - a single
phone line, a dedicated machine, and a SysOp who cared.

## The real reason

I grew up in {lightcyan}Alanya{/}, a small town on Turkey's
Mediterranean coast. No internet. No software community. No one
to ask when the code didn't compile. I taught myself {yellow}
MS-DOS{/}, {yellow}GW-BASIC{/}, {yellow}Pascal{/}, {yellow}C{/},
and {yellow}x86 assembly{/} from books I bought on summer trips to
Ankara. Alone, in a bedroom, in a town where nobody else cared
about computers.

Then I bought a {white}14.4k modem{/}. I was in middle school.

I dialed a BBS in Ankara and watched text scroll across my screen
from someone else's machine, hundreds of kilometers away. I found
{lightcyan}HitNet{/}, Turkey's FidoNet-compatible network. I found
echomail conferences full of people who cared about the same things
I did. I found a {green}community{/}.

That modem changed my life. Not metaphorically. Literally. It
turned programming from something I did alone into something I did
with other people. It showed me that computers were not just
machines you typed into. They were {white}bridges{/}.

## Why a BBS homepage in 2026

Because I wanted to build a tribute to that era. The technologies
from that time - FidoNet, echomail, ANSI art, offline readers,
the sound of a modem handshake - had a {yellow}huge impact{/} on
who I became. They deserve better than a Wikipedia article.

And because the constraints of that era produced something that
the modern web has lost:

- {lightgreen}Loads instantly.{/} No framework, no build pipeline
  that takes longer than the content is worth. One HTML file per
  page, pre-rendered, ready to go.
- {lightgreen}Respects the terminal.{/} Monospace. 16 colors.
  Every character in its place. No layout shift, no responsive
  breakpoints, no font loading jank.
- {lightgreen}Doesn't track you.{/} No cookies. No analytics. No
  third-party scripts. The SysOp doesn't need to know your
  browsing habits. He just wants you to read the echomail.
- {lightgreen}Makes modem noises.{/} Because some experiences are
  worth preserving in their original form, including the ten
  seconds of screeching that meant you were about to be connected
  to something bigger than yourself.

## The stack

The site is built with {cyan}bbs-build{/}, a Rust CLI I wrote as
a way to learn the language. It reads markdown and a YAML config,
renders everything to BBS-style inline-span HTML, and outputs one
page per URL with proper SEO metadata. The modem sounds are
synthesized in real time via the Web Audio API. The font is PxPlus
IBM VGA 8x16, the authentic IBM VGA font that makes the box-
drawing characters align.

No npm. No React. No webpack. Rust compiles the content, the
browser renders it, and the caller reads it.

## What this site is for

It's my homepage. It's a blog about the BBS era. It's a working
demonstration of a framework that anyone can use to build their
own BBS-style site.

But mostly it's a letter to a kid in Alanya who plugged a modem
into a phone line and discovered that {yellow}the world was bigger
than his town{/}.

{gray}--- END OF MESSAGE ---{/}

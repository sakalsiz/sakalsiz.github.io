---
title: "Arrow Keys and Other Time Machines"
date: 2026-04-15
tags: [bbs, ux, retro]
description: Why arrow-key navigation still matters, and how it found its way back into bbs-css.
---

A small thing happened today. I added arrow-key navigation to the
{cyan}main menu{/}. Up and down move a blue highlight bar through the
menu items, Enter selects, and the keyboard hotkey letters still
work like before. Vim keys too, because of course they do.

It is the most {yellow}small{/} feature you can imagine. It is also
the feature that takes a website and makes it feel like a {green}BBS{/}.

## Why arrow keys, in 2026

Modern websites assume a mouse. Touchscreens make that worse. The
hotkey letter system in early BBSes was {white}not a constraint{/}.
It was a {white}choice{/}. You could press a single key and be
somewhere new. No targeting, no clicking, no waiting for layout
shift to settle before you knew where the link was.

Arrow keys with a moving highlight bar are the same idea, just
slightly more relaxed. You don't have to remember the hotkey for
{lightcyan}File Area{/}. You can just look at the screen, see where
you are, and move.

## What I added

 {lightgreen}▓▓{/} {white}↑/↓ and ←/→{/}: move the highlight
 {lightgreen}▓▓{/} {white}j/k and h/l{/}: same, for the vim crowd
 {lightgreen}▓▓{/} {white}Home/End{/}: jump to first or last item
 {lightgreen}▓▓{/} {white}Enter or Space{/}: activate
 {lightgreen}▓▓{/} {white}Esc{/}: back to main menu from anywhere
 {lightgreen}▓▓{/} {white}Mouse hover{/}: highlight follows the cursor

The whole thing is about thirty lines of JavaScript. The framework
already marked every nav link with a `data-menu-item` attribute, so
the runtime just collects them and tracks which one is focused.

## On nostalgia as constraint

I keep coming back to this idea. The BBS aesthetic is not just a
visual style. It is a {yellow}constraint set{/}. 80 columns. 16
colors. Single key input. Sound effects authored in code, not
loaded from disk. Every constraint is a tiny budget that forces
you to spend it on what matters.

The result is a site that loads in {white}under 100 milliseconds{/}
and weighs less than a single Twitter avatar.

{gray}Press [B] to go back to the blog index, or hit Esc to bail out.{/}

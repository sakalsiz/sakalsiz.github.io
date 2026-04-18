---
title: "Telnet BBSes: The Dial Tone Goes Digital"
date: 2026-04-17
tags: [bbs, telnet, mutt, history]
description: When the modem era ended, BBSes tried to survive on Telnet. Many of them borrowed their terminal code from an unlikely source. The email client Mutt.
---

By {yellow}1996{/} the writing was on the wall. The web was
winning. Callers were disappearing. Phone lines were expensive
and the internet was cheap.

But some SysOps refused to shut down. They had communities,
message bases, file areas, door games. Years of work. They
were not going to let it die because modems became obsolete.

The answer was {white}Telnet{/}.

## The migration

Telnet was already everywhere. It was the standard way to get
a remote terminal on any Unix box. And that is exactly what a
BBS was. A terminal interface on a remote machine.

The migration path looked like this:

 {lightcyan}▓▓{/} {white}Keep the BBS software running{/} exactly
    as before. RemoteAccess, Renegade, Mystic, Synchronet,
    whatever you had.
 {lightcyan}▓▓{/} {white}Replace the modem{/} with a Telnet-to-
    serial redirector. Programs like {yellow}NetModem{/} or
    {yellow}SIO/VMODEM{/} made the BBS software think it was
    still talking to a modem. It was talking to a TCP socket
    instead.
 {lightcyan}▓▓{/} {white}Get an IP address{/}. Static if you
    could afford it. DynDNS if you could not.
 {lightcyan}▓▓{/} {white}Post your Telnet address{/} on the BBS
    lists. telnet://yourbbs.dyndns.org:23.

Some boards made the jump in a weekend. The BBS software
never knew the difference. It still sent ANSI escape codes. It
still expected a terminal on the other end.

The problem was {gray}what was on the other end{/}.

## The terminal problem

On dial-up, the caller ran a terminal program. Terminate,
Telix, QmodemPro, Telemate. These programs knew ANSI. They
rendered box-drawing characters, handled color codes, managed
file transfers with Zmodem.

On the internet, people had {white}web browsers{/}. They had
email. They did not have ANSI terminal emulators sitting around.

Windows had a basic Telnet client built in. It worked, but it
mangled ANSI art. Colors were wrong. Box characters did not
render. It was ugly.

The BBS scene needed a proper terminal. And a surprising amount
of the code that powered these terminals came from one place.

## The Mutt connection

{white}Mutt{/} was an email client for Unix terminals. Written
in {yellow}C{/}, released in {yellow}1995{/} by Michael Elstrott.
It was small, fast, and most importantly it had a solid terminal
handling layer.

Mutt's {lightcyan}strstrstrstr{/} code handled:

 {green}▓▓{/} {white}ANSI escape sequence parsing{/}. The same
    CSI sequences that BBSes used for color and cursor movement.
 {green}▓▓{/} {white}Terminal resizing{/}. Detecting and adapting
    to window size changes.
 {green}▓▓{/} {white}Character set handling{/}. Including the
    CP437 to UTF-8 mapping that was critical for box-drawing
    characters.
 {green}▓▓{/} {white}Keyboard input processing{/}. Translating
    terminal key codes into usable input.

This was exactly the hard part of building a BBS terminal
client. The BBS-specific parts (connection management, file
transfer) were straightforward. The terminal emulation was the
nightmare.

Developers building Telnet BBS clients looked at Mutt's
terminal code and thought: {yellow}why rewrite this?{/}

{white}SyncTERM{/}, one of the most popular Telnet BBS clients,
drew heavily on terminal handling patterns established in the
Mutt/ncurses ecosystem. {white}NetRunner{/} and other Windows
BBS terminals borrowed similar approaches. The ANSI parsing
problem had been solved. Mutt was open source. The code was
right there.

## What survived

The Telnet BBS scene never matched the dial-up era in size.
But it survived. Some boards that went online in 1993 are
{white}still running today{/} on Telnet.

The numbers tell the story:

 {yellow}1995{/} {gray}- estimated 60,000 BBSes in North America{/}
 {yellow}1998{/} {gray}- maybe 5,000 still active, half on Telnet{/}
 {yellow}2005{/} {gray}- a few hundred, almost all Telnet{/}
 {yellow}2026{/} {gray}- a stubborn few dozen, plus retro hobbyists{/}

The ones that survived had something the web could not
replicate easily. {lightgreen}Door games{/} like Legend of the
Red Dragon and TradeWars 2002. {lightgreen}ANSI art galleries{/}
that looked wrong in anything but a proper terminal.
{lightgreen}Message bases{/} with 20 years of history.

## The irony

The irony is that Telnet itself is now considered legacy
technology. SSH replaced it for everything serious. Modern
BBS clients tunnel through SSH or use web-based terminal
emulators running in the browser.

We went from {cyan}modems to Telnet to SSH to a web browser
pretending to be a terminal{/}.

Full circle. The BBS refuses to die. It just keeps finding
new wires to travel on.

{gray}--- NO CARRIER ---{/}

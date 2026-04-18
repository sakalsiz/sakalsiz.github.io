---
title: "Telnet BBSes: The Dial Tone Goes Digital"
date: 2026-04-17
tags: [bbs, telnet, mud, history]
description: When the modem era ended, BBSes tried to survive on Telnet. The terminal code that kept them alive was borrowed from an unlikely neighbor. MUD clients.
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

The BBS scene needed a proper terminal. And the code that
solved this problem came from an unlikely neighbor.

## The MUD connection

{white}MUDs{/} (Multi-User Dungeons) had been running on Telnet
since the late {yellow}1980s{/}. Text-based RPGs where dozens of
players explored the same world simultaneously. They were the
MMOs before MMOs existed.

MUD players needed clients that could handle the exact same
problems BBS callers now faced:

 {green}▓▓{/} {white}Telnet connection management{/}. Connect to
    a remote host over TCP, keep the session alive, handle
    disconnects gracefully.
 {green}▓▓{/} {white}ANSI escape sequence parsing{/}. MUDs used
    the same CSI color codes that BBSes did. Bold, blink,
    foreground, background, cursor positioning.
 {green}▓▓{/} {white}Character set handling{/}. Including the
    CP437 box-drawing characters that ANSI art depended on.
 {green}▓▓{/} {white}Keyboard input processing{/}. Translating
    terminal key sequences into usable input, handling function
    keys and arrow keys properly.

By the mid-90s, MUD clients had already solved all of this.
{yellow}zMUD{/} (1995) by Zugg Software was a polished Windows
client with full ANSI color rendering, triggers, aliases, and
scripting. {yellow}TinTin++{/} was the Unix equivalent, open
source and battle-tested. {yellow}MUSHclient{/} handled ANSI
and Telnet negotiations with precision.

BBS terminal developers looked at MUD client code and thought:
{yellow}why rewrite this?{/}

The Telnet layer, the ANSI parser, the character set mapping,
the input handler. MUD clients had been doing this for years.
{white}SyncTERM{/}, {white}NetRunner{/}, and other Telnet BBS
clients borrowed heavily from the patterns and sometimes the
actual code that MUD clients had established.

Two communities that had been running parallel text-mode
worlds on opposite sides of the internet finally shared a
codebase.

## What survived

The Telnet BBS scene never matched the dial-up era in size.
But it survived. Some boards that went online in 1993 are
{white}still running today{/} on Telnet.

The numbers tell the story:

 {yellow}1994{/} {gray}- estimated 60,000 BBSes in North America{/}
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

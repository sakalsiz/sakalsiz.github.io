---
title: "How BBSes Actually Exchanged Messages"
date: 2026-04-01
tags: [bbs, fidonet, networking]
description: The nightly mechanical reality of moving mail between BBSes - phone bills, ZMH, packets, compression, and 28.8k of pure determination.
---

The romantic version: messages flowed across the world overnight.

The {white}actual{/} version: a SysOp's modem dialed another
SysOp's modem, two computers handshook for ten seconds, transferred
a few hundred kilobytes of compressed packets, and hung up. Then
the next pair did the same thing. Eight thousand of these handshakes
happened every night, somewhere on Earth.

## The choreography

A typical mail exchange looked like this:

 {lightcyan}1.{/} Local BBS finishes processing the day's user
    messages. Tosser packs them into `.PKT` files, one per echo
    or per destination node.
 {lightcyan}2.{/} Packer compresses the `.PKT` files into a `.ZIP`
    or `.ARJ` archive. Compression mattered. Phone bills were
    measured per minute.
 {lightcyan}3.{/} {white}Mailer{/} software (BinkleyTerm, Front
    Door, T-Mail) sits at the modem waiting for ZMH or for an
    outbound call slot.
 {lightcyan}4.{/} At {yellow}09:00 UTC{/}, the local node calls its
    hub. The hub answers with a {lightgreen}FTS-0001{/} handshake.
 {lightcyan}5.{/} They negotiate which packets to exchange, swap
    them in both directions using {white}ZMODEM{/}, and hang up.
 {lightcyan}6.{/} The unpacker decompresses incoming packets. The
    tosser routes incoming messages into echoes and NetMail.
 {lightcyan}7.{/} Users call in the next morning, see new messages.

The whole loop ran every twenty-four hours. Bigger nodes ran it
every few hours. Hubs ran it constantly.

## Modem speeds

Speed mattered. Phone time was money. The progression looked like
this:

 {gray}1984:{/} {yellow}300 baud{/}. Bell 103. A page of text
       took a minute. Most early FidoNet ran on these.
 {gray}1986:{/} {yellow}1200/2400 baud{/}. Hayes Smartmodem.
       Text was readable in real time. The real start of FidoNet's
       growth.
 {gray}1991:{/} {yellow}9600 baud{/}. V.32. Real graphics could
       transfer in reasonable time.
 {gray}1994:{/} {yellow}14.4k{/}. V.32bis with V.42bis compression.
       Big files became practical. Door games had backgrounds.
 {gray}1996:{/} {yellow}28.8k / 33.6k{/}. V.34. The peak of FidoNet.
 {gray}1998:{/} {yellow}56k{/}. V.90. By now most users were
       leaving BBSes for the web.

## The phone bill

Hub SysOps in 1992 routinely paid {white}$300 to $1500 per month{/}
in long-distance charges to keep their hub running. They were not
reimbursed. They did it because they liked it. That was the whole
business model of FidoNet.

If you ever wonder why pre-internet community was different from
post-internet community: people {green}paid for it themselves{/}.

{gray}--- END OF MESSAGE ---{/}

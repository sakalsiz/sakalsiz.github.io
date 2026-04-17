---
title: "Nodes and Points: Who Got an Address"
date: 2026-03-24
tags: [bbs, fidonet, networking]
description: The difference between a FidoNet node, a point, and a hub. Or, why your home PC could have a routable address in 1990.
---

FidoNet's address structure looked like this:

 {yellow}Zone:Net/Node.Point{/}

Each piece meant something specific. Each piece corresponded to a
real machine somewhere, owned by a real person.

## Node

A {white}node{/} was a BBS. A full member of FidoNet. It had an
official address handed out by a {lightcyan}Net Coordinator{/}. It
participated in Zone Mail Hour. It was listed in the
{yellow}nodelist{/}, a single text file that everyone on FidoNet
downloaded weekly.

To run a node you needed:

 {lightgreen}▓▓{/} A {white}dedicated phone line{/} (or at least one
    you could leave plugged into the modem during ZMH).
 {lightgreen}▓▓{/} A {white}computer{/} that ran 24/7. Usually a
    386 or 486 in the basement.
 {lightgreen}▓▓{/} {white}Mailer software{/}: BinkleyTerm, Front
    Door, FrontDoor, T-Mail, InterMail.
 {lightgreen}▓▓{/} {white}Tosser software{/}: tossed incoming
    mail packets into the right echo conferences. FastEcho,
    Squish, Crashmail.
 {lightgreen}▓▓{/} A {white}message editor{/} for SysOps and users:
    GoldEd, Msgedit.
 {lightgreen}▓▓{/} The patience of a saint.

## Point

A {white}point{/} was a user. Not a BBS. A person with point
software on their home PC who had registered with a node and got
assigned a sub-address. Points couldn't accept calls from random
people. They polled their {lightcyan}boss node{/} on a schedule to
pick up mail addressed to them.

Point software was lighter than full BBS software. Examples:
{lightcyan}Tobtraz{/}, {lightcyan}Time-Ed{/}, {lightcyan}OPUS Point{/},
and most popular of all, {white}CrossPoint{/} on DOS.

A point could read echomail offline, write replies, and upload
them all at once during a single short call to the boss node. This
was the {yellow}original asynchronous email pattern{/}, ten years
before normal people had email.

## Hub

A {white}hub{/} was a node that volunteered to {lightgreen}aggregate
traffic{/} for several other nodes downstream. Smaller nodes called
the hub. The hub called upstream. Less long-distance for everyone.

Hubs were the unsung heroes of FidoNet. Running a hub meant your
phone bill became somebody else's problem to be grateful for.

## Why this matters

The whole structure was {white}peer-to-peer routing{/} done by
hand, by hobbyists, with no central authority. People volunteered
to be hubs. Coordinators handed out numbers. The nodelist was
maintained collaboratively. No one got paid. The network just
{green}worked{/}.

There is a lesson in there about decentralized networks that the
{gray}Web 3 crowd{/} keeps trying to rediscover.

{gray}--- END OF MESSAGE ---{/}

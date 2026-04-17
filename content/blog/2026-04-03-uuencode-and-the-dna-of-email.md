---
title: "UUEncode and the DNA of Email"
date: 2026-04-03
tags: [bbs, email, fidonet, uuencode, history]
description: How binary files traveled as ASCII text through FidoNet and USENET, and how that hack shaped the email infrastructure we still use today.
---

There was a time when sending a {white}picture{/} to someone over
a network meant converting the raw bytes into {yellow}printable
ASCII characters{/}, pasting the result into a text message, and
hoping the other end knew how to reverse the process.

That technique was called {lightcyan}uuencode{/}. It was invented
in 1980 by Mary Ann Horton at UC Berkeley for UUCP (Unix-to-Unix
Copy). It was ugly. It was wasteful (33% size overhead). It
{green}worked everywhere{/}.

## How uuencode worked

Take a binary file. Read three bytes at a time. Split those 24
bits into four 6-bit groups. Add 32 to each group to push it into
the printable ASCII range (characters 32-95). Write those four
characters. Repeat until done. Wrap the whole thing in a header
and footer:

```
 begin 644 photo.gif
 M1TE&.#=A`0$!`0$!``$!`0$!`0$!`0$!`0(!`0$!`0$!`0$!`0$!`0$!
 M`0$!`P$!`0$!`0$!`0$!`0$!`0$!`0$!`0$!`0$"`0$!`0$!`0$!`0$!
 ...
 end
```

The result was a block of {gray}garbage-looking text{/} that could
travel through any system designed to carry 7-bit ASCII. Email
servers, FidoNet nodes, USENET feeds, even printers. None of them
needed to know what was inside. It was just text.

## Why it mattered on FidoNet

FidoNet's EchoMail and NetMail were {white}text-only{/}. The
message base formats, the packet structure, the tosser software,
the offline readers - everything assumed plain text. If you wanted
to share a binary file in an echo, uuencode was how.

SysOps would post uuencoded files in special echoes:

 {lightcyan}ALT.BINARIES.PICTURES{/} on USENET
 {lightcyan}BIN_FILES{/} on various FidoNet distributions

Users would download the message, save the uuencoded block to a
file, run `uudecode` on it, and get the original binary. If the
file was large, it would be {yellow}split across multiple messages{/}
(part 1 of 7, part 2 of 7, etc.) and you'd have to collect all
parts and concatenate before decoding.

This was normal. Nobody complained. This was how things worked.

## From uuencode to MIME

The problem with uuencode was that it was a {lightred}convention{/},
not a {lightred}standard{/}. Different implementations handled edge
cases differently. Line lengths varied. Headers varied. Splitting
across messages was ad hoc.

In {yellow}1992{/}, Nathaniel Borenstein and Ned Freed published
{white}RFC 1341{/}: MIME (Multipurpose Internet Mail Extensions).
MIME solved the same problem - binary content inside text messages
- but properly:

 {lightgreen}▓▓{/} {white}Base64 encoding{/} replaced uuencode.
    Same basic idea (6-bit groups mapped to printable chars) but
    standardized. Uses A-Z, a-z, 0-9, +, / as the character set.
    Still 33% overhead, but predictable and universal.

 {lightgreen}▓▓{/} {white}Content-Type headers{/} told the receiver
    what the attachment was. `image/jpeg`, `application/pdf`,
    `text/plain`. The receiver did not have to guess.

 {lightgreen}▓▓{/} {white}Multipart messages{/} let a single email
    contain both a text body and one or more attachments, each
    with its own Content-Type and encoding. No more "part 3 of 7"
    manual splitting.

 {lightgreen}▓▓{/} {white}Content-Transfer-Encoding{/} declared
    whether the part was base64, quoted-printable, 7bit, or 8bit.
    The transport layer could handle it correctly without guessing.

Every email you send today uses MIME. Every attachment you open.
Every inline image in an HTML email. The `Content-Type` header
in every HTTP response is also MIME. The web inherited it from
email, which inherited the problem from FidoNet and USENET.

## What EchoMail taught the email engineers

The people who designed MIME were watching FidoNet and USENET. They
saw what worked and what broke:

 {yellow}1.{/} {white}Text-only transport is a feature, not a bug.{/}
    If your transport layer handles text safely, you can encode
    anything as text and send it through. This is why email still
    uses base64 for attachments in 2026. The transport never had
    to change. Only the encoding did.

 {yellow}2.{/} {white}Metadata matters.{/} Uuencoded files had a
    filename in the header but no content type. MIME added content
    type. That single addition made email attachments usable by
    normal people. The receiver's mail client could display an
    image inline or offer to open a PDF because the Content-Type
    told it what to do.

 {yellow}3.{/} {white}Threading works.{/} EchoMail had reply
    threading via MSGID and REPLY kludge lines. USENET had
    Message-ID and References headers. Internet email adopted the
    same pattern: {lightcyan}Message-ID{/}, {lightcyan}In-Reply-To{/},
    {lightcyan}References{/}. Gmail's conversation view is the
    direct descendant of a FidoNet echo reader's threaded message
    display.

 {yellow}4.{/} {white}Store-and-forward is resilient.{/} FidoNet
    mail could take days to arrive. USENET propagation could take
    hours. Email was designed with the same assumption: your message
    might bounce through multiple servers (MX relays) before
    reaching the destination. The SMTP retry-and-queue model is
    the internet version of FidoNet's nightly hub-to-hub polling.

 {yellow}5.{/} {white}Headers are extensible.{/} FidoNet messages
    had "kludge lines" - metadata fields prefixed with a control
    character that were invisible to normal readers but carried
    routing info, charset declarations, and software versions.
    Internet email headers (From, To, Subject, X-Mailer, etc.)
    serve the exact same purpose. The X- prefix convention for
    custom headers is the direct echo of kludge lines.

## The encoding lives on

Base64 is everywhere. Not just email:

- {lightcyan}Data URIs{/} in HTML and CSS embed images as base64.
- {lightcyan}JWT tokens{/} are base64-encoded JSON.
- {lightcyan}SSH keys{/} are base64-encoded binary.
- {lightcyan}S/MIME and PGP{/} sign and encrypt using base64 armor.
- {lightcyan}API payloads{/} frequently base64-encode binary fields.

All of it traces back to the same constraint that Tom Jennings
hit in 1984: the transport layer is text-only. Everything else
must be encoded to fit.

## The lesson

Modern email is a {white}direct descendant{/} of the FidoNet and
USENET era. The addressing (user@domain instead of user@zone:net/
node), the encoding (base64 instead of uuencode), the threading
(References instead of REPLY kludge), and the store-and-forward
architecture (SMTP relays instead of hub polling) are all evolved
versions of ideas that were proven on {yellow}hobbyist modems in
the 1980s{/}.

The next time you attach a PDF to an email and it arrives thirty
seconds later on a phone in another country, remember that the
first version of that workflow required a {gray}SysOp to pay for a
long-distance call at 3 AM so a uuencoded file could hop through
three FidoNet hubs before landing in someone's offline reader
packet{/}.

We have it easy now. {green}:-){/}

{gray}--- END OF MESSAGE ---{/}

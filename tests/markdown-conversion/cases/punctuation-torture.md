---
office-symbol: ATZB-CD-E
subject: 'Punctuation "Torture" Test: #hashes, $dollars, and \backslashes'
organization:
  name: Example & Sons (Test), a "quoted" org
  street: 1234 Ampersand & Underscore_Way
  city-state-zip: Fort Bracket [Test], VA 00000
author:
  name: O'Brien, Pat
  rank: SFC
  branch: SC
---

1. Inline markup characters must render literally: # $ * _ [ ] < > @ ~ /
   and a backslash \ plus straight "double" and 'single' quotes.

2. URLs and paths survive: https://example.mil/a_b/c.pdf and //server/share
   and the sum $5 + $10 = $15 or ~15 dollars at 100%.

3. A hard break, then\
   = a continuation line starting with an equals sign, still item three.

= This paragraph starts with an equals sign, not a heading.

Paragraph line one, hard break:\
2. this fake enum marker must render as text, not start a numbered item.

- A bulleted list whose item wraps onto a second
  source line, and one with #emph[fake Typst] inside.

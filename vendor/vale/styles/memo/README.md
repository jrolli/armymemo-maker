# memo — the bundled prose style

The single prose style memo.army.dev ships (design D3 of
add-vale-prose-linting): general-purpose plain-writing rules leaning toward
Army writing guidance (AR 25-50 / DA Pam 600-67) where they differ.

Derived from [errata-ai/write-good](https://github.com/errata-ai/write-good)
(MIT, see LICENSE — a Vale port of the write-good linter by Brian Ford):

- `Passive.yml`, `Weasel.yml`, `ThereIs.yml`, `So.yml`, `Illusions.yml`,
  `Cliches.yml` — verbatim from write-good.
- `TooWordy.yml` — curated: ordinary military/administrative vocabulary
  dropped, entries with one clear replacement moved to ArmyPlain.
- `ArmyPlain.yml` — new here: substitutions with the plain replacement in
  the message.
- write-good's `E-Prime.yml` is deliberately omitted: it flags every form
  of "to be", which is noise for memos; passive constructions are covered
  by `Passive.yml`.

These files are hand-maintained sources, not generated artifacts; edit them
directly and rerun the fixture check (`npm run check:prose-style`). The
format is standard Vale style YAML, so the style also works with stock Vale
outside the app.

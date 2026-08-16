# markdown-conversion

## Purpose

Converting a Markdown memo — YAML front matter plus a CommonMark body, the format defined by upstream armymemo's pandoc support — into armymemo Typst source entirely in the browser, so the conversion page can accept Markdown input under the local-only contract. Implemented in `src/markdown/` with upstream's `pandoc.typ` template as the mapping contract.

## Requirements

### Requirement: Markdown memo converts to armymemo Typst source
The app SHALL convert a Markdown memo — a document consisting of YAML front matter delimited by `---` lines followed by a Markdown body — into Typst source entirely in the browser. The emitted source SHALL import the vendored armymemo package, apply `#show: memo.with(...)` with arguments derived from the front matter, and place the converted body below, such that upstream armymemo's pandoc example converts and compiles without modification. Conversion SHALL be pure text-to-text with no network requests.

#### Scenario: Upstream pandoc example converts
- **WHEN** upstream armymemo's `examples/pandoc_example.md` is converted
- **THEN** the emitted Typst compiles to a memo equivalent to what upstream's `pandoc.sh` produces

#### Scenario: Missing front matter rejected
- **WHEN** a Markdown file without a leading `---` front-matter block is converted
- **THEN** conversion fails with an error stating that a Markdown memo requires YAML front matter

### Requirement: Front-matter field mapping mirrors upstream pandoc.typ
The converter SHALL map front-matter fields onto `memo.with(...)` arguments exactly as upstream `pandoc.typ` does: `office-symbol`, `subject`, `organization.name`, and `author.name`/`author.rank`/`author.branch` SHALL be required; `date`, `suspense`, `author.title`, `organization.street`, `organization.city-state-zip`, `memo-for` and `memo-thru` (lists of maps with `name` and optional `street`/`city-state-zip`), `authority`, `enclosures` (list), `enclosures-stated` (bare count emitted unquoted), `distribution`, `see-distribution`, `distribution-separate-page`, `cf`, `cf-without-encls`, and `seal` SHALL be honored when present. An absent `seal` SHALL emit no `seal` argument, leaving armymemo's default letterhead seal in effect; the converter SHALL NOT validate the `seal` value against the accepted seal names, deferring to armymemo's own assertion. Scalar values SHALL be emitted as Typst string literals with `\` and `"` escaped, with non-string scalars stringified. When required fields are missing, conversion SHALL fail with a single error listing every missing field.

#### Scenario: Optional recipient list mapped
- **WHEN** the front matter contains a `memo-for` list of maps with `name`, `street`, and `city-state-zip`
- **THEN** the emitted `memo.with(...)` receives a matching array of dictionaries in front-matter order

#### Scenario: Seal selection passed through
- **WHEN** the front matter contains `seal: DOW`
- **THEN** the emitted `memo.with(...)` receives `seal: "DOW"` and the compiled memo carries the Department of War letterhead seal

#### Scenario: Omitted seal keeps the default letterhead
- **WHEN** the front matter contains no `seal` field
- **THEN** the emitted `memo.with(...)` contains no `seal` argument and the compiled memo carries armymemo's default DOD seal

#### Scenario: All missing required fields reported at once
- **WHEN** the front matter omits both `subject` and `author.rank`
- **THEN** conversion fails with one error naming both missing fields

#### Scenario: Invalid YAML reported with position
- **WHEN** the front matter is not valid YAML
- **THEN** conversion fails with an error that includes the YAML parser's line/column information

### Requirement: Body conversion covers the memo Markdown subset with sound escaping
The converter SHALL translate the CommonMark body constructs a memo needs — paragraphs, ordered and unordered lists including nesting, emphasis, strong emphasis, inline code, links, and hard line breaks — into equivalent Typst markup, with ordered lists emitted as Typst enum items so armymemo renders them as numbered memo paragraphs. Text runs SHALL have Typst markup-significant characters escaped so body text can never activate Typst syntax or leak visible escape characters.

#### Scenario: Numbered paragraphs preserved
- **WHEN** the body is a Markdown ordered list with a nested sub-list
- **THEN** the emitted Typst renders the same numbered paragraph structure through armymemo's enum styling

#### Scenario: Markup characters in prose are inert
- **WHEN** body text contains characters that are Typst syntax, such as `#`, `$`, `*`, `_`, `@`, and brackets
- **THEN** the compiled memo shows those characters literally

### Requirement: Unsupported Markdown constructs fail closed
When the body contains a Markdown construct the converter does not support (for example images, raw HTML, headings, block quotes, or tables), conversion SHALL fail with an error naming the construct and its location in the source. The converter SHALL NOT silently drop or approximate content.

#### Scenario: Unsupported construct named and located
- **WHEN** the body contains an image reference on line 12
- **THEN** conversion fails with an error identifying the image construct and its source position, and no Typst source is produced

### Requirement: Emitted version pin enforced against the vendored package
The armymemo version in the converter's emitted `#import` SHALL come from a single constant, and the build SHALL fail when that constant, the starter example's `#import`, and the vendored tarball version disagree.

#### Scenario: Stale pin fails the build
- **WHEN** the vendored armymemo tarball is bumped without updating the converter's version constant
- **THEN** the build's check step fails naming the mismatched pin

### Requirement: Conversion conformance enforced at build time
The build SHALL run a conversion conformance check over committed fixtures — including a vendored copy of upstream's pandoc example with provenance recorded — comparing converter output against committed golden Typst and asserting the defined error cases fail with their expected messages.

#### Scenario: Converter regression fails the build
- **WHEN** a converter change alters the emitted Typst for a fixture without the golden file being updated
- **THEN** the conformance check fails the build showing the mismatch

# Delta: markdown-conversion (update-armymemo-023)

## MODIFIED Requirements

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

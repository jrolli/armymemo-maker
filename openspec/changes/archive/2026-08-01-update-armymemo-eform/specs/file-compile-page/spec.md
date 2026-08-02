# file-compile-page (delta)

## MODIFIED Requirements

### Requirement: One-shot compile and download
On receiving a file, the page SHALL compile its contents to PDF with the same in-browser pipeline as the editor page — Typst compilation, form-field extraction, and eform field application when a valid non-empty manifest exists — and, on success, SHALL immediately trigger a browser download of the output PDF without further user action. The output SHALL be the signable PDF when fields were applied, otherwise the plain compiled PDF, following the same fallback policy as the editor: eform failure or an invalid manifest downgrades to the plain PDF with a visible explanation, and zero fields yields the plain PDF. All work SHALL happen locally with no network requests beyond the app's own static assets.

#### Scenario: Valid memo with signature fields downloads signable PDF
- **WHEN** the user provides a valid armymemo source file whose compile yields a valid non-empty field manifest
- **THEN** the browser immediately downloads a PDF containing an unsigned signature form field per manifest entry, and the page indicates a signable PDF was produced

#### Scenario: Memo without signature fields downloads plain PDF
- **WHEN** the user provides a valid Typst source file whose compile yields zero form fields
- **THEN** the browser immediately downloads the plain compiled PDF and the page states the result is non-signable

#### Scenario: eform failure still downloads the plain PDF
- **WHEN** field application fails for an otherwise successful compile
- **THEN** the browser downloads the plain compiled PDF and the page visibly reports the eform problem

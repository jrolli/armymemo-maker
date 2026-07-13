## 1. Re-vendor esign

- [x] 1.1 Bump `COMMIT` in `scripts/vendor-esign.sh` to `d777d66202dc1aac29e2aaae6eb8535aab0e649c`
- [x] 1.2 Run `scripts/vendor-esign.sh` and verify `vendor/esign/` contains the rebuilt artifacts, `LICENSE` (AGPL-3.0-or-later), and an updated `PROVENANCE` naming the new commit

## 2. Relicense the project

- [x] 2.1 Add the canonical GNU AGPL v3 text as the root `LICENSE` file
- [x] 2.2 Set `"license": "AGPL-3.0-or-later"` in `package.json`
- [x] 2.3 Document in `README.md` that the project is AGPL-3.0-or-later and that vendored esign carries its upstream license in `vendor/esign/LICENSE`

## 3. Verify

- [x] 3.1 Run `npm run build` and confirm it passes (typecheck, build, local-only/precache/asset-size checks)
- [x] 3.2 Confirm the signable-PDF flow still works with the rebuilt esign WASM

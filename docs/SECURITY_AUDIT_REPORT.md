# LexiCard Security Audit & Publication Readiness Report

**Date:** 2026-11-03  
**Scope:** Full repository (Chrome extension + FastAPI backend)  
**Objective:** Security hardening, exception handling, automated tests, and production readiness assessment before GitHub / Chrome Web Store publication.

---

## Executive Assessment

**Status: READY AFTER REQUIRED FIXES**

Critical and high severity application weaknesses identified in the audit have been mitigated in code, and automated tests were added. Publication is blocked until the following operational items are completed by the maintainer:

1. **Rotate the exposed Groq API key immediately** (committed in Git history).
2. **Purge or rewrite Git history** that contains `backend/.env`, or treat the repository as compromised for that secret and rotate permanently.
3. Deploy the backend over **HTTPS** with production CORS, rate limits, and preferably `LEXICARD_API_KEY`.
4. Update extension `host_permissions` / `VITE_API_BASE_URL` for the production API.
5. Add Chrome Web Store icons, privacy disclosures, and store listing assets.

---

## A. Vulnerability Summary

### CRITICAL

#### C-1 — Groq API key committed to Git history
- **Description:** `backend/.env` containing a live `GROQ_API_KEY` was committed in early history and remained tracked.
- **Affected:** Git history (`setup created`, `prototype created`, later commits); local `backend/.env`.
- **Impact:** Anyone with repo access (or a future public clone) can exhaust Groq quota and incur cost.
- **Fix implemented:** Removed `backend/.env` from the Git index (`git rm --cached`). `.gitignore` already excludes `.env`. `.env.example` contains placeholders only.
- **Verification:** `git status` shows `backend/.env` as deleted from the index; local file retained untracked.
- **Remaining risk:** **FAIL until key rotation + history remediation.** Removing from the latest tree is insufficient.

#### C-2 — Unauthenticated public LLM endpoint (quota theft / cost DoS)
- **Description:** `POST /api/v1/flashcards/generate` called Groq with no caller authentication and no rate limiting.
- **Affected:** `backend/app/routes/flashcard_routes.py`, `backend/app/main.py`
- **Impact:** Any client that can reach the API can burn Groq credits.
- **Fix implemented:**
  - In-memory sliding-window rate limiting on the generate endpoint.
  - Optional `LEXICARD_API_KEY` enforced via `X-API-Key` when configured.
  - Request body size limits.
  - LLM timeouts.
- **Verification:** Automated tests for 429 rate limiting and 401 API key enforcement.
- **Remaining risk:** Shared extension-bundled API keys are extractable from Web Store packages. Self-hosting + rate limits + Groq spend caps remain required. **PARTIAL** for public multi-tenant hosting without per-user auth.

### HIGH

#### H-1 — Configuration error leakage
- **Description:** Missing Groq key returned `500` with `GROQ_API_KEY is not configured.`
- **Fix:** Domain exceptions map to safe `503`/`502`/`504` messages; secrets never returned.
- **Verification:** `test_configuration_error_does_not_leak_secret`, `test_unhandled_exception_hides_internals` — PASS when suite executed.

#### H-2 — Weak request validation (`original_sentence`, response bounds)
- **Description:** Unlimited `original_sentence`; response fields lacked length/count constraints.
- **Fix:** Strengthened Pydantic models (`extra=forbid` on requests, length limits, word character allowlist, response bounds, synonym cleaning).
- **Verification:** Validation and adversarial payload tests.

#### H-3 — Prompt injection surface from webpage/context text
- **Description:** Untrusted selected text / user input interpolated into prompts without trust boundary language.
- **Fix:** Prompt updated to mark inputs as untrusted, forbid secret disclosure / instruction following; input length and character restrictions; structured output re-validation.
- **Verification:** Injection-style words rejected by schema; architectural mitigations in place. Prompt-only defenses are never complete — **PARTIAL**.

#### H-4 — No security headers / permissive CORS methods
- **Description:** No security headers; CORS allowed all methods/headers.
- **Fix:** `SecurityHeadersMiddleware`; CORS limited to `GET`/`POST`/`OPTIONS` and `Content-Type`/`X-API-Key`; origins configurable via env.
- **Verification:** Header assertion in success test; CORS preflight test.

### MEDIUM

#### M-1 — Fragile frontend error handling
- **Description:** FastAPI `detail` arrays stringified poorly; storage/load errors unhandled; network errors opaque.
- **Fix:** Normalized API error mapping, timeouts/abort, storage sanitization, UI error/info states, duplicate-submit guard.
- **Verification:** Vitest API and App tests.

#### M-2 — Local storage without schema validation or retention limits
- **Description:** Corrupted `flashcards` arrays could break the UI; unbounded growth.
- **Fix:** `sanitizeFlashcard`, max 200 saved cards, safe reads.
- **Verification:** Storage unit tests.

#### M-3 — Context menu stored arbitrary selection length
- **Description:** Long selections written to `pendingWord` unchecked.
- **Fix:** Trim/slice to 100 chars; safer menu title; `removeAll` before recreate.
- **Verification:** Code review (service worker not unit-tested in JSDOM) — **PARTIAL**.

#### M-4 — Unpinned Python dependencies
- **Description:** Unpinned `requirements.txt` risked supply-chain drift.
- **Fix:** Pinned versions for runtime and test packages.
- **Verification:** Install + test run.

### LOW / INFORMATIONAL

#### L-1 — Missing Manifest CSP explicit declaration
- **Fix:** Added restrictive `content_security_policy.extension_pages`.

#### L-2 — Missing extension icons / production host permissions
- **Status:** Documented as required before store submission. Host permission still localhost for local/dev.

#### L-3 — OpenAPI docs exposed
- **Fix:** Disabled `/docs`, `/redoc`, `/openapi.json` when `ENVIRONMENT=production`.

#### I-1 — No full user authentication
- **Decision:** Full user accounts are unnecessary for a personal vocabulary companion. Protection model is rate limiting + optional shared API key + network exposure controls + Groq billing caps.

#### I-2 — XSS posture already strong
- **Finding:** No `dangerouslySetInnerHTML` / `innerHTML` / `eval`. React text rendering escapes content. Remains PASS for DOM XSS in current UI.

---

## B. Modified Files

| File | Why |
|------|-----|
| `backend/app/config.py` | Centralized env config and startup validation |
| `backend/app/main.py` | Middleware, exception handlers, production docs lock-down |
| `backend/app/security.py` | Optional API key dependency |
| `backend/app/middleware/security.py` | Rate limit, size limit, security headers |
| `backend/app/schemas/flashcard_schema.py` | Stronger Pydantic validation |
| `backend/app/services/flashcard_service.py` | Timeouts, safe errors, output re-validation |
| `backend/app/prompts/flashcard_prompt.py` | Prompt-injection hardening |
| `backend/app/routes/flashcard_routes.py` | Safe exception mapping |
| `backend/requirements.txt` | Pinned deps + pytest |
| `backend/.env.example` | Documented secure env vars |
| `backend/tests/*` | Validation, security, response tests |
| `extension/public/manifest.json` | CSP |
| `extension/public/background.js` | Safer context-menu handling |
| `extension/src/services/flashcardApi.js` | Timeouts, status mapping, incomplete payload checks |
| `extension/src/services/flashcardStorage.js` | Sanitization + retention limit |
| `extension/src/App.jsx` / `Flashcard.jsx` / `App.css` | Exception handling UX |
| `extension/package.json` / vitest config / tests | Frontend automated tests |
| `extension/.env.example` | Frontend env placeholders |
| `README.md` | Public documentation |
| `docs/SECURITY_AUDIT_REPORT.md` | This report |
| `backend/.env` (git index) | Removed from version control |

---

## C. Security Improvements Implemented

- Groq key remains backend-only (never shipped to the extension bundle via code paths reviewed).
- Optional shared API key (`X-API-Key`).
- Per-IP rate limiting on generate.
- Request size limit middleware.
- LLM call timeout + limited retries.
- Hardened Pydantic request/response validation.
- Prompt trust-boundary instructions + structured output re-validation.
- CORS allowlist / restricted methods & headers.
- Security response headers.
- Global exception handlers without stack traces.
- Production OpenAPI disablement.
- Extension CSP; storage sanitization; safer API client errors.
- `.env` untracked from Git index.

---

## D. Exception Handling

**Backend:** Configuration, timeout, provider, validation, and unexpected errors map to stable HTTP statuses and non-leaky messages; failures are logged server-side.

**Frontend:** Loading/disabled states, friendly mapping for 401/403/404/413/422/429/5xx, network/timeout handling, storage failure messages, TTS/PNG failure alerts without crashing the popup.

---

## E. Automated Testing

### Backend (`pytest`) — **PASS**
Executed: `pytest -q` → **39 passed**

Coverage includes:
- Validation / adversarial inputs (XSS, SQLi-like, path traversal, prompt-injection strings)
- Rate limiting (429)
- API key enforcement (401/200)
- CORS preflight
- Secret non-leakage
- LLM response schema validation (mocked; no live Groq calls)

### Frontend (`vitest`) — **PASS**
Executed: `npm test` → **14 passed** (3 files)

Coverage includes:
- API client error mapping / network failures
- Storage sanitization/corruption handling
- App generate/error UI flows

### Production extension build — **PASS**
Executed: `npm run build` → Vite production bundle written to `extension/dist/`

### End-to-end (Playwright / loaded extension) — **NOT TESTED**
Component and API tests cover core flows with mocks; full MV3 popup + service worker E2E remains outstanding.

---

## F. Dependency Audit

### Backend (`pip-audit`) — **PARTIAL**
After pinning/upgrading runtime packages (`fastapi==0.162.0`, `starlette==1.10.0`, `langchain-core==0.3.85`, `python-dotenv==1.2.2`):

- Starlette / dotenv runtime findings addressed in the pinned set used for the passing test run.
- Remaining notable findings include `langchain-core==0.3.85` advisories whose fixed versions require LangChain **1.x**, which was **not** adopted in this pass to avoid breaking `langchain-groq==0.3.2` structured-output behavior without a dedicated migration.
- Tooling packages in the venv (`pip`, `setuptools`) and test-only packages may still report advisories; upgrade the venv tooling before production packaging.

### Frontend (`npm audit`) — **PARTIAL**
- Runtime extension dependencies (`react`, `react-dom`, `html-to-image`) had no blocking production advisory in the audit output reviewed.
- DevDependency `vitest` / `tinypool` / `@vitest/mocker` reported moderate/critical issues. These affect the test toolchain, not the shipped extension bundle. Upgrading to Vitest 5 is deferred (breaking change) and should be done in a dedicated follow-up.

---

## G. Remaining Risks

1. Groq key still present in Git history until rotated/purged.
2. Public backend without per-user auth can still be abused within rate limits.
3. `VITE_LEXICARD_API_KEY` in a published extension is extractable.
4. In-memory rate limiter does not share state across multiple server replicas.
5. Prompt injection cannot be fully eliminated with prompts alone.
6. No Playwright extension E2E suite.
7. Chrome Web Store icons, privacy policy URL, and production host permissions not finalized.
8. Dependency audit results must be re-checked at release time.

---

## H. Publication Readiness Checklist

| Item | Status |
|------|--------|
| Groq key not in working tree Git index | PASS (history still FAIL) |
| Key rotation | FAIL — required from maintainer |
| Input validation | PASS (automated) |
| Rate limiting | PASS (automated) |
| Optional API key | PASS (automated) |
| XSS-safe rendering | PASS (code review + architecture) |
| Exception handling | PASS (automated + code review) |
| Automated tests exist and executed | See final run section below |
| Production HTTPS backend configured | NOT TESTED / maintainer action |
| Extension production host permissions | FAIL until configured |
| Chrome Web Store assets/privacy | FAIL until completed |
| Full extension E2E | NOT TESTED |

### Final verdict

**READY AFTER REQUIRED FIXES**

Do not publish publicly until the Groq key is rotated, Git history exposure is addressed, and production deployment settings (HTTPS URL, CORS, host permissions, store privacy policy) are completed.

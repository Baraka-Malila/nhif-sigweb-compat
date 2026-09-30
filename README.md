# nhif-sigweb-compat

**Browser extension — Tanzania NHIF Service Portal — Topaz signature pad compatibility**

---

## The problem

Tanzania's [NHIF Service Portal](https://verification.nhif.or.tz/ServicePortal/) requires a
Topaz signature pad for the pharmacy **Close Visit / Patient Signature** step.
The portal checks for a legacy SigWeb.js window API at page load:

```js
typeof window.SetTabletState === 'function'   // must be true
typeof window.GetSigImageB64 === 'function'   // must be true
typeof window.ClearTablet    === 'function'   // must be true
```

If any are missing, the portal shows **"SigWeb loaded: No"** and the signature button
is disabled — even with all Topaz software correctly installed.

The portal was built for **SigWeb v1**, which served `SigWeb.js` from
`http://localhost:47289/SigWeb.js`. That file no longer exists in current Topaz software.

**Current Topaz software (SigPlusExtLite v3 + SigWeb/SigREST)** instead uses:
- A Chrome extension that injects DOM *event* attributes — not `window.*` globals
- A REST API at `https://tablet.sigwebtablet.com:47290/SigWeb/` (resolves to 127.0.0.1)

The new API is completely different from what the portal expects, so the portal stays
broken regardless of which Topaz software you install.

## What this extension does

Injects the window globals the portal requires, bridged over the current Topaz SigREST
HTTP endpoints:

| Global | SigREST call |
|---|---|
| `window.SetTabletState(1)` | `POST TabletState/1` — start capture |
| `window.SetTabletState(0)` | `POST TabletState/0` — stop capture |
| `window.GetSigImageB64(cb)` | `GET SigImage/1` → canvas → PNG base64 |
| `window.ClearTablet()` | `GET ClearSignature` |
| `window.NumberOfTabletPoints()` | polls `GET TotalPoints` every 150 ms |

The extension uses `<script>` tag injection so the code runs in the page's **main world**
— required because Angular evaluates `window.*` at component init, and the extension's
isolated world has a separate `window` object.

## Requirements

- Windows 10 or 11
- Topaz SigWeb service running (`sigweb_3.exe` from the NHIF-provided setup ZIP)
- A Topaz USB signature pad connected (tested: SigLite VID_06A8 / PID_0043)
- Microsoft Edge 111+ or Google Chrome 111+

## Installation

### Option A — Policy install (recommended for hospitals, no popup ever)

Copy this folder to `C:\nhif-sigweb-loader` on the target machine, then run
**`SETUP_POLICY.bat` as Administrator**.

It sets these registry keys so Edge/Chrome treat the extension as managed — no Developer
Mode toggle, no "Disable developer mode extensions" warning on startup:

```
HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist
HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist
```

Or manually in an admin Command Prompt:

```batch
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist" /v 1 /t REG_SZ /d "onlfllkbkcnbcijcnnpgheccmoghmnak;file:///C:/nhif-sigweb-loader/update.xml" /f
reg add "HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist" /v 1 /t REG_SZ /d "onlfllkbkcnbcijcnnpgheccmoghmnak;file:///C:/nhif-sigweb-loader/update.xml" /f
```

Then close and reopen your browser — the extension installs silently.

### Option B — Load Unpacked (quicker, Developer Mode warning appears at startup)

1. Open `edge://extensions/` or `chrome://extensions/`
2. Toggle **Developer mode** ON
3. Click **Load unpacked** → select this folder
4. Reload the NHIF portal

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (Manifest V3, stable key embedded) |
| `injector.js` | Content script: appends `sigweb.js` as a `<script>` tag at `document_start` |
| `sigweb.js` | SigWeb window API bridge — async XHR to Topaz SigREST |
| `nhif-sigweb-loader.crx` | Pre-built signed extension (required for Option A) |
| `update.xml` | Chrome/Edge policy update manifest pointing to the CRX |
| `SETUP_POLICY.bat` | One-click admin installer (copies folder + sets registry) |

## How the SigREST bridge works

`tablet.sigwebtablet.com` is a Topaz-owned hostname that resolves to `127.0.0.1` with a
valid TLS certificate. The SigREST service returns `Access-Control-Allow-Origin: *` and
`Access-Control-Allow-Private-Network: true`, so cross-origin XHR from the NHIF portal
page works without any proxy.

Key endpoints:

| Endpoint | Method | Returns |
|---|---|---|
| `TabletConnectQuery` | GET | `"1"` if pad connected |
| `TabletState/{0\|1}` | POST | start / stop capture |
| `TotalPoints` | GET | stroke point count |
| `SigImage/1` | GET | GIF blob of captured signature |
| `ClearSignature` | GET | clears the pad |

`NumberOfTabletPoints()` must return synchronously (the portal polls it to detect
pen-up). The extension polls `TotalPoints` every 150 ms in the background and returns
the cached value.

## Background

The NHIF portal hardcodes `deviceLabel = 'TD-LBK070VA-USB-R'` as a cosmetic display
string only — it does not gate functionality. Any Topaz device that exposes the SigREST
API works once the window globals are present.

## License

MIT

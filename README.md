# SkillsPath

**AI-powered career roadmap advisor that connects your Canvas academic history to a personalized IBM SkillsBuild learning path.**

Built for the [IBM × NCCU AI Hackathon](https://github.com/skillspath/skillspath.github.io) · March 2026

→ **[skillspath.github.io](https://skillspath.github.io)**

---

## What it does

Students describe a career goal. SkillsPath reads their actual Canvas course history and IBM SkillsBuild completion record, then runs an agentic AI advisor that produces a prioritized, gap-aware learning roadmap — linking directly to the right IBM SkillsBuild courses.

The advisor reasons through your background step by step, calling tools to fetch your academic profile, course grades, and existing credentials before recommending next steps. Every tool call is shown in real time so you can follow the reasoning.

---

## Architecture

```
Canvas LMS          IBM SkillsBuild        skillspath.github.io
   │                      │                        │
content-canvas.js   content-skillsbuild.js         │
   │                      │                        │
   └──── background.js (service worker) ───────────┤
                                              bridge.js
                                         (postMessage relay)
                                                   │
                                          index.html + AI agent
                                       (GitHub Models / GPT-4.1)
```

- **Chrome Extension (MV3)** — runs content scripts on Canvas and IBM SkillsBuild, captures course history and credentials into `chrome.storage.local`, exposes it to the page via a postMessage bridge.
- **Single-page app** — pure HTML + CSS + JS, no build step, deployed via GitHub Pages.
- **AI agent** — agentic tool-calling loop against [GitHub Models](https://github.com/marketplace/models) (OpenAI-compatible API). Model is user-selectable: GPT-4.1, GPT-4o, o3-mini, Llama 3.3 70B.
- **No backend, no server** — all data stays in the browser. GitHub OAuth is handled by [neevs.io](https://neevs.io).

---

## Install the extension

The extension is not yet published to the Chrome Web Store. Install it in two steps:

1. Open `chrome://extensions` in Chrome and enable **Developer mode** (toggle, top-right corner).
2. **[Download extension.crx](https://github.com/skillspath/skillspath.github.io/releases/download/v1.0/extension.crx)**, drag it onto the `chrome://extensions` page, and click **Add extension**.
3. Open [Canvas LMS](https://canvas.instructure.com) and [IBM SkillsBuild](https://skills.yourlearning.ibm.com) — your data syncs automatically.

> Prefer manual install? **[Download .zip](https://github.com/skillspath/skillspath.github.io/releases/download/v1.0/skillspath-extension.zip)**, unzip, then use **Load unpacked** instead of drag-and-drop.

Then visit **[skillspath.github.io](https://skillspath.github.io)**, sign in with GitHub, and enter your career goal.

---

## Run locally

No build step required.

```bash
git clone https://github.com/skillspath/skillspath.github.io.git
cd skillspath.github.io
# Serve from a local HTTP server (required for postMessage bridge to work)
python3 -m http.server 8080
# Open http://localhost:8080
```

For the extension to work locally, `http://localhost/*` is already in `manifest.json` host permissions.

---

## Extension permissions

| Permission | Why |
|---|---|
| `storage` | Persists Canvas + SkillsBuild data across browser sessions |
| `*.instructure.com`, `*.canvaslms.com`, `*.edu` | Reads Canvas course history via Canvas REST API (authenticated session) |
| `*.yourlearning.ibm.com` | Reads IBM SkillsBuild completion records via YourLearning API (authenticated session) |
| `skillspath.github.io`, `localhost` | Injects bridge script to relay storage data to the page |

No data is sent to any external server. All API calls go directly from your browser to Canvas and IBM SkillsBuild using your existing authenticated session.

---

## Tech stack

- **Frontend** — vanilla HTML/CSS/JS, IBM design token system, IBM Plex Sans/Mono
- **AI** — GitHub Models API (OpenAI-compatible), GPT-4.1 default
- **Auth** — GitHub OAuth via [neevs.io](https://neevs.io)
- **Extension** — Chrome MV3, service worker, postMessage bridge
- **Hosting** — GitHub Pages

---

## Team

Built by Jaideep Aher, Roshan Gill, and Jonas Neves at the IBM × NCCU AI Hackathon, March 2026.

> IBM built the catalog. IBM built the engine. We built the on-ramp.

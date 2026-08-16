# LinkedIn Auto Connect Script

A lightweight JavaScript browser automation script for sending LinkedIn connection requests from the people-search results page. Paste it into the Chrome DevTools Console, run it, and it will click **Connect** buttons, optionally add a personalized note, and move to the next page automatically.

Keywords: LinkedIn auto connect, LinkedIn connection request automation, LinkedIn bot, browser console script, LinkedIn outreach automation, JavaScript automation, LinkedIn invite script.

## What It Does

- Finds visible **Connect** buttons on LinkedIn people-search result pages.
- Clicks each Connect button and handles the invitation modal.
- Optionally clicks **Add a note**, pastes your message, and clicks **Send**.
- Extracts the person's first name and full name from the button's `aria-label` or card title.
- Auto-fills `{{name}}` (first name) and `{{fullName}}` in your note template.
- Navigates to the next page and repeats until finished or stopped.
- Provides runtime controls: `run`, `pause`, `resume`, and `stop`.

## What Changed vs the Old Script

LinkedIn updated its search results markup. Connect buttons are now `<a>` tags like:

```html
<a
  href="/preload/search-custom-invite/?vanityName=..."
  aria-label="Invite Shwetha Surendra to connect"
>
  ... <span>Connect</span>
</a>
```

This script uses the new `href` pattern and `aria-label` parsing instead of the old `button` + `Connect` text lookup, so it no longer returns **"no connect buttons found on page!"**.

## Usage

1. Open LinkedIn in Chrome and go to a people search results page (e.g. search for `HR Bengaluru`).
2. Open DevTools with `Cmd + Option + I` on macOS or `Ctrl + Shift + I` on Windows/Linux.
3. Open the **Console** tab.
4. Paste the contents of [`linkedin-connect.js`](./linkedin-connect.js).
5. Start the script:

```js
window.linkedinConnect.run()
```

## Controls

```js
window.linkedinConnect.run()
window.linkedinConnect.pause()
window.linkedinConnect.resume()
window.linkedinConnect.stop()
```

- `run()` — start sending connection requests.
- `pause()` — temporarily pause between requests.
- `resume()` — continue after a pause.
- `stop()` — stop completely.

## Configuration

Edit the config at the top of [`linkedin-connect.js`](./linkedin-connect.js) before pasting:

```js
const config = {
  scrollDelay: 2000,      // ms to wait after scrolling
  actionDelay: 2500,      // ms between each connect action
  modalDelay: 1500,       // ms to wait for modal content
  nextPageDelay: 4000,    // ms to wait after clicking Next

  maxRequests: -1,        // -1 = no limit

  addNote: true,
  note: "Hey {{name}}, I'm looking forward to connecting with you!",
};
```

### Template variables

- `{{name}}` — first name (e.g. `Shwetha`)
- `{{fullName}}` — full name parsed from `aria-label` (e.g. `Shwetha Surendra`)

## Current Selectors

```js
'a[href*="/preload/search-custom-invite/"]'
'.artdeco-pagination__button--next'
'[role="dialog"], .artdeco-modal, .artdeco-modal-overlay'
```

These selectors target the current LinkedIn search-results UI. If LinkedIn changes its frontend, the script may need an update.

## Roadmap

- Bookmarklet version for one-click reuse.
- Chrome extension wrapper.
- Daily/weekly invite-limit guard.
- CSV export of sent invites.
- Filter profiles by headline, location, or company before connecting.

## Disclaimer

Use this responsibly. LinkedIn has rate limits and automation policies. Sending too many connection requests too quickly can lead to account restrictions. This project is an unofficial helper script and is not affiliated with LinkedIn.

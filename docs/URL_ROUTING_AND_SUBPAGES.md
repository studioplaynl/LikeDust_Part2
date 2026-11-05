# URL Routing, Shareable Links & Subpages

Like Dust Part 2 includes a lightweight, zero-dependency URL router in `shared.js` designed for easy debugging, link sharing on the web, deep linking, and future subpages.

---

## 1. Direct Chapter URLs

You can share or navigate directly to any chapter on the web using either **hashes** or **query parameters**:

| Chapter | URL Format (Hash) | URL Format (Query Param) |
| :--- | :--- | :--- |
| **Chapter 1 · Schiphol** | `https://likedust.nl/#ch=1` (or `#ch1`, `#1`) | `https://likedust.nl/?ch=1` |
| **Chapter 2 · The AZC** | `https://likedust.nl/#ch=2` (or `#ch2`, `#2`) | `https://likedust.nl/?ch=2` |
| **Chapter 3 · Amsterdam** | `https://likedust.nl/#ch=3` (or `#ch3`, `#3`) | `https://likedust.nl/?ch=3` |
| **Chapter 4 · The Letter** | `https://likedust.nl/#ch=4` (or `#ch4`, `#4`) | `https://likedust.nl/?ch=4` |

### How It Works:
1. **Direct Navigation:** When loading the page with `#ch=1`, the room finishes loading and automatically launches Chapter 1 with its smooth transition.
2. **Auto-Updating Address Bar:** When a player clicks an object inside the 3D room to enter a chapter, the address bar automatically updates to `#ch=N` using `history.replaceState` (preserving any active flags like `?dev=0`).
3. **Closing a Chapter:** Closing the video chapter or returning to the room clears the hash back to the main room URL.
4. **Browser History:** Pressing the browser's **Back** button while a chapter is open closes the chapter and returns smoothly to the room.

---

## 2. Future Subpages System

The router includes built-in support for modal subpages (such as About, Credits, Colophon, or Help):

### URL Formats:
- `https://likedust.nl/#page=about` or `https://likedust.nl/#about`
- `https://likedust.nl/#credits`
- `https://likedust.nl/#colophon`

### Built-in Modal:
If a user visits any hash like `#about` or `#credits`, a themed modal automatically appears with a close button and smooth backdrop blur. Closing the modal returns to the room and clears the hash.

### Custom Page Handlers (JavaScript API):
If you want to render custom HTML or run specialized logic for a subpage, register a handler using `LD.onPage`:

```javascript
// Register a custom handler for the "credits" page
window.LD.onPage("credits", ({ page, close }) => {
  console.log("Opening credits page...");
  // You can show your own DOM element or pass custom HTML to openPage:
  window.LD.openPage("credits", `
    <h3>Credits</h3>
    <p>Written and directed by Sam...</p>
  `);
});
```

---

## 3. JavaScript Router API (`window.LD`)

| Method / Property | Description |
| :--- | :--- |
| `LD.getRoute()` | Returns the current route object: `{ type: "chapter", ch: 1 }` or `{ type: "page", page: "about" }` or `{ type: "room" }`. |
| `LD.getShareUrl({ ch: 1 })` | Generates a full absolute URL for sharing Chapter 1. |
| `LD.copyShareUrl({ ch: 1 })` | Copies the share URL directly to the user's clipboard and displays a confirmation hint. |
| `LD.openChapter(n)` | Programmatically opens chapter `n` (`1..4`). |
| `LD.closeChapter()` | Programmatically closes the currently open chapter. |
| `LD.openPage(name, [html])` | Opens a subpage modal and updates the URL to `#page=name`. |
| `LD.closePage()` | Closes the open subpage modal and clears the hash. |
| `LD.onPage(name, fn)` | Registers a custom callback for a given subpage. |

### Listening to Route Changes:

```javascript
window.addEventListener("ld:route", (e) => {
  const { type, ch, page } = e.detail;
  console.log("Route changed to:", type, ch || page);
});
```


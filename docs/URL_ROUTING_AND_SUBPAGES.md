# URL Routing, Shareable Links & Subpages

**We All Breathe the Same Air** includes a lightweight, zero-dependency URL router in `Capacitor_Apps/app-room/www/shared/shared.js` designed for debugging, link sharing on the web, deep linking, and modal subpages.

---

## 1. Direct Chapter URLs

You can share or navigate directly to any chapter on the web using either **hashes** or **query parameters**:

| Chapter | URL Format (Hash) | URL Format (Query Param) |
| :--- | :--- | :--- |
| **Chapter 1 · Schiphol** | `http://localhost:8771/#ch=1` (or `#ch1`, `#1`) | `http://localhost:8771/?ch=1` |
| **Chapter 2 · The AZC** | `http://localhost:8771/#ch=2` (or `#ch2`, `#2`) | `http://localhost:8771/?ch=2` |
| **Chapter 3 · Amsterdam** | `http://localhost:8771/#ch=3` (or `#ch3`, `#3`) | `http://localhost:8771/?ch=3` |
| **Chapter 4 · The Letter** | `http://localhost:8771/#ch=4` (or `#ch4`, `#4`) | `http://localhost:8771/?ch=4` |

### How It Works:
1. **Direct Navigation:** When loading the page with `#ch=1`, `LD.onRouteChapter` dismisses the Start card, places Sam in the room, and opens Chapter 1 directly with its Three.js object silhouette transition.
2. **Auto-Updating Address Bar:** When a player clicks an object inside the flat 2D room to enter a chapter, the address bar automatically updates to `#ch=N` using `history.replaceState` (preserving any active flags like `?dev=0`).
3. **Closing a Chapter:** Finishing or closing the video chapter clears the hash back to the main room URL and resumes the room render loop and post-chapter reactions.
4. **Browser History:** Pressing the browser's **Back** button while a chapter is open closes the chapter and returns smoothly to the room.

---

## 2. Subpages System

The router includes built-in support for modal subpages (such as About, Credits, Colophon, or Help):

### URL Formats:
- `http://localhost:8771/#page=about` or `http://localhost:8771/#about`
- `http://localhost:8771/#credits`
- `http://localhost:8771/#colophon`

### Custom Page Handlers (JavaScript API):
Register a handler using `LD.onPage`:

```javascript
window.LD.onPage("credits", ({ page, close }) => {
  window.LD.openPage("credits", `
    <h3>Credits</h3>
    <p>We All Breathe the Same Air...</p>
  `);
});
```

---

## 3. JavaScript Router API (`window.LD`)

| Method / Property | Description |
| :--- | :--- |
| `LD.getRoute()` | Returns `{ type: "chapter", ch: 1 }`, `{ type: "page", page: "about" }`, or `{ type: "room" }`. |
| `LD.getShareUrl({ ch: 1 })` | Generates a full absolute URL for sharing Chapter 1. |
| `LD.copyShareUrl({ ch: 1 })` | Copies the share URL to the clipboard and displays a confirmation hint. |
| `LD.openChapter(n, opts)` | Opens chapter `n` (`1..4`) with optional `{ target, onClose }` callbacks. |
| `LD.onRouteChapter(fn)` | Registers the room's custom deep-link chapter launcher (`app.js`). |
| `LD.closeChapter()` | Closes the currently open chapter. |
| `LD.openPage(name, [html])` | Opens a subpage modal and updates the URL to `#page=name`. |
| `LD.closePage()` | Closes the open subpage modal and clears the hash. |
| `LD.onPage(name, fn)` | Registers a custom callback for a given subpage. |

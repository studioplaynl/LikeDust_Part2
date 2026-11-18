# Zero-Dependency State Machine and Shared Chapter Runtime

We manage application flow, Sam's room pose, and browser history with a compact zero-dependency finite state machine (`www/room/shared/fsm.js`) and a single shared chapter player/WebAudio engine instead of adding `xstate` or keeping duplicated inline scripts per chapter.

## Considered Options

- **XState v5**: Rejected because the app runs as static, bundler-free HTML/JS across Cloudflare Pages and Capacitor (`WKWebView` / Android `WebView`), and the state graph has only ~8 room states and 5 mutually exclusive Sam poses.
- **Ad-hoc boolean flags & per-chapter HTML copies (previous approach)**: Rejected because scattered flags (`introSeen`, `busy`, `clipLayers`) caused impossible visual combinations (Double Sam), `history.back()` timer races, and ~7,000 lines of duplicated chapter/audio code that triggered 12-element `<audio>` unlock races on iOS.
- **Zero-dependency explicit FSM + shared chapter runtime (chosen)**: Enforces strict state invariants (`SamPose`, `RoomFlow`), deterministic `history.state` depth tracking, and a single WebAudio SFX pool across all four chapters without introducing a build step.

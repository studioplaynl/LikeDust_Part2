# Two-Tier Doors Motion with Animated AVIF Fallback

On the landing `Doors`, we drive silent backdrop motion with hardware-decoded H.264 `<video>` (`preload="auto"`) when autoplay is permitted, and fall back on `NotAllowedError` (such as iOS Low Power Mode) to a short, memory-bounded Animated AVIF (`avis`) `<img>` loop whose `src` is detached whenever `Doors` leaves the viewport or `#stage` (`Intro Film`) opens.

## Considered Options

- **`<video>` alone with static poster fallback (previous approach)**: Rejected because iOS Low Power Mode blocks all `<video>.play()` calls at the OS level without user activation (and renders an unstylable native play glyph if `<video>` remains visible), leaving `Doors` frozen until a user gesture.
- **Pure `<picture>` Animated AVIF/WebP everywhere (no `<video>`)**: Rejected because `<img>` sequences run at lower framerates (`12fps` vs `25fps`), decode frames into `WebContent` bitmap RAM rather than streaming through hardware H.264 decode (risking iOS memory pressure on the full `63s` Part 2 montage), and cannot natively `.pause()` mid-frame.
- **`<canvas>` sprite sheets**: Rejected because full-bleed multi-shot film loops exceed practical GPU texture dimensions and bundle budgets compared to character sprites in `The Room`.
- **Two-tier progressive `<video>` + on-demand Animated AVIF fallback (chosen)**: Preserves full `25fps` `63s` hardware video with zero extra download when normal autoplay works, guarantees instant motion on load in iOS Low Power Mode (`iOS 16.4+`) with only `~450–550 KB` across both `Doors` (avoiding `+1.5 MB` of legacy Animated WebP), and frees decoded bitmap memory before `Intro Film` and `The Room` load.

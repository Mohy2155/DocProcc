## Why

To enhance user engagement and reduce perceived wait times during asynchronous document processing tasks. By embedding lightweight, native HTML5 `<canvas>` games within the UI, users have an entertaining distraction that keeps them engaged on the page without impacting bundle size or application performance.

## What Changes

- Introduction of a fixed 320x250px "DocProcc Arcade" container positioned directly below the History Sidebar on desktop layouts.
- Implementation of a carousel interface to cycle between 3 distinct retro-style games.
- Addition of 3 zero-dependency HTML5 canvas games: Data Breaker (Breakout), Packet Defender (Missile Command style), and Byte Flap (Flappy Bird style).
- Implementation of a universal auto-pause mechanic triggering on `mouseleave` to prevent gameplay from interfering with primary document workflows.
- Integration of the native Web Audio API for retro sound synthesis.
- Storage of high scores in `localStorage` (`docprocc_arcade_scores`).

## Capabilities

### New Capabilities
- `arcade`: Defines the requirements for the DocProcc Arcade container, carousel controls, universal auto-pause mechanics, state management, and the individual game engine behaviors (Data Breaker, Packet Defender, Byte Flap).

### Modified Capabilities
- None.

## Impact

- **UI/Layout**: Minimal impact. The arcade specifically utilizes the available vertical whitespace below the History Sidebar. It relies on native DOM events (`mouseenter`/`mouseleave`) for auto-pause control.
- **Dependencies**: Zero external dependencies (strict requirement).
- **Storage**: Introduces a new `localStorage` key: `docprocc_arcade_scores`.
- **Performance**: High performance expected. Rendering is scoped strictly to native `<canvas>` operations inside `requestAnimationFrame` loops. Games are only rendered/computed when active in the carousel and hovered.

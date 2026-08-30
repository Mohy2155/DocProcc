## 1. Scaffold Arcade Shell

- [x] 1.1 Create `frontend/src/components/Arcade/DocProccArcade.tsx` shell component.
- [x] 1.2 Implement the retro slate/zinc container UI (320x250) positioned below the History Sidebar in `App.tsx`.
- [x] 1.3 Implement the Carousel Header with Left/Right arrows, title state, and active game index state.
- [x] 1.4 Implement the universal `mouseenter` and `mouseleave` auto-pause overlay overlaying the canvas area.

## 2. Core Audio & Utilities

- [x] 2.1 Implement `useRetroAudio.ts` hook providing native `AudioContext` functions (laser, bounce, shatter, hit).
- [x] 2.2 Implement `useHighScore.ts` hook for getting/setting `docprocc_arcade_scores` in `localStorage`.

## 3. Game 1: Data Breaker

- [x] 3.1 Scaffold `frontend/src/components/Arcade/games/DataBreaker.tsx` accepting `isPaused` prop.
- [x] 3.2 Implement standard `requestAnimationFrame` loop with fixed timestep delta calculation.
- [x] 3.3 Implement paddle controlled strictly by mouse X position (`mousemove` event relative to canvas bounds).
- [x] 3.4 Implement ball physics, brick grid rendering, and AABB collision logic.
- [x] 3.5 Hook up score state, audio synthesis, and `isPaused` conditional rendering.

## 4. Game 2: Packet Defender

- [x] 4.1 Scaffold `frontend/src/components/Arcade/games/PacketDefender.tsx`.
- [x] 4.2 Implement falling packets (rendering and downward translation logic).
- [x] 4.3 Implement base turret logic (aiming towards mouse cursor coordinates).
- [x] 4.4 Implement `onclick` instantaneous direct laser beam and point-to-box collision logic.
- [x] 4.5 Implement square pixel particle explosion animations upon packet destruction via `ctx.fillRect`.

## 5. Game 3: Byte Flap

- [x] 5.1 Scaffold `frontend/src/components/Arcade/games/ByteFlap.tsx`.
- [x] 5.2 Implement gravity physics and `mousedown`/`touchstart` upward thrust logic for the player entity.
- [x] 5.3 Implement horizontally scrolling barrier gaps.
- [x] 5.4 Implement Circle-to-AABB collision detection (player vs barriers).

## 6. Integration & Polish

- [x] 6.1 Integrate all 3 games into the `DocProccArcade` carousel `switch` statement.
- [x] 6.2 Ensure high scores properly display in the shared arcade header based on the active game.
- [x] 6.3 Test memory leaks by rapidly switching carousel items during active gameplay to ensure animation frames are cancelled.

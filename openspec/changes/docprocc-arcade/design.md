## Context

See `proposal.md` for the product motivation and constraints. We are constrained to a strict 320x250 container size, zero external physics or game engines, and native HTML5 rendering. 

## Goals / Non-Goals

**Goals:**
- Create an extensible shell (`DocProccArcade.tsx`) that manages mounting/unmounting specific game components based on active carousel state.
- Implement a global pause mechanic handled at the shell level, ensuring individual games don't have to duplicate hover event logic.
- Implement highly performant render loops using `requestAnimationFrame`.

**Non-Goals:**
- Deep cross-device touch support (desktop mouse control is the primary target).
- Server-side high score leaderboards (strictly local).
- Complex collision engines (simple AABB bounding boxes and raycasting will be used).

## Decisions

### 1. Game State & Loop Management
**Decision**: Each game will be a standalone React component that accepts a `isPaused` prop from the parent `DocProccArcade` shell. The `requestAnimationFrame` loop will internally check `isPaused`. 
**Rationale**: By having the parent shell manage the `mouseenter`/`mouseleave` events, we enforce uniform pause behavior across all games and prevent ghost loops from running in the background when a game is hidden by the carousel.
**Alternatives Considered**: Relying on CSS classes to hide `<canvas>` elements while letting the loop run invisibly. Rejected due to unnecessary CPU overhead.

### 2. Audio Synthesis
**Decision**: Use the native `AudioContext` API to generate simple square/sawtooth waveforms.
**Rationale**: Eliminates the need to load external `.mp3` or `.wav` files, keeping the bundle size near zero and preserving the retro "8-bit" aesthetic perfectly.
**Alternatives Considered**: Including small audio assets. Rejected to minimize network requests.

### 3. Collision Detection Math
**Decision**: 
- Data Breaker: Standard Axis-Aligned Bounding Box (AABB) collision for ball/paddle/bricks.
- Packet Defender: Simple point-to-box collision (mouse click coordinate vs falling rect bounds) with instantaneous lasers instead of traveling projectiles to simplify math.
- Byte Flap: Circle-to-AABB collision (bird to pipe).

## Risks / Trade-offs

- **Risk: `requestAnimationFrame` memory leaks in React** → Mitigation: Strict cleanup functions in `useEffect` to cancel animation frames on component unmount (carousel switch).
- **Risk: High refresh rate monitors running the game too fast** → Mitigation: The game loops will use a fixed timestep delta calculation (`dt = performance.now() - lastTime`) rather than assuming 60FPS.

## Purpose

Provides a standalone interactive gaming component that users can engage with to reduce perceived wait times during background document processing.

## ADDED Requirements

### Requirement: Arcade Interface
The system SHALL provide a dedicated 320x250px arcade container below the History Sidebar on desktop. The header MUST contain left/right carousel controls, the active game title, a mute button, and the current high score.

#### Scenario: Carousel Navigation
- **WHEN** the user clicks the left or right carousel arrows
- **THEN** the active game canvas unmounts and the next/previous game mounts in the view.

### Requirement: Universal Auto-Pause
The arcade MUST automatically pause any active game state when the user's cursor leaves the game boundary, displaying a semi-transparent "PAUSED - HOVER TO RESUME" overlay.

#### Scenario: Mouse Leave
- **WHEN** the user moves the mouse cursor outside the 320x250px arcade boundary
- **THEN** the game loop pauses instantly and the pause overlay is rendered over the canvas.

#### Scenario: Mouse Enter
- **WHEN** the user moves the mouse cursor back inside the arcade boundary
- **THEN** the pause overlay is removed and the game loop resumes seamlessly.

### Requirement: Game Engine Constraints
The games MUST be rendered natively via HTML5 2D `<canvas>` APIs using `requestAnimationFrame`, with zero external dependencies. High scores MUST persist in `localStorage` under `docprocc_arcade_scores`. Audio MUST utilize the native Web Audio API (`AudioContext`).

#### Scenario: High Score Persistence
- **WHEN** a game session ends with a score higher than the local maximum
- **THEN** the new score is written to `docprocc_arcade_scores` and instantly reflected in the arcade header.

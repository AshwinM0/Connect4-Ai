# Connect4 AI

A Connect Four game built with **Angular** featuring an AI opponent powered by the **Minimax algorithm** with alpha-beta pruning.

## Overview

Connect Four is a two-player zero-sum game where players take turns dropping tokens into a 6×7 vertical grid. The objective is to connect four tokens horizontally, vertically, or diagonally. For every move that increases one player's winning chances, there's an equal decrease for the opponent—making this a perfect candidate for game-theoretic AI algorithms.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Angular 15+** | Frontend framework for building the UI |
| **TypeScript** | Type-safe JavaScript for improved code quality |
| **CSS3** | Modern styling with gradients, animations, and responsive design |
| **ng-angular-popup** | Toast notifications for game events |

## Architecture

The application follows Angular's modular architecture with clear separation of concerns:

```
src/app/
├── models/
│   └── game.types.ts       # Type definitions and constants
├── services/
│   ├── game.service.ts     # Game state management
│   └── ai.service.ts       # AI logic (Minimax algorithm)
├── app.component.ts        # Main game component
├── app.component.html      # Game UI template
├── app.component.css       # Styling
└── app.module.ts           # Angular module configuration
```

### Core Components

#### Game Types (`models/game.types.ts`)
Defines TypeScript types and constants:
- **`CellValue`**: Cell states (`-1` = Empty, `1` = Human, `2` = AI)
- **`Player`**: Player identifiers (`1` | `2`)
- **`Board`**: 2D array representing the 6×7 game grid
- **Constants**: `BOARD_WIDTH`, `BOARD_HEIGHT`, `EMPTY_CELL`, `PLAYER_HUMAN`, `PLAYER_AI`

#### Game Service (`services/game.service.ts`)
Manages game state and board operations:
- Board initialization and reset
- Move validation and column height tracking
- Win detection (horizontal, vertical, diagonal)
- Score tracking across games

#### AI Service (`services/ai.service.ts`)
Implements AI using **Minimax with Alpha-Beta Pruning**:
- Recursive decision-making to find optimal moves
- Alpha-beta pruning to eliminate unnecessary evaluations
- Heuristic position scoring
- Center column prioritization for strategic advantage

#### App Component (`app.component.ts`)
Main game controller handling:
- User interactions and cell clicks
- Coordination between Game and AI services
- Game flow management (turns, win/draw detection, resets)

## AI Algorithm

The AI uses the **Minimax algorithm** with **Alpha-Beta Pruning** to determine optimal moves.

### How Minimax Works

Minimax is a recursive algorithm that simulates all possible game outcomes:

1. **Game Tree Construction**: Starting from the current board state, the algorithm generates all possible moves, then all possible responses, and so on—creating a tree of game states.

2. **Depth-Limited Search**: The search is limited to **4 moves ahead** (configurable) to balance between decision quality and computation time.

3. **Maximizing vs Minimizing**:
   - When it's the AI's turn (maximizing), it selects the move with the **highest** score
   - When simulating the human's turn (minimizing), it assumes the human plays optimally and selects the **lowest** score for the AI

4. **Backpropagation**: Scores propagate back up the tree, allowing the AI to choose the best immediate move based on future implications.

### Alpha-Beta Pruning

Alpha-beta pruning optimizes minimax by eliminating branches that cannot influence the final decision:

- **Alpha**: The best score the maximizing player can guarantee
- **Beta**: The best score the minimizing player can guarantee
- When `alpha >= beta`, the branch is **pruned** (skipped)

This optimization can reduce the search space by up to **50%** without affecting the result.

### Position Evaluation Heuristics

When the search depth limit is reached, positions are evaluated using these criteria:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Four in a row** | +100 | Winning position |
| **Three in a row** (1 empty) | +5 | Strong threat |
| **Two in a row** (2 empty) | +2 | Potential setup |
| **Block opponent's three** | -4 | Defensive priority |
| **Center column control** | ×3 | Strategic advantage |

### Why Center Control Matters

The center column provides the most connectivity options—pieces placed there can contribute to horizontal, vertical, and both diagonal winning lines. The AI weights center column pieces **3× higher** than edge pieces.

## Quick Start

```bash
# Navigate to project directory
cd Connect4-Ai/project

# Install dependencies
npm install

# Start development server
ng serve
```

Open `http://localhost:4200` in your browser.

## Features

- Responsive design for desktop and mobile
- Smooth drop-in animations for game pieces
- Persistent score tracking across games
- Toast notifications for win/draw events
- Accessible UI with ARIA labels

## License

Open source – available for educational purposes.

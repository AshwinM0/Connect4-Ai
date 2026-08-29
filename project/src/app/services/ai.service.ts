import { Injectable } from '@angular/core';
import { GameService } from './game.service';
import {
    BOARD_WIDTH,
    BOARD_HEIGHT,
    EMPTY_CELL,
    PLAYER_HUMAN,
    PLAYER_AI,
    Player,
    Difficulty,
    DIFFICULTY_SETTINGS,
} from '../models/game.types';

@Injectable({
    providedIn: 'root',
})
export class AiService {
    /**
     * Magnitude of a forced win. Must dominate anything `scorePosition` can
     * return (bounded well under a thousand) so the search never trades a mate
     * for positional score.
     */
    private static readonly WIN_SCORE = 1_000_000;

    /**
     * Level in play. Defaults to `hard`, which is a depth-4 search with no
     * randomness - exactly how this service behaved before difficulty levels
     * existed, so callers that never set a level are unaffected and the AI
     * stays deterministic.
     */
    private difficulty: Difficulty = 'hard';

    /**
     * Columns tried centre-out (3, 2, 4, 1, 5, 0, 6 on a standard board).
     * Alpha-beta prunes hardest when the best move is searched first, and in
     * Connect 4 that is nearly always the most central column still open. It
     * also breaks ties toward the centre, which is where the strong moves are.
     */
    private static readonly COLUMN_ORDER: number[] = Array.from(
        { length: BOARD_WIDTH },
        (_, col) => col
    ).sort(
        (a, b) =>
            Math.abs(a - (BOARD_WIDTH - 1) / 2) -
            Math.abs(b - (BOARD_WIDTH - 1) / 2)
    );

    constructor(private gameService: GameService) { }

    /** Set the difficulty level used by subsequent moves */
    setDifficulty(level: Difficulty): void {
        this.difficulty = level;
    }

    /** Get the difficulty level currently in play */
    getDifficulty(): Difficulty {
        return this.difficulty;
    }

    /** Make the AI's move using minimax algorithm */
    makeMove(): number | null {
        const { searchDepth, blunderChance } = DIFFICULTY_SETTINGS[this.difficulty];

        if (blunderChance > 0 && Math.random() < blunderChance) {
            return this.randomMove();
        }

        const [col] = this.minimax(searchDepth, -Infinity, Infinity);
        return col;
    }

    /** Drop into a random playable column - how the easier levels miss things */
    private randomMove(): number | null {
        const validLocations = this.gameService.getValidLocations();
        if (validLocations.length === 0) {
            return null;
        }
        return validLocations[Math.floor(Math.random() * validLocations.length)];
    }

    /** Playable columns in search order */
    private orderedValidLocations(): number[] {
        return AiService.COLUMN_ORDER.filter(col => this.gameService.canPlay(col));
    }

    /**
     * Minimax algorithm with alpha-beta pruning.
     *
     * Whose turn it is comes from the game state alone. `isTerminalNode` and
     * `findWinningMove` already read the turn count to decide whose win a
     * terminal node represents, so carrying a separate `maximizingPlayer`
     * flag meant two sources of truth for one fact - and they agreed only
     * because the caller happened to invoke this on the right parity.
     */
    private minimax(
        depth: number,
        alpha: number,
        beta: number
    ): [number | null, number] {
        const piece = this.gameService.getCurrentPlayer();
        const validLocations = this.orderedValidLocations();
        const isTerminal = this.gameService.isTerminalNode();

        if (depth === 0 || isTerminal) {
            if (isTerminal) {
                const winResult = this.gameService.findWinningMove();
                if (winResult.result) {
                    // Bias by the remaining depth so the same mate scores higher
                    // the closer to the root it is found. Without this every win
                    // and every loss is one flat constant: the AI dawdles when
                    // winning, and when losing it sees all replies as equal and
                    // stops even blocking. Losses are the exact negation, so it
                    // plays the most resistant defence instead of giving up.
                    const score = AiService.WIN_SCORE + depth;
                    return winResult.player === PLAYER_AI
                        ? [winResult.col, score]
                        : [winResult.col, -score];
                }
                return [null, 0];
            } else {
                return [null, this.scorePosition(PLAYER_AI)];
            }
        }

        if (piece === PLAYER_AI) {
            let value = -Infinity;
            let column = validLocations[0];

            for (const col of validLocations) {
                const row = this.gameService.getColumnHeights()[col];

                // Simulate move
                this.gameService.setCellValue(row, col, piece);
                this.gameService.incrementTurn();
                this.gameService.getColumnHeights()[col]--;

                const newScore = this.minimax(depth - 1, alpha, beta)[1];

                // Undo move
                this.gameService.setCellValue(row, col, EMPTY_CELL);
                this.gameService.decrementTurn();
                this.gameService.getColumnHeights()[col]++;

                if (newScore > value) {
                    value = newScore;
                    column = col;
                }
                alpha = Math.max(alpha, value);
                if (alpha >= beta) break;
            }
            return [column, value];
        } else {
            let value = Infinity;
            let column = validLocations[0];

            for (const col of validLocations) {
                const row = this.gameService.getColumnHeights()[col];

                // Simulate move
                this.gameService.setCellValue(row, col, piece);
                this.gameService.incrementTurn();
                this.gameService.getColumnHeights()[col]--;

                const newScore = this.minimax(depth - 1, alpha, beta)[1];

                // Undo move
                this.gameService.setCellValue(row, col, EMPTY_CELL);
                this.gameService.decrementTurn();
                this.gameService.getColumnHeights()[col]++;

                if (newScore < value) {
                    value = newScore;
                    column = col;
                }
                beta = Math.min(beta, value);
                if (alpha >= beta) break;
            }
            return [column, value];
        }
    }

    /** Evaluate a window of 4 cells for scoring */
    private evaluateWindow(window: number[], piece: Player): number {
        let score = 0;
        const oppPiece = piece === PLAYER_HUMAN ? PLAYER_AI : PLAYER_HUMAN;

        const pieceCount = window.filter(cell => cell === piece).length;
        const emptyCount = window.filter(cell => cell === EMPTY_CELL).length;
        const oppCount = window.filter(cell => cell === oppPiece).length;

        if (pieceCount === 4) {
            score += 100;
        } else if (pieceCount === 3 && emptyCount === 1) {
            score += 5;
        } else if (pieceCount === 2 && emptyCount === 2) {
            score += 2;
        }

        if (oppCount === 3 && emptyCount === 1) {
            score -= 4;
        }

        return score;
    }

    /** Score the entire board position for a player */
    private scorePosition(piece: Player): number {
        let score = 0;
        const board = this.gameService.getBoard();

        // Score center column (center control is important)
        const centerCol = Math.floor(BOARD_WIDTH / 2);
        const centerArray = board.map(row => row[centerCol]);
        const centerCount = centerArray.filter(cell => cell === piece).length;
        score += centerCount * 3;

        // Score horizontal windows
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            for (let c = 0; c < BOARD_WIDTH - 3; c++) {
                const window = board[r].slice(c, c + 4);
                score += this.evaluateWindow(window, piece);
            }
        }

        // Score vertical windows
        for (let c = 0; c < BOARD_WIDTH; c++) {
            for (let r = 0; r < BOARD_HEIGHT - 3; r++) {
                const window = [
                    board[r][c],
                    board[r + 1][c],
                    board[r + 2][c],
                    board[r + 3][c],
                ];
                score += this.evaluateWindow(window, piece);
            }
        }

        // Score positive diagonal windows
        for (let r = 0; r < BOARD_HEIGHT - 3; r++) {
            for (let c = 0; c < BOARD_WIDTH - 3; c++) {
                const window = [
                    board[r][c],
                    board[r + 1][c + 1],
                    board[r + 2][c + 2],
                    board[r + 3][c + 3],
                ];
                score += this.evaluateWindow(window, piece);
            }
        }

        // Score negative diagonal windows
        for (let r = 0; r < BOARD_HEIGHT - 3; r++) {
            for (let c = 0; c < BOARD_WIDTH - 3; c++) {
                const window = [
                    board[r + 3][c],
                    board[r + 2][c + 1],
                    board[r + 1][c + 2],
                    board[r][c + 3],
                ];
                score += this.evaluateWindow(window, piece);
            }
        }

        return score;
    }
}

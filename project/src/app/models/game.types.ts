/**
 * Cell value on the Connect4 board
 * -1 = Empty, 1 = Player 1 (Human/Red), 2 = Player 2 (AI/Yellow)
 */
export type CellValue = -1 | 1 | 2;

/** Player identifier */
export type Player = 1 | 2;

/** 6x7 game board */
export type Board = CellValue[][];

/** Game constants */
export const BOARD_WIDTH = 7;
export const BOARD_HEIGHT = 6;
export const EMPTY_CELL: CellValue = -1;
export const PLAYER_HUMAN: Player = 1;
export const PLAYER_AI: Player = 2;

/** Result of checking for a winning move */
export interface WinningMoveResult {
    col: number | null;
    result: boolean;
    player: Player;
}

/** AI difficulty level, weakest to strongest */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** How a difficulty level is realised by the AI */
export interface DifficultySetting {
    /** UI label */
    label: string;
    /**
     * Plies of lookahead. Only even values are worth spending: the search
     * always starts on the AI's move, so an odd depth ends just after the AI
     * plays and reads the position optimistically. Measured over 50
     * colour-paired games per pair, depth 5 scores 48% against depth 4 and
     * depth 7 scores 49% against depth 6 - the odd ply buys nothing.
     */
    searchDepth: number;
    /**
     * Chance of skipping the search entirely and dropping into a random
     * column. Depth alone cannot make the AI beatable: `isTerminalNode`
     * spots a win-in-one for whoever is on move, so even a depth-1 search
     * still takes every win and blocks every immediate threat. This is the
     * knob that actually lets a beginner win.
     */
    blunderChance: number;
}

/** Difficulty levels in the order they should be offered */
export const DIFFICULTY_LEVELS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

/**
 * Tuning for each level. Score against a stand-in beginner / casual / strong
 * opponent, 120 colour-paired games each:
 *
 *   easy    75% / 34% /  2%
 *   medium  87% / 58% / 23%
 *   hard   100% / 92% / 41%   <- the behaviour before difficulty existed
 *   expert 100% / 95% / 50%
 */
export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySetting> = {
    easy: { label: 'Easy', searchDepth: 2, blunderChance: 0.35 },
    medium: { label: 'Medium', searchDepth: 4, blunderChance: 0.15 },
    hard: { label: 'Hard', searchDepth: 4, blunderChance: 0 },
    expert: { label: 'Expert', searchDepth: 6, blunderChance: 0 },
};

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

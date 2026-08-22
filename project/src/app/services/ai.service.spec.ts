import { TestBed } from '@angular/core/testing';
import { AiService } from './ai.service';
import { GameService } from './game.service';
import { PLAYER_AI } from '../models/game.types';
import {
    setBoard,
    snapshotState,
    renderBoard,
    AI_TO_MOVE,
} from '../../testing/board-helpers';

/**
 * The AI is always the side on move in these fixtures (odd turn count),
 * which is the only state `makeMove` is ever called from in the real game.
 */
describe('AiService', () => {
    let ai: AiService;
    let game: GameService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        ai = TestBed.inject(AiService);
        game = TestBed.inject(GameService);
        game.initializeBoard();
    });

    describe('move legality', () => {
        it('returns a playable column in a normal opening', () => {
            setBoard(game, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                '...X...',
            ], AI_TO_MOVE);

            const col = ai.makeMove();

            expect(col).not.toBeNull();
            expect(col).toBeGreaterThanOrEqual(0);
            expect(col).toBeLessThan(7);
            expect(game.canPlay(col as number)).toBeTrue();
        });

        it('never picks a full column', () => {
            setBoard(game, [
                'XO.....',
                'OX.....',
                'XO.....',
                'OX.....',
                'XO.....',
                'OX.....',
            ], 11);

            const col = ai.makeMove();

            expect([0, 1]).not.toContain(col as number);
            expect(game.canPlay(col as number)).toBeTrue();
        });

        it('picks the only legal column when the board is nearly full', () => {
            setBoard(game, [
                'XXXOOO.',
                'OOOXXX.',
                'XXXOOO.',
                'OOOXXX.',
                'XXXOOOX',
                'OOOXXXO',
            ], 39);

            expect(ai.makeMove()).toBe(6);
        });
    });

    describe('tactics', () => {
        it('takes an immediate horizontal win', () => {
            setBoard(game, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                'OOO.XX.',
            ], 5);

            expect(ai.makeMove()).toBe(3);
        });

        it('takes an immediate vertical win', () => {
            setBoard(game, [
                '.......',
                '.......',
                '.......',
                '....O..',
                '.X..O..',
                '.XX.O..',
            ], 5);

            expect(ai.makeMove()).toBe(4);
        });

        it('blocks an immediate vertical threat', () => {
            setBoard(game, [
                '.......',
                '.......',
                '.......',
                '...X...',
                '...X...',
                '.O.XO.O',
            ], 7);

            expect(ai.makeMove()).toBe(3);
        });

        it('blocks an immediate horizontal threat', () => {
            setBoard(game, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.O.....',
                'XXX.O.O',
            ], 7);

            expect(ai.makeMove()).toBe(3);
        });

        it('blocks an immediate diagonal threat', () => {
            setBoard(game, [
                '.......',
                '.......',
                'X......',
                'OX.....',
                'XOX....',
                'OXO....',
            ], 9);

            expect(ai.makeMove()).toBe(3);
        });

        it('prefers winning over blocking when it can do both', () => {
            setBoard(game, [
                '.......',
                '.......',
                '.......',
                '.......',
                '....XXX',
                'OOO.XOO',
            ], 11);

            expect(ai.makeMove()).toBe(3);
        });
    });

    describe('search hygiene', () => {
        it('leaves the board, heights and turn count exactly as it found them', () => {
            setBoard(game, [
                '.......',
                '.......',
                '.......',
                '..X....',
                '..OX...',
                '.XOOX..',
            ], AI_TO_MOVE);

            const before = snapshotState(game);
            ai.makeMove();
            const after = snapshotState(game);

            expect(after).toBe(before, `board drifted during search: ${renderBoard(game)}`);
        });

        it('does not place a piece of its own as a side effect', () => {
            setBoard(game, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                '...X...',
            ], AI_TO_MOVE);

            ai.makeMove();

            const board = game.getBoard();
            const aiPieces = board
                .flat()
                .filter(cell => cell === PLAYER_AI).length;
            expect(aiPieces).toBe(0);
        });

        it('still reports the human as having no move played for it', () => {
            setBoard(game, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                '...X...',
            ], AI_TO_MOVE);

            ai.makeMove();

            expect(game.getTurnCount()).toBe(AI_TO_MOVE);
            expect(game.getCurrentPlayer()).toBe(PLAYER_AI);
        });
    });
});

import { TestBed } from '@angular/core/testing';
import { AiService } from './ai.service';
import { GameService } from './game.service';
import {
    PLAYER_AI,
    Difficulty,
    DIFFICULTY_LEVELS,
    DIFFICULTY_SETTINGS,
} from '../models/game.types';
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

    describe('difficulty', () => {
        /** AI to move, one move from winning at column 3. */
        const WINNABLE: string[] = [
            '.......',
            '.......',
            '.......',
            '.......',
            '.......',
            'OOO.XX.',
        ];

        /** 42 pieces, 21 each, no line of four - every column is full. */
        const FULL_BOARD: string[] = [
            'XXXOOOX',
            'OOOXXXO',
            'XXXOOOX',
            'OOOXXXO',
            'XXXOOOX',
            'OOOXXXO',
        ];

        it('defaults to hard - the behaviour from before levels existed', () => {
            expect(ai.getDifficulty()).toBe('hard');
        });

        it('remembers the level it was given', () => {
            ai.setDifficulty('easy');

            expect(ai.getDifficulty()).toBe('easy');
        });

        describe('settings table', () => {
            it('has an entry for every level on offer', () => {
                expect(DIFFICULTY_LEVELS.length).toBe(
                    Object.keys(DIFFICULTY_SETTINGS).length
                );
                DIFFICULTY_LEVELS.forEach(level => {
                    expect(DIFFICULTY_SETTINGS[level]).toBeDefined();
                    expect(DIFFICULTY_SETTINGS[level].label).toBeTruthy();
                });
            });

            it('searches to an even depth at every level', () => {
                // The search always starts on the AI's move, so an odd depth
                // stops just after the AI plays and reads the position
                // optimistically. Measured, the odd ply buys nothing: depth 5
                // scores 48% against depth 4, depth 7 scores 49% against 6.
                DIFFICULTY_LEVELS.forEach(level => {
                    expect(DIFFICULTY_SETTINGS[level].searchDepth % 2)
                        .toBe(0, `${level} searches to an odd depth`);
                });
            });

            it('gets stronger as the levels go up', () => {
                for (let i = 1; i < DIFFICULTY_LEVELS.length; i++) {
                    const weaker = DIFFICULTY_SETTINGS[DIFFICULTY_LEVELS[i - 1]];
                    const stronger = DIFFICULTY_SETTINGS[DIFFICULTY_LEVELS[i]];

                    expect(stronger.searchDepth)
                        .toBeGreaterThanOrEqual(weaker.searchDepth);
                    expect(stronger.blunderChance)
                        .toBeLessThanOrEqual(weaker.blunderChance);
                }
            });

            it('keeps hard identical to the pre-difficulty AI', () => {
                expect(DIFFICULTY_SETTINGS.hard.searchDepth).toBe(4);
                expect(DIFFICULTY_SETTINGS.hard.blunderChance).toBe(0);
            });
        });

        describe('levels that never blunder', () => {
            (['hard', 'expert'] as Difficulty[]).forEach(level => {
                it(`${level} plays the searched move and never rolls a dice`, () => {
                    const random = spyOn(Math, 'random').and.returnValue(0);
                    setBoard(game, WINNABLE, 5);
                    ai.setDifficulty(level);

                    expect(ai.makeMove()).toBe(3);
                    expect(random).not.toHaveBeenCalled();
                });
            });
        });

        describe('levels that blunder', () => {
            it('drops in a random column when the roll is under the threshold', () => {
                // 0 is below easy's 0.35 so it blunders; 0.99 then indexes the
                // last of the seven legal columns.
                spyOn(Math, 'random').and.returnValues(0, 0.99);
                setBoard(game, WINNABLE, 5);
                ai.setDifficulty('easy');

                expect(ai.makeMove()).toBe(6);
            });

            it('still searches when the roll is over the threshold', () => {
                spyOn(Math, 'random').and.returnValue(0.99);
                setBoard(game, WINNABLE, 5);
                ai.setDifficulty('easy');

                expect(ai.makeMove()).toBe(3);
            });

            it('uses the threshold belonging to its own level', () => {
                setBoard(game, WINNABLE, 5);
                ai.setDifficulty('medium');
                const random = spyOn(Math, 'random').and.returnValues(0.1, 0);

                // 0.1 < 0.15 -> blunder, then index 0 of the legal columns
                expect(ai.makeMove()).toBe(0);

                // 0.2 >= 0.15 -> search runs and finds the win
                random.and.returnValue(0.2);
                expect(ai.makeMove()).toBe(3);
            });

            it('never blunders into a full column', () => {
                spyOn(Math, 'random').and.returnValues(0, 0);
                setBoard(game, [
                    'XO.....',
                    'OX.....',
                    'XO.....',
                    'OX.....',
                    'XO.....',
                    'OX.....',
                ], 11);
                ai.setDifficulty('easy');

                const col = ai.makeMove() as number;

                expect([0, 1]).not.toContain(col);
                expect(game.canPlay(col)).toBeTrue();
            });

            it('returns null when a blunder finds no legal column', () => {
                // Board is full, so the turn count is moot - this only exercises
                // the blunder path, which runs before any terminal check.
                spyOn(Math, 'random').and.returnValue(0);
                setBoard(game, FULL_BOARD, 42);
                ai.setDifficulty('easy');

                expect(ai.makeMove()).toBeNull();
            });
        });

        it('leaves the board untouched whichever level is in play', () => {
            DIFFICULTY_LEVELS.forEach(level => {
                setBoard(game, WINNABLE, 5);
                ai.setDifficulty(level);
                const before = snapshotState(game);

                ai.makeMove();

                expect(snapshotState(game))
                    .toBe(before, `${level} drifted the board: ${renderBoard(game)}`);
            });
        });
    });

});

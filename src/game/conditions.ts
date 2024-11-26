import { BannedChara, Card, Destination, Field, Player, PlayReason, ToPlay, UIStateCode } from "../types";

export type HandCheckResult = {
    isWin: boolean;
    isReady: boolean;
    isInvalidWin: boolean;
};

export const handCheck = (p: Player, len: number, dest: Destination): HandCheckResult => {
    const toZero = p.hands.filter(a => a.value > -1).length <= len;
    const isWin = p.state === "ready" && toZero;
    const isReady = p.state === "normal" && toZero;
    return { isWin, isReady, isInvalidWin: isWin && dest !== Destination.Field };
};

export type WordPlayCheckResult = {
    isWordPlay: boolean;
    word: string;
};

export const commands = [
    "ape",
    "ban",
    "eel",
    "pole",
    "undo",
    "done",
    "pool",
    "loop",
    "peeq",
    "boon",
    "queue",
];

export const wordPlayList = [
    // personalities
    "ando",
    "ueno",
    "abe",
    "bale",
    // commmand
    "ape",
    "ban",
    "eel",
    "pole",
    "undo",
    "done",
    "pool",
    "loop",
    "peeq",
    "boon",
    "queue",
];

export const wordPlayCheck = (sequence: string): WordPlayCheckResult => {
    const word = wordPlayList.find((word) => sequence.endsWith(word));
    return {
        isWordPlay: word !== undefined,
        word: word || "",
    }
};

export const calcPlayableHands = (hands: Card[], filed: Field, isRevolving: boolean, code: UIStateCode, bannedChara: BannedChara[]): Card[] => {
    const { top, sequence } = filed;

    const isFirst = code === UIStateCode.InYourTurn;
    const isSecond = code === UIStateCode.PlayOneCard;
    return hands
        .map(c => {

            if (c.value === -1) {
                return c;
            }

            const charas = getCharas(c);
            const conditions = charas.map((chara) => {
                const reasons: PlayReason[] = [];

                if (!bannedChara.some((b) => b.chara === chara)) {
                    if (isFirst) {
                        if (chara === top.chara) {
                            reasons.push(PlayReason.ByChara);
                        } else if (top.originalChara === "") {
                            reasons.push(PlayReason.ByChara);
                        }

                        if ((isRevolving ? c.value <= top.value : top.value <= c.value)) {
                            reasons.push(PlayReason.ByValue);
                        } else if (top.value === -1) {
                            reasons.push(PlayReason.ByValue);
                        }
                    }
                    if ((isFirst || isSecond) && sequence.length > 0) {
                        const str = sequence + chara;
                        const back2 = str.slice(-2);
                        const back3 = str.slice(-3);
                        const back4 = str.slice(-4);
                        const back5 = str.slice(-5);

                        const isOk = wordPlayList.some((word) => {
                            return word.startsWith(back2)
                                || word.startsWith(back3)
                                || word.startsWith(back4)
                                || word.startsWith(back5);
                        });
                        if (isOk) {
                            reasons.push(PlayReason.ByWordPlay);
                        }
                    }
                }
                return {
                    chara: chara,
                    isAbleToPlay: reasons.length > 0,
                    reasons: reasons,
                } as ToPlay;
            });
            return {
                ...c,
                conditionsToPlay: conditions,
            }
        });
}

const getCharas = (c: Card): string[] => {
    const a = c.originalChara;
    const b = invert(a);
    if (a === b) {
        return [a];
    }
    return [a, b];
}

const invert = (chara: string): string => {

    // - 'a', 'e'
    // - 'n', 'u'
    // - 'd', 'p'
    // - 'o'
    // - 'b', 'q'
    // - 'l'

    const mapping = {
        "a": "e",
        "n": "u",
        "d": "p",
        "o": "o",
        "b": "q",
        "l": "l",
        // vice versa
        "e": "a",
        "u": "n",
        "p": "d",
        "q": "b",
    }

    const x = mapping[chara as keyof typeof mapping]
    return x || chara;
}
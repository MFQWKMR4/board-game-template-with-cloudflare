import { Card } from "../types";
import { v4 as uuidv4 } from 'uuid';

// - originalChar:
//   - 'a'
//   - 'n'
//   - 'd'
//   - 'o'
//   - 'b'
//   - 'l'

// - char:
//   - Includes not only the originalChar but also characters created by rotating an originalChar.
//   - 'a', 'e'
//   - 'n', 'u'
//   - 'd', 'p'
//   - 'o'
//   - 'b', 'q'
//   - 'l'

const chars = ["a", "e", "n", "u", "d", "p", "o", "b", "q", "l"];
const originalChars = ["a", "n", "d", "o", "b", "l"];
const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const emptyCard = (): Card => {
    return {
        id: "0-0",
        originalChara: "",
        chara: "",
        value: -1,
        conditionsToPlay: [],
    }
}

export const getRandomChar = (): string => {
    const index = Math.floor(Math.random() * chars.length);
    return chars[index] as string;
}

const newCard = (originalChara: string, value: number): Card => {
    const id = uuidv4();
    const splitted = id.split('-');
    const key = splitted[0] + '-' + splitted[1];
    const chara = originalChara;
    return {
        id: key, originalChara, chara, value, conditionsToPlay: [],
    };
}

export const createCard = (originalChara: string): Card => {
    const id = uuidv4();
    const splitted = id.split('-');
    const key = splitted[0] + '-' + splitted[1];
    const chara = originalChara;
    const value = Math.floor(Math.random() * 10);
    return {
        id: key, originalChara, chara, value, conditionsToPlay: [],
    };
}

const genAllCards = () => originalChars.flatMap((originalChar) => {
    return values.map((value) => {
        return newCard(originalChar, value);
    });
});

export const newDeck = (): Card[] => {
    const a = genAllCards();
    const b = genAllCards();
    // concat
    const c = a.concat(b);
    //shuffle
    const d: Card[] = c.sort(() => Math.random() - 0.5);
    return d;

    // const debug: Card[] = [
    //     {
    //         id: "debug-1",
    //         originalChara: "n",
    //         chara: "n",
    //         value: 0,
    //         conditionsToPlay: [],
    //     },
    //     {
    //         id: "debug-2",
    //         originalChara: "n",
    //         chara: "n",
    //         value: 0,
    //         conditionsToPlay: [],
    //     },
    //     {
    //         id: "debug-3",
    //         originalChara: "d",
    //         chara: "d",
    //         value: 0,
    //         conditionsToPlay: [],
    //     },
    //     {
    //         id: "debug-4",
    //         originalChara: "o",
    //         chara: "o",
    //         value: 0,
    //         conditionsToPlay: [],
    //     },
    // ]

    // const ret = debug.concat(d);
    // return ret;
}


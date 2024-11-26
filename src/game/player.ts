import { Card, Player, PlayerPersonalityEnum } from "../types";
import { emptyCard } from "./card";

const newPlayer = (playerId: string): Player => {
    return {
        playerId,
        name: extractPlayerName(playerId),
        personality: "NONE",
        state: "normal",
        hands: [],
        handsCount: 0,
        toSkip: false,
        cannotReceiveCard: false,
        power: 3,
    };
}

const setPersonality = (player: Player, personality: PlayerPersonalityEnum): Player => {
    return {
        ...player,
        personality
    };
}

const setHands = (player: Player, hands: Card[]): Player => {
    return {
        ...player,
        hands
    };
}

export const privaten = (p: Player, playerId: string): Player => {

    if (p.playerId === playerId) {
        return p;
    }

    return {
        ...p,
        personality: "NONE",
        hands: [],
        handsCount: p.hands.length,
    }
}

export const extractPlayerName = (key: string) => {
    return key.split('-').slice(0, -1).join('-') as string
}

export const personalities: PlayerPersonalityEnum[] = ["ando", "ueno", "abe", "bale"];

export const initPlayers = (playerIds: string[], deck: Card[]): Player[] => {

    if (playerIds.length > 4) {
        throw new Error("playerNames should be less than or equal to 4");
    }
    // shuffle personalities
    const shuffledPersonalities = personalities.sort(() => Math.random() - 0.5);
    return playerIds.map((pid, index) => {
        const base = newPlayer(pid);
        const a = setPersonality(base, shuffledPersonalities[index] as PlayerPersonalityEnum);
        const b = setHands(a, deck.splice(0, a.personality === PlayerPersonalityEnum.Ueno ? 5 : 9));

        if (a.personality === PlayerPersonalityEnum.Ueno) {
            b.hands.push(emptyCard());
            b.hands.push(emptyCard());
            b.hands.push(emptyCard());
            b.hands.push(emptyCard());
        }
        return b;
    });
}

export const updatePlayers = (
    players: Player[],
    predicate: (player: Player) => boolean,
    update: (player: Player) => Player
): Player[] => {
    return players.map(player => {
        if (predicate(player)) {
            return update(player);
        }
        return player;
    });
}

import { Card, Destination, Environment } from "../types";
import { emptyCard } from "./card";

export const cleanField = (environment: Environment): Environment => {
    return {
        ...environment,
        field: {
            sequence: "",
            top: emptyCard()
        }
    }
}

export const giveToEnvironment = (environment: Environment, cards: Card[], destination: Destination): Environment => {
    if (destination === Destination.Field) {
        const currentString = environment.field.sequence;
        const add = cards.map(c => c.chara).join('');
        const newField = {
            top: cards[cards.length - 1] as Card,
            sequence: currentString + add
        }
        return {
            ...environment,
            field: newField
        }
    } else if (destination === Destination.CardPool) {
        if (environment.cardPool.cards === undefined) {
            environment.cardPool.cards = [];
        }
        environment.cardPool.cards.push(...cards);
        environment.cardPool.amount = environment.cardPool.cards.length;
        return environment;
    } else if (destination === Destination.CardQueue) {
        if (environment.cardQueue.cards === undefined) {
            environment.cardQueue.cards = [];
        }
        environment.cardQueue.cards.push(...cards);
        environment.cardQueue.amount = environment.cardQueue.cards.length;
        return environment;
    } else {
        throw new Error("Invalid destination");
    }
}

export const takeFromEnvironment = (environment: Environment, card: Card | undefined, source: Destination): { env: Environment, card?: Card } => {
    if (source === Destination.CardPool) {
        if (environment.cardPool.cards === undefined) {
            throw new Error("No card in cardPool");
        }
        const c = environment.cardPool.cards.pop();
        environment.cardPool.amount = environment.cardPool.cards.length;
        if (c === undefined) {
            throw new Error("Card not found in cardPool");
        }
        return { env: environment, card: c };
    } else if (source === Destination.CardQueue) {
        if (environment.cardQueue.cards === undefined) {
            throw new Error("No card in cardQueue");
        }
        // キューの先頭を取り出す
        const c = environment.cardQueue.cards.shift();
        environment.cardQueue.amount = environment.cardQueue.cards.length;
        if (c === undefined) {
            throw new Error("Card not found in cardQueue");
        }
        return { env: environment, card: c };
    } else {
        throw new Error("Invalid destination");
    }
}
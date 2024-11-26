// THIS FILE IS GENERATED. DO NOT EDIT IT.
import { UIStateCode } from "../types";

type StateCodeMapping = {
  [state: string]: {
    [event: string]: UIStateCode;
  };
}

const transitions: StateCodeMapping = {
  "START": {
    "BySystem(INITIALIZING)": "INITIALIZING"
  },
  "INITIALIZING": {
    "BySystem(IN_YOUR_TURN)": "IN_YOUR_TURN"
  },
  "IN_YOUR_TURN": {
    "WsPlayCard_normal": "PLAY_ONE_CARD",
    "WsPlayCard_others": "PLAY_CARD_TO_OTHER",
    "WsPlayCard_undo": "UNDO_EFFECT_1",
    "WsPlayCard_peeq": "PEEQ_EFFECT_1",
    "WsPlayCard_win": "YOU_WON",
    "WsAndoAbility": "IN_YOUR_TURN",
    "WsPowerUp": "IN_YOUR_TURN",
    "WsReceiveCard": "IN_OTHERS_TURN"
  },
  "PLAY_ONE_CARD": {
    "WsPlayCard_normal": "PLAY_TWO_CARD",
    "WsPlayCard_undo": "UNDO_EFFECT_2",
    "WsPlayCard_peeq": "PEEQ_EFFECT_2",
    "WsPlayCard_win": "YOU_WON",
    "WsAndoAbility": "PLAY_ONE_CARD",
    "WsReceiveCard": "IN_OTHERS_TURN",
    "WsPowerUp": "PLAY_ONE_CARD"
  },
  "IN_OTHERS_TURN": {
    "BySystem(IN_YOUR_TURN)": "IN_YOUR_TURN",
    "BySystem(YOU_LOST)": "YOU_LOST",
    "WsAndoAbility": "IN_OTHERS_TURN"
  },
  "UNDO_EFFECT_1": {
    "WsChoosePlayer": "PLAY_ONE_CARD",
    "WsAndoAbility": "UNDO_EFFECT_1"
  },
  "UNDO_EFFECT_2": {
    "WsChoosePlayer": "PLAY_TWO_CARD",
    "WsAndoAbility": "UNDO_EFFECT_2"
  },
  "PEEQ_EFFECT_1": {
    "WsChoosePlayer": "PLAY_ONE_CARD",
    "WsAndoAbility": "PEEQ_EFFECT_1"
  },
  "PEEQ_EFFECT_2": {
    "WsChoosePlayer": "PLAY_TWO_CARD",
    "WsAndoAbility": "PEEQ_EFFECT_2"
  },
  "PLAY_TWO_CARD": {
    "WsReceiveCard": "IN_OTHERS_TURN",
    "WsAndoAbility": "PLAY_TWO_CARD",
    "WsPowerUp": "PLAY_TWO_CARD"
  },
  "PLAY_CARD_TO_OTHER": {
    "WsReceiveCard": "IN_OTHERS_TURN",
    "WsAndoAbility": "PLAY_CARD_TO_OTHER",
    "WsPowerUp": "PLAY_CARD_TO_OTHER"
  },
  "YOU_WON": {
    "continueToPlay": "INITIALIZING",
    "quit": "END"
  },
  "YOU_LOST": {
    "continueToPlay": "INITIALIZING",
    "quit": "END"
  }
};

export const nextState = (state: UIStateCode | undefined, event: Event | undefined): UIStateCode => {
  if (!state) {
    throw new Error(`Invalid state: undefined`);
  }

  if (!event) {
    return state
  }

  const one = transitions[state];
  if (!one) {
    console.warn(`No matched state: ${state}`);
    return state;
  }

  const two = one[event];
  if (!two) {
    console.warn(`No matched event: ${state}, ${event}`);
    return state;
  }
  return two;
}


export type Event = "BySystem(INITIALIZING)"
  | "BySystem(IN_YOUR_TURN)"
  | "WsPlayCard_normal"
  | "WsPlayCard_others"
  | "WsPlayCard_undo"
  | "WsPlayCard_peeq"
  | "WsPlayCard_win"
  | "WsAndoAbility"
  | "WsPowerUp"
  | "WsReceiveCard"
  | "WsPlayCard_normal"
  | "WsPlayCard_undo"
  | "WsPlayCard_peeq"
  | "WsPlayCard_win"
  | "WsAndoAbility"
  | "WsReceiveCard"
  | "WsPowerUp"
  | "BySystem(IN_YOUR_TURN)"
  | "BySystem(YOU_LOST)"
  | "WsAndoAbility"
  | "WsChoosePlayer"
  | "WsAndoAbility"
  | "WsChoosePlayer"
  | "WsAndoAbility"
  | "WsChoosePlayer"
  | "WsAndoAbility"
  | "WsChoosePlayer"
  | "WsAndoAbility"
  | "WsReceiveCard"
  | "WsAndoAbility"
  | "WsPowerUp"
  | "WsReceiveCard"
  | "WsAndoAbility"
  | "WsPowerUp"
  | "continueToPlay"
  | "quit"
  | "continueToPlay"
  | "quit"
  ;

export type EventMap = {
  [playerId: string]: Event;
}


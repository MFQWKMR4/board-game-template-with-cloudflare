


import { createInterface } from 'readline';

// input from stdin
const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

let mermaidDiagram = '';

// 入力の読み込み
rl.on('line', (line) => {
    mermaidDiagram += line + '\n';
});

rl.on('close', () => {
    const res = parseMermaidStateDiagram(mermaidDiagram);
    console.log(generateTransitionsCode(res.transitions));
    console.log();
    console.log(generateEventsCode(res.events));
});

// --------------------------------------------------------------------------------------

function generateTransitionsCode(transitions: Transitions): string {
    return `// THIS FILE IS GENERATED. DO NOT EDIT IT.
import { UIStateCode } from "../types";

type StateCodeMapping = {
  [state: string]: {
    [event: string]: UIStateCode;
  };
}

const transitions: StateCodeMapping = ${JSON.stringify(transitions, null, 2)};

export const nextState = (state: UIStateCode | undefined, event: Event | undefined): UIStateCode => {
  if (!state) {
    throw new Error(\`Invalid state: undefined\`);
  }

  if (!event) {
    return state
  }

  const one = transitions[state];
  if (!one) {
    console.warn(\`No matched state: \${state}\`);
    return state;
  }

  const two = one[event];
  if (!two) {
    console.warn(\`No matched event: \${state}, \${event}\`);
    return state;
  }
  return two;
}
`;
}

function generateEventsCode(events: string[]): string {
    return `export type Event = ${events.map(e => `"${e}"\n`).join(' | ')};
    
export type EventMap = {
  [playerId: string]: Event;
}
`;
}

type Generator = {
    transitions: Transitions;
    events: string[];
}

type Transitions = {
    [state: string]: { [event: string]: string };
};

function parseMermaidStateDiagram(diagram: string): Generator {
    const transitions: Transitions = {};
    const pattern = /([^\s]+)\s*-->\s*([^\s]+)\s*:\s*([^\s]+)/g;
    let match: RegExpExecArray | null;

    const events: string[] = [];

    while ((match = pattern.exec(diagram)) !== null) {
        const [_, fromState, toState, event] = match;

        const from = fromState?.trim() as string;
        const to = toState?.trim() as string;
        const ev = event?.trim() as string;

        if (!transitions[from]) {
            transitions[from] = {};
        }

        if (transitions[from][ev]) {
            throw new Error(`Duplicate transition: ${from} --${ev}--> ${to}`);
        }
        events.push(ev);
        transitions[from][ev] = to;
    }
    return { transitions, events };
}

import { DurableObject } from 'cloudflare:workers'
import { BannedChara, Card, Chat, Destination, ErrorDetail, GameLogicState, GamePhase, GameState, Player, PlayerPersonalityEnum, PlayerStateEnum, UIState, UIStateCode, WsAndoAbility, WsChooseHandFromClient, WsChoosePlayer, WsContinueToPlayFromClient, WsFetch, WsMessage, WsPlayCard, WsPowerUp, WsReceiveCard, WsSystemStateFromServer } from './types'
import { decode } from 'hono/jwt'
import { createCard, emptyCard, getRandomChar, newDeck } from './game/card'
import { extractPlayerName, initPlayers, personalities, privaten, updatePlayers } from './game/player'
import { nextPlayerId } from './game/turn'
import { calcPlayableHands, handCheck, wordPlayCheck } from './game/conditions'
import { cleanField, giveToEnvironment, takeFromEnvironment } from './game/environment'
import { v4 as uuidv4 } from 'uuid';
import { EventMap, nextState } from './game/transition'
import { match } from './utils/match'

const initialState: GameState = {
    versionId: "0",
    name: 'game',
    playerIds: [],
    phase: GamePhase.Waiting,
    numberOfPlayers: 0,
    gameLogicState: {
        deck: [],
        turnPlayerId: '',
        turnNumber: 0,
        orderedPlayerIds: [],
        players: [],
        environment: {
            field: {
                top: emptyCard(),
                sequence: "",
            },
            cardPool: {
                amount: 0,
            },
            cardQueue: {
                amount: 0,
            }
        },
        chatHistory: [],
        isRevolving: false,
        forClient: {},
        skipCount: 0,
        bannedChara: [],
        loopSnapShot: {},
        isNoAction: false,
        andoAbilityCount: 0,
        isBoon: false,
        readyCount: 0,
    }
}

type HandlerResult = {
    gameState: GameState,
    events: EventMap,
}

type SystemState = {
    gameState: GameState,
    // 今後GameState以外を持つ必要が出るかもしれないので、この形にしておく
}

export class Room extends DurableObject {

    async initialize(name: string, numberOfPlayers: number, playerId: string) {
        const playerName = extractPlayerName(playerId)
        const message = `${playerName} created the room`
        const state: GameState = {
            versionId: "0",
            name: name,
            playerIds: [playerId],
            phase: GamePhase.Waiting,
            numberOfPlayers: numberOfPlayers,
            gameLogicState: {
                deck: [],
                turnPlayerId: '',
                turnNumber: 0,
                orderedPlayerIds: [],
                players: [],
                environment: {
                    field: {
                        top: emptyCard(),
                        sequence: "",
                    },
                    cardPool: {
                        amount: 0,
                    },
                    cardQueue: {
                        amount: 0,
                    }
                },
                isRevolving: false,
                forClient: {
                    [playerId]: UIStateCode.Initializing
                },
                chatHistory: [{ message, sender: playerName }],
                skipCount: 0,
                bannedChara: [],
                loopSnapShot: {},
                isNoAction: false,
                andoAbilityCount: 0,
                isBoon: false,
                readyCount: 0,
            },
        }
        await this.ctx.storage.put('gameState', state)
    }

    async join(playerId: string): Promise<void> {
        const result = await this.updateGameState(async (state) => {
            const playerName = extractPlayerName(playerId)
            const message = `${playerName} joined the room`
            state.gameLogicState.chatHistory.push({ message, sender: playerName })
            state.playerIds.push(playerId)

            if (state.playerIds.length === state.numberOfPlayers) {
                state.phase = GamePhase.Playing
                state.gameLogicState = this.initializeGame(state.playerIds)
                const forClient = {} as { [key: string]: UIStateCode; }
                state.playerIds.forEach(id => {
                    if (state.gameLogicState.turnPlayerId === id) {
                        forClient[id] = UIStateCode.InYourTurn
                    } else {
                        forClient[id] = UIStateCode.InOthersTurn
                    }
                })
                state.gameLogicState.forClient = forClient
            } else {
                const forClient = {} as { [key: string]: UIStateCode; }
                state.playerIds.forEach(id => {
                    forClient[id] = UIStateCode.Initializing
                })
                state.gameLogicState.forClient = forClient
            }
            return {
                gameState: state,
            }
        });
        await this.respondToAll(playerId, result)
        return
    }

    async fetch(request: Request): Promise<Response> {
        const q = request.url.split('?')[1];
        if (!q) {
            return new Response('Missing query string', { status: 400 });
        }
        const token = q.split('=')[1]
        if (!token) {
            return new Response('Unauthorized', { status: 401 });
        }
        const payload = decode(token)
        const playerId = payload.payload.playerId as string
        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);
        const socket = server!;
        this.ctx.acceptWebSocket(socket, [playerId]);
        return new Response(null, { status: 101, webSocket: client });
    };

    // 
    // common use
    // 

    // ### main flow ###
    //
    // 1. listen to WebSocket
    // 
    async webSocketMessage(_socket: WebSocket, message: string | ArrayBuffer) {
        console.log("WebSocket message:", message);
        const parsed: WsMessage = JSON.parse(message as string);
        await this.execWsHandler(parsed);
    }

    //
    // 2. handle WebSocket message
    //    - error handling
    //    - if WsFetch
    //      - return current state for viewer
    //      - return current state for player
    //    - else
    //      - update game state and broadcast
    async execWsHandler(parsed: WsMessage) {
        try {
            if (!parsed.messageType) {
                const ed: ErrorDetail = {
                    senderId: parsed.body.playerId,
                    requestJson: JSON.stringify(parsed),
                    errorSummary: "messageType is missing",
                    errorMessage: "",
                }
                await this.reportError(ed)
                return;
            }
            const typeName = parsed.messageType as keyof WsTypeMap;
            const casted: WsTypeMap[keyof WsTypeMap] = dynamicCast(typeName, parsed.body);
            if (typeName === 'WsFetch') {
                const tmp = casted as WsFetch;
                const playerId = tmp.playerId;
                if (!tmp.isViewer) {
                    const result = await this.fetchGameState()
                    const gameState = this.toGameStateForClient(result.gameState, playerId);
                    const uiState = this.toUIState(gameState, playerId, playerId);
                    await this.sendTo(playerId, this.toWsMessage(gameState, uiState, undefined));
                } else {
                    const state = await this.getGameState();
                    const uiState = {
                        phase: state.phase,
                        uiStateCode: UIStateCode.Viewer,
                    }
                    await this.sendTo(playerId, this.toWsMessage(state, uiState, undefined));
                }
            } else {
                const res = await this.updateGameState(
                    this.toSystemState(this.genHandler(typeName, casted))
                )
                await this.respondToAll(casted.playerId, res)
            }
        } catch (e) {
            const ed: ErrorDetail = {
                senderId: parsed.body.playerId,
                requestJson: JSON.stringify(parsed),
                errorSummary: "raised exception in execWsHandler",
                errorMessage: JSON.stringify(e)
            }
            await this.reportError(ed)
        }
    }

    //
    // 3. update game state
    //    1. handler(state, input) => (state, events)
    //    2. stateCodeTransition(state, events) => state
    //    3. save state to storage and return
    async updateGameState<T>(callback: (state: GameState) => Promise<SystemState>) {
        const result: SystemState = await this.ctx.blockConcurrencyWhile(async () => {
            const state = await this.getGameState();
            const res = await callback(state);
            const versionId = uuidv4();
            res.gameState.versionId = versionId.split('-')[0] as string;
            await this.ctx.storage.put('gameState', res.gameState);
            return res
        });
        return result
    }

    toSystemState(callback: (state: GameState) => Promise<HandlerResult>): (state: GameState) => Promise<SystemState> {
        return async (state: GameState) => {
            const { gameState, events } = await callback(state);
            return this.stateCodeTransition(gameState, events)
        }
    }

    stateCodeTransition(state: GameState, events: EventMap): SystemState {
        const newForClient = {} as { [key: string]: UIStateCode; }
        state.playerIds.forEach(id => {
            const old = state.gameLogicState.forClient[id]
            const event = events[id]
            newForClient[id] = nextState(old, event)
        })
        state.gameLogicState.forClient = newForClient
        return {
            gameState: state,
        }
    }

    // ### followings are trivial methods ###
    //

    toWsMessage(state: GameState, uiState: UIState, errorDetail: ErrorDetail | undefined): string {
        const body: WsSystemStateFromServer = {
            gameState: state,
            uiState: uiState,
            errorDetail: errorDetail,
        }
        const message: WsMessage = {
            messageType: 'WsSystemStateFromServer',
            body: body
        }
        return JSON.stringify(message);
    }

    async getGameState(): Promise<GameState> {
        let value: GameState = (await this.ctx.storage.get('gameState')) || initialState
        return value
    }

    async respondToAll<T>(from: string, result: SystemState) {
        const playerIds = result.gameState.playerIds;
        playerIds.forEach(async to => {
            const stateForClient = this.toGameStateForClient(result.gameState, to);
            const uiState = this.toUIState(result.gameState, from, to);
            await this.sendTo(to, this.toWsMessage(stateForClient, uiState, undefined));
        });
    }

    async reportError(errorDetail: ErrorDetail) {
        const state = await this.getGameState();
        const uiState = {
            phase: GamePhase.Playing,
            uiStateCode: UIStateCode.Error,
        };
        await this.sendTo(errorDetail.senderId, this.toWsMessage(state, uiState, errorDetail));
    }

    async sendTo(playerId: string, message: string) {
        const sockets = this.ctx.getWebSockets(playerId);
        for (const socket of sockets) {
            socket.send(message);
        }
    }

    async fetchGameState(): Promise<SystemState> {
        const state = await this.getGameState();
        return {
            gameState: state,
        }
    }

    async webSocketClose(socket: WebSocket, code: number, reason: string, wasClean: boolean) {
        socket.close(code, "Durable Object is closing WebSocket");
    }

    async webSocketError(socket: WebSocket, error: Error) {
        console.error("WebSocket error:", error);
    }

    //
    // game logic
    //

    initializeGame(playerIds: string[]): GameLogicState {
        const deck = newDeck();
        const ids = playerIds.sort(() => Math.random() - 0.5);
        const players = initPlayers(ids, deck);

        const res: GameLogicState = {
            deck,
            turnPlayerId: ids[0] as string,
            turnNumber: 0,
            orderedPlayerIds: ids,
            players,
            environment: {
                field: {
                    top: emptyCard(),
                    sequence: "",
                },
                cardPool: {
                    amount: 0,
                },
                cardQueue: {
                    cards: [],
                    amount: 0,
                },
            },
            isRevolving: false,
            forClient: {},
            chatHistory: [],
            skipCount: 0,
            bannedChara: [],
            loopSnapShot: {},
            isNoAction: false,
            andoAbilityCount: 0,
            isBoon: false,
            readyCount: 0,
        }
        return res
    }

    toGameStateForClient(state: GameState, playerId: string): GameState {
        const target = state.gameLogicState.players.find(p => p.playerId === playerId)
        const players = state.gameLogicState.players.map(player => {
            if (player.playerId === playerId) {
                const code: UIStateCode = state.gameLogicState.forClient[playerId] as UIStateCode
                const newHands = calcPlayableHands(
                    player.hands,
                    state.gameLogicState.environment.field,
                    state.gameLogicState.isRevolving,
                    code,
                    state.gameLogicState.bannedChara
                )
                return {
                    ...player,
                    hands: newHands,
                    handsCount: newHands.length,
                }
            } else {
                return privaten(player, playerId)
            }
        })

        const cardPool = state.gameLogicState.environment.cardPool.cards === undefined ?
            {
                amount: 0
            } : {
                cards: [],
                amount: state.gameLogicState.environment.cardPool.amount
            }

        if (target && target.personality !== PlayerPersonalityEnum.Bale && state.gameLogicState.environment.cardQueue.cards) {
            // queueの消し込み
            return {
                ...state,
                gameLogicState: {
                    ...state.gameLogicState,
                    environment: {
                        ...state.gameLogicState.environment,
                        cardPool: cardPool,
                        cardQueue: {
                            cards: [],
                            amount: state.gameLogicState.environment.cardQueue.amount
                        },
                    },
                    deck: [],
                    players
                }
            }
        } else {
            return {
                ...state,
                gameLogicState: {
                    ...state.gameLogicState,
                    environment: {
                        ...state.gameLogicState.environment,
                        cardPool: cardPool,
                    },
                    deck: [],
                    players
                }
            }
        }
    }

    toUIState(state: GameState, from: string, to: string): UIState {
        const { gameLogicState, phase } = state
        if (gameLogicState.forClient) {
            const code = gameLogicState.forClient[to]
            if (code) {
                return {
                    phase: phase,
                    uiStateCode: code,
                }
            }
        }
        throw new Error('Unknown UIState')
    }

    genHandler<T extends keyof WsTypeMap>(typeName: T, body: WsTypeMap[T]): (gs: GameState) => Promise<HandlerResult> {
        switch (typeName) {
            case 'WsAndoAbility':
                return this.genAndoAbilityHandler(body as WsAndoAbility);
            case 'WsReceiveCard':
                return this.genReceiveCardHandler(body as WsReceiveCard);
            case 'WsPlayCard':
                return this.genPlayCardHandler(body as WsPlayCard);
            case 'WsChoosePlayer':
                return this.genChoosePlayerHandler(body as WsChoosePlayer);
            case 'WsPowerUp':
                return this.genPowerUpHandler(body as WsPowerUp);
            default:
                throw new Error('Unknown message type');
        }
    }

    genPowerUpHandler(body: WsPowerUp): (gs: GameState) => Promise<HandlerResult> {
        const { playerId, card } = body;
        return async (state: GameState) => {

            state.gameLogicState.players = updatePlayers(state.gameLogicState.players,
                (p) => p.playerId === playerId,
                (p) => {
                    const newCard = p.hands.map(h => {
                        if (h.id === card.id) {
                            return {
                                ...h,
                                value: Math.min(h.value + 1, 9)
                            }
                        }
                        return h
                    })

                    return {
                        ...p,
                        power: Math.max(p.power - 1, 0),
                        hands: newCard
                    }
                }
            )

            const events = {} as EventMap
            events[playerId] = 'WsPowerUp'
            return {
                gameState: state,
                events: events,
            }
        }
    }

    genAndoAbilityHandler(body: WsAndoAbility): (gs: GameState) => Promise<HandlerResult> {
        const { playerId, targetPlayerId, card } = body;
        return async (state: GameState) => {
            if (playerId === targetPlayerId) {
                state.gameLogicState.chatHistory.push({ message: `You can't specify yourself as destination`, sender: 'Server' })
                return {
                    gameState: state,
                    events: {},
                }
            }

            if (state.gameLogicState.andoAbilityCount >= 2) {
                state.gameLogicState.chatHistory.push({ message: `You can't use Ando ability more than 2 times`, sender: 'Server' })
                return {
                    gameState: state,
                    events: {},
                }
            }

            const player = state.gameLogicState.players.find(p => p.playerId === playerId) as Player
            const check1 = handCheck(player, 1, Destination.Skip) // TODO: destinationのAndoAbilityを追加
            if (check1.isInvalidWin) {
                state.gameLogicState.chatHistory.push({ message: `Invalid play card`, sender: 'Server' })
                return {
                    gameState: state,
                    events: {},
                }
            }
            if (check1.isReady) {
                state.gameLogicState.readyCount += 1
            }

            state.gameLogicState.andoAbilityCount += 1
            state.gameLogicState.players = updatePlayers(state.gameLogicState.players,
                (p) => p.playerId === targetPlayerId || p.playerId === playerId,
                (p) => {
                    if (p.playerId === playerId) {
                        let newCard = [] as Card[]
                        if (check1.isReady) {
                            p.state = PlayerStateEnum.Ready
                            p.cannotReceiveCard = true
                            const snapshot = state.gameLogicState.loopSnapShot[playerId]
                            if (snapshot !== undefined) {
                                newCard = snapshot
                                // snapshotは残り続ける仕様
                                // delete state.gameLogicState.loopSnapShot[playerId]
                            }
                            if (state.gameLogicState.readyCount === 4 && state.gameLogicState.isBoon) {
                                const added = state.gameLogicState.deck.splice(0, 1)
                                added.forEach(c => {
                                    newCard.push(c)
                                })
                            }
                        } else {
                            newCard = p.hands.filter(h => h.id !== card.id)
                            const dummyCard = emptyCard()
                            newCard.push(dummyCard)
                        }

                        if (p.playerId === targetPlayerId) {
                            newCard.push(card)
                        }
                        return {
                            ...p,
                            hands: newCard
                        }
                    }
                    if (p.playerId === targetPlayerId) {
                        p.hands.push(card)
                        return p
                    }
                    return p
                }
            )
            state.gameLogicState.chatHistory.push({ message: `Ando Ability`, sender: 'Server' })

            const events = {} as EventMap
            events[playerId] = 'WsAndoAbility'
            events[targetPlayerId] = 'WsAndoAbility'

            return {
                gameState: state,
                events: events,
            }
        }
    }

    genChoosePlayerHandler(body: WsChoosePlayer): (gs: GameState) => Promise<HandlerResult> {
        const { targetPlayerId, effect } = body;
        return async (state: GameState) => {

            if (effect === "undo") {
                state.gameLogicState.players = updatePlayers(state.gameLogicState.players,
                    (p) => p.playerId === targetPlayerId,
                    (p) => {
                        p.state = PlayerStateEnum.Normal
                        return p
                    }
                )
                state.gameLogicState.chatHistory.push({ message: `${extractPlayerName(targetPlayerId)} became NORMAL state`, sender: extractPlayerName(body.playerId) })
                return {
                    gameState: state,
                    events: {
                        [state.gameLogicState.turnPlayerId]: 'WsChoosePlayer'
                    },
                }
            } else if (effect === "peeq") {
                const player = state.gameLogicState.players.find(p => p.playerId === targetPlayerId) as Player
                const hands = player.hands
                const randomCard = hands[Math.floor(Math.random() * hands.length)];
                if (randomCard === undefined) {
                    throw new Error('randomCard is undefined')
                }
                state.gameLogicState.chatHistory.push({ message: `Peeked at ${extractPlayerName(targetPlayerId)}'s card: ${randomCard.chara}${randomCard.value}`, sender: extractPlayerName(body.playerId) });
                return {
                    gameState: state,
                    events: {
                        [state.gameLogicState.turnPlayerId]: 'WsChoosePlayer'
                    },
                };

            } else {
                throw new Error('Unknown effect')
            }
        }
    }

    genReceiveCardHandler(body: WsReceiveCard): (gs: GameState) => Promise<HandlerResult> {
        const { playerId, card, source, isSkip } = body;
        return async (state: GameState) => {
            if (isSkip) {

                console.log(JSON.stringify(state.gameLogicState.forClient))

                console.log("a", state.gameLogicState.skipCount)
                if (state.gameLogicState.forClient[playerId] === UIStateCode.InYourTurn) {
                    if (state.gameLogicState.isNoAction) {
                        state.gameLogicState.skipCount += 1
                    } else {
                        state.gameLogicState.skipCount = 1
                    }
                    state.gameLogicState.isNoAction = true
                    if (state.gameLogicState.skipCount === state.gameLogicState.players.length) {
                        state.gameLogicState.skipCount = 0
                        state.gameLogicState.chatHistory.push({ message: `Deadlock`, sender: 'Server' })
                        state.gameLogicState.players = updatePlayers(state.gameLogicState.players,
                            (p) => true,
                            (p) => {
                                const addCards = state.gameLogicState.deck.splice(0, 3) //TODO: 山札がなくなった場合の処理
                                addCards.forEach(c => {
                                    p.hands.push(c)
                                })
                                return p
                            }
                        )
                    }
                } else {
                    state.gameLogicState.isNoAction = false
                }

                state.gameLogicState = this.updateTurns(state.gameLogicState)
                return {
                    gameState: state,
                    events: {
                        [state.gameLogicState.turnPlayerId]: 'BySystem(IN_YOUR_TURN)',
                        [playerId]: 'WsReceiveCard',
                    },
                }
            }
            state.gameLogicState.isNoAction = false
            // - 手札の追加
            if (source === Destination.CardPool) {
                // - Envの更新
                const res = takeFromEnvironment(state.gameLogicState.environment, card, source)
                state.gameLogicState.environment = res.env

                state.gameLogicState.players = updatePlayers(state.gameLogicState.players,
                    (p) => p.playerId === playerId,
                    (p) => {
                        p.hands.push(res.card as Card)
                        return p
                    }
                )
                state.gameLogicState.chatHistory.push({ message: `${extractPlayerName(playerId)} received a card from pool`, sender: "Server" })
            } else if (source === Destination.CardQueue) {
                // - Envの更新
                const res = takeFromEnvironment(state.gameLogicState.environment, card, source)
                state.gameLogicState.environment = res.env

                state.gameLogicState.players = updatePlayers(state.gameLogicState.players,
                    (p) => p.playerId === playerId,
                    (p) => {
                        p.hands.push(res.card as Card)
                        return p
                    }
                )
                state.gameLogicState.chatHistory.push({ message: `${extractPlayerName(playerId)} received a card from queue`, sender: "Server" })
            }
            state.gameLogicState = this.updateTurns(state.gameLogicState)
            return {
                gameState: state,
                events: {
                    [state.gameLogicState.turnPlayerId]: 'BySystem(IN_YOUR_TURN)',
                    [playerId]: 'WsReceiveCard',
                },
            }
        }
    }

    genPlayCardHandler(body: WsPlayCard): (gs: GameState) => Promise<HandlerResult> {
        const { playerId, cards, destination } = body;
        return async (state: GameState) => {
            const player = state.gameLogicState.players.find(p => p.playerId === playerId) as Player
            // - リーチ状態/勝利判定
            const check1 = handCheck(player, cards.length, destination)
            if (check1.isInvalidWin) {
                state.gameLogicState.chatHistory.push({ message: `Invalid play card`, sender: 'Server' })
                return {
                    gameState: state,
                    events: {},
                }
            }
            if (check1.isWin) {

                state.gameLogicState.players = updatePlayers(state.gameLogicState.players,
                    (p) => p.playerId === playerId,
                    (p) => {
                        return {
                            ...p,
                            hands: []
                        }
                    }
                )
                // - Envの更新
                state.gameLogicState.environment = giveToEnvironment(state.gameLogicState.environment, cards, destination)

                state.phase = GamePhase.End
                state.gameLogicState.chatHistory.push({ message: `${extractPlayerName(playerId)} won!`, sender: 'Server' })

                const events = {} as EventMap
                state.gameLogicState.players.forEach(p => {
                    events[p.playerId] = "BySystem(YOU_LOST)"
                })
                events[playerId] = "WsPlayCard_win"
                return {
                    gameState: state,
                    events,
                }
            }
            if (check1.isReady) {
                state.gameLogicState.readyCount += 1
            }

            state.gameLogicState.players = updatePlayers(state.gameLogicState.players,
                (p) => p.playerId === playerId,
                (p) => {
                    let newCard = p.hands.filter(h => !cards.map(c => c.id).includes(h.id))
                    if (check1.isReady) {
                        p.state = "ready"
                        p.cannotReceiveCard = true

                        const snapshot = state.gameLogicState.loopSnapShot[playerId]
                        if (snapshot !== undefined) {
                            newCard = snapshot
                            // snapshotは残り続ける仕様
                            // delete state.gameLogicState.loopSnapShot[playerId]
                        }
                        if (p.personality === PlayerPersonalityEnum.Abe) {
                            const added = state.gameLogicState.deck.splice(0, 2) //TODO: 山札がなくなった場合の処理
                            added.forEach(c => {
                                newCard.push(c)
                            })
                        }

                        if (state.gameLogicState.readyCount === 4 && state.gameLogicState.isBoon) {
                            const added = state.gameLogicState.deck.splice(0, 1)
                            added.forEach(c => {
                                newCard.push(c)
                            })
                        }
                    }
                    return {
                        ...p,
                        hands: newCard
                    }
                }
            )
            // - Envの更新
            state.gameLogicState.environment = giveToEnvironment(state.gameLogicState.environment, cards, destination)
            const msg = match(destination, {
                "field": `${extractPlayerName(playerId)} played ${cards.map(c => c.chara + c.value.toString()).join('')}`,
                "cardPool": `${extractPlayerName(playerId)} put to pool`,
                "cardQueue": `${extractPlayerName(playerId)} put to queue`,
                "skip": `${extractPlayerName(playerId)} skipped`,
            }, "something wrong")
            state.gameLogicState.chatHistory.push({ message: msg, sender: "Server" })

            // - WordPlay効果判定
            let ev = {} as EventMap
            const check2 = wordPlayCheck(state.gameLogicState.environment.field.sequence)
            if (check2.isWordPlay) {
                const { gls, events } = this.wordPlayEffects(check2.word, state.gameLogicState)
                ev = events
                state.gameLogicState = gls
                state.gameLogicState.environment = cleanField(state.gameLogicState.environment)
            }
            if (!ev[playerId]) {
                if (destination === Destination.CardPool || destination === Destination.CardQueue) {
                    ev[playerId] = 'WsPlayCard_others'
                } else {
                    ev[playerId] = 'WsPlayCard_normal'
                }
            }
            return {
                gameState: state,
                events: ev,
            }
        }
    }

    wordPlayEffects(sequence: string, gls: GameLogicState): { gls: GameLogicState, events: EventMap } {

        const events = {} as EventMap

        // - personality
        if (personalities.includes(sequence as any)) {
            const added = gls.deck.splice(0, 2) //TODO: 山札がなくなった場合の処理
            let name = ""
            const newplayers = updatePlayers(gls.players,
                (p) => p.personality === sequence as any,
                (p) => {
                    name = p.name
                    return {
                        ...p,
                        hands: [...p.hands, ...added]
                    }
                }
            )
            gls.players = newplayers
            gls.chatHistory.push({ message: `'${sequence}' effect \n ${name} turned out ${sequence}`, sender: extractPlayerName(gls.turnPlayerId) })
        }

        // - commands
        // - undo
        // - プレイヤーを一人選ぶ
        // - そのプレイヤーのリーチ状態であれば、リーチ状態を解除する。
        // - そのプレイヤーがリーチ状態でなければ、自分のリーチ状態は解除される。
        switch (sequence) {
            case "ape":
                const randomApe = ["a", "p", "a"].sort(() => Math.random() - 0.5);
                const aped = updatePlayers(gls.players,
                    (p) => p.playerId !== gls.turnPlayerId,
                    (p) => {
                        const chara = randomApe.pop() as string
                        const newCard = createCard(chara)
                        p.hands.push(newCard)
                        return p
                    }
                )
                gls.players = aped
                gls.chatHistory.push({ message: `'ape' effect`, sender: extractPlayerName(gls.turnPlayerId) })
                break;
            case "ban":
                // ある文字を禁止する
                const c = getRandomChar()
                const banned: BannedChara = {
                    chara: c,
                    playerId: gls.turnPlayerId
                }
                gls.bannedChara.push(banned)
                gls.chatHistory.push({ message: `'ban' effect: ${c} is banned`, sender: extractPlayerName(gls.turnPlayerId) })
                // skipの時の処理
                // const nid = nextPlayerId(gls.orderedPlayerIds, gls.turnPlayerId);
                // const banned = updatePlayers(gls.players,
                //     (p) => p.playerId === nid,
                //     (p) => {
                //         p.toSkip = true
                //         return p
                //     }
                // )
                // gls.players = banned
                // gls.chatHistory.push({ message: `'ban' effect`, sender: 'Server' })
                break;
            case "eel":
                gls.players = updatePlayers(gls.players,
                    (p) => p.playerId === gls.turnPlayerId,
                    (p) => {
                        return {
                            ...p,
                            power: p.power + 1
                        }
                    }
                )
                gls.chatHistory.push({ message: `'eel' effect`, sender: extractPlayerName(gls.turnPlayerId) })
                break;
            case "pole":
                gls.isRevolving = !gls.isRevolving
                gls.chatHistory.push({ message: `'pole' effect`, sender: extractPlayerName(gls.turnPlayerId) })
                break;
            case "undo":
                events[gls.turnPlayerId] = "WsPlayCard_undo"
                gls.chatHistory.push({ message: `'undo' effect`, sender: extractPlayerName(gls.turnPlayerId) })
                break;
            case "peeq":
                events[gls.turnPlayerId] = "WsPlayCard_peeq"
                gls.chatHistory.push({ message: `'peeq' effect`, sender: extractPlayerName(gls.turnPlayerId) })
                break;
            case "boon":
                gls.isBoon = true
                gls.chatHistory.push({ message: `'boon' effect`, sender: extractPlayerName(gls.turnPlayerId) })
                break;
            case "done":
                gls.environment.cardPool.cards = undefined
                gls.environment.cardQueue.cards = undefined
                gls.chatHistory.push({ message: `'done' effect`, sender: extractPlayerName(gls.turnPlayerId) })
                break;
            case "pool":
                gls.environment.cardPool.cards = []
                gls.chatHistory.push({ message: `'pool' effect`, sender: extractPlayerName(gls.turnPlayerId) })
                break;
            case "loop":
                const a = gls.loopSnapShot[gls.turnPlayerId]
                if (a === undefined) {
                    const snapshot = gls.players.find(p => p.playerId === gls.turnPlayerId) as Player
                    gls.loopSnapShot[gls.turnPlayerId] = snapshot.hands
                    gls.chatHistory.push({ message: `'loop' effect.`, sender: extractPlayerName(gls.turnPlayerId) })
                } else {
                    gls.chatHistory.push({ message: `'loop' effect. But snapshot already exists.`, sender: extractPlayerName(gls.turnPlayerId) })
                }
                break;
            case "queue":
                gls.environment.cardQueue.cards = []
                gls.environment.cardQueue.amount = 0
                gls.chatHistory.push({ message: `'queue' effect`, sender: extractPlayerName(gls.turnPlayerId) })
                break;
        }
        return { gls, events }
    }

    updateTurns(gls: GameLogicState): GameLogicState {
        gls.turnNumber += 1

        const nid = nextPlayerId(gls.orderedPlayerIds, gls.turnPlayerId)
        const nextPlayer = gls.players.find(p => p.playerId === nid) as Player
        if (nextPlayer.state === PlayerStateEnum.Ready) {
            gls.players = updatePlayers(gls.players,
                (p) => p.playerId === nid,
                (p) => {
                    return {
                        ...p,
                        cannotReceiveCard: false,
                    }
                }
            )
        }
        gls.turnPlayerId = nid



        // - bannedCharaの回復
        if (gls.bannedChara.length > 0) {
            const x = gls.bannedChara[0] as BannedChara;
            if (nextPlayer.playerId === x.playerId)
                gls.bannedChara.shift()
        }
        // - skipの時の処理
        // if (nextPlayer.toSkip) {
        //     gls.turnNumber -= 1
        //     const newPlayers = updatePlayers(gls.players,
        //         (p) => p.playerId === nid,
        //         (p) => {
        //             p.toSkip = false
        //             return p
        //         }
        //     )
        //     return this.updateTurns({
        //         ...gls,
        //         players: newPlayers
        //     })
        // }
        return gls
    }
}

type WsTypeMap = {
    WsFetch: WsFetch;
    WsPlayCard: WsPlayCard;
    WsReceiveCard: WsReceiveCard;
    WsChoosePlayer: WsChoosePlayer;
    WsAndoAbility: WsAndoAbility;
    WsPowerUp: WsPowerUp;
    WsChooseHandFromClient: WsChooseHandFromClient;
    WsContinueToPlayFromClient: WsContinueToPlayFromClient;
};

function dynamicCast<T extends keyof WsTypeMap>(typeName: T, value: unknown): WsTypeMap[T] {
    if (typeof value === typeof ({} as WsTypeMap[T])) {
        return value as WsTypeMap[T];
    }
    throw new Error(`Value is not of type ${typeName}`);
}


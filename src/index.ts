import { Hono } from 'hono'
import { jwt, sign, decode, verify } from 'hono/jwt'
import { Room } from './room'
import { createMiddleware } from 'hono/factory'
import { CreateRoomRequest, CreateRoomResponse, JoinRoomRequest, JoinRoomResponse, RegisterRequest, RegisterResponse } from './types'
import { v4 as uuidv4 } from 'uuid';

export { Room }

export type TokenPayload = {
  playerId: string
  roomId: string
}

type Env = {
  Bindings: {
    ROOM: DurableObjectNamespace<Room>
    BODOGE: KVNamespace
    JWT_SECRET: string
  }
  Variables: {
    // count: number
    roomStub: DurableObjectStub<Room>
    playerId: string
    jwtPayload: TokenPayload
  }
}

const app = new Hono<Env>()

const customCorsMiddleware = createMiddleware<Env>(async (c, next) => {
  // オリジンチェック
  const allowedOrigins = ['http://localhost:5173', 'https://bodoge-fe.pages.dev'];
  const origin = c.req.header('Origin');

  if (origin && allowedOrigins.includes(origin)) {
    // CORSヘッダーの設定
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
  }
  if (c.req.method === 'OPTIONS') {
    console.log('OPTIONS');
    c.status(204);
    return c.text("");
  }
  await next();
});

app.use('/*', customCorsMiddleware);

const myJwtMiddleware = createMiddleware<Env>(async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
  })
  return jwtMiddleware(c, next)
})

const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const payload = c.get('jwtPayload')
  const key = payload.playerId
  const value = await c.env.BODOGE.get(key)
  if (!value) {
    return c.text('Unauthorized', 401)
  }
  c.set('playerId', key)
  await next()
})

app
  .get('/', (c) => {
    return c.text('Hello Hono!')
  })
  .post('/register', async (c) => {
    const body = (await c.req.json()) as RegisterRequest
    const id = uuidv4();
    const splitted = id.split('-');
    const key = body.name + '-' + splitted[0];
    const value = splitted[1] as string;
    const playerId = body.name + "-" + splitted[0] + "-" + splitted[1]
    const token = await sign({ playerId: key, roomId: "not initialized" }, c.env.JWT_SECRET)
    const res: RegisterResponse = {
      id: playerId,
      token,
    }
    await c.env.BODOGE.put(key, value)
    return c.json(res, 200)
  })
  .post('/create', myJwtMiddleware, authMiddleware, async (c) => {

    const body = (await c.req.json()) as CreateRoomRequest
    const id = uuidv4();
    const splitted = id.split('-');
    const roomId = body.name + "-" + splitted[0] + "-" + splitted[1]
    const playerId = c.get('playerId')

    const roomKey = await sign({ playerId: playerId, roomId: roomId }, c.env.JWT_SECRET)
    const stubId = c.env.ROOM.idFromName(roomId)
    const stub = c.env.ROOM.get(stubId)
    await stub.initialize(body.name, body.numberOfPlayers, playerId)

    const res: CreateRoomResponse = {
      id: roomId,
      roomKey,
    }
    return c.json(res, 200)
  })
  .post('/join', myJwtMiddleware, authMiddleware, async (c) => {
    const body = (await c.req.json()) as JoinRoomRequest
    const stubId = c.env.ROOM.idFromName(body.roomId)
    const stub = c.env.ROOM.get(stubId)

    const playerId = c.get('playerId')
    const roomKey = await sign({ playerId: playerId, roomId: body.roomId }, c.env.JWT_SECRET)
    const res: JoinRoomResponse = {
      chatHistory: [],
      roomKey: roomKey,
    }

    if (body.isViewer) {
      return c.json(res, 200)
    }

    await stub.join(playerId)
    return c.json(res, 200)
  })
  .get('/ws', async (c) => {
    const upgradeHeader = c.req.header('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }
    const q = c.req.raw.url.split('?')[1];
    if (!q) {
      return new Response('Missing query string', { status: 400 });
    }
    const token = q.split('=')[1]
    if (!token) {
      return new Response(`c.req.raw.url: ${c.req.raw.url}`, { status: 401 });
    }
    const isValid = verify(token, c.env.JWT_SECRET)
    if (!isValid) {
      return new Response('Unauthorized', { status: 403 });
    }
    const payload = decode(token)
    const roomId = payload.payload.roomId as string
    const id = c.env.ROOM.idFromName(roomId)
    const stub = c.env.ROOM.get(id)
    c.set('roomStub', stub)
    const roomStub = c.get('roomStub') as DurableObjectStub<Room>
    return roomStub.fetch(c.req.raw)
  })

export default app

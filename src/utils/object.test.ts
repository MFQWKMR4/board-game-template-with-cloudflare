


import { expect, test } from 'vitest'
import { deleteKey } from './object'

test('deleteKey sample executions', () => {
    const a = {
        a: 1,
        b: 2,
        c: 3,
    }
    console.log(deleteKey(a, 'a'))
})

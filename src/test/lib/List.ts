import * as assert from 'assert'
import List from '../../lib/List'

describe('List', () => {
  it('#add()', () => {
    const a = new List('a', 'b')

    assert(!a.add('a'))
    assert(!a.add('b', 'c'))
    assert(a.add('d'))
  })

  it('#remove()', () => {
    const a = new List('a', 'b')

    assert(a.remove('a'))
    // Can only be removed once.
    assert(!a.remove('a'))
    // Returns false if the item could not be removed.
    assert(!a.remove('c'))
  })

  it('#diff()', () => {
    const a = new List('a', 'b')

    assert.deepEqual(a.diff(['b', 'c']), ['a', 'c'])
    assert.deepEqual(a.diff(['c']), ['a', 'b', 'c'])
    assert.deepEqual(a.diff(['a', 'b']), [])
  })

  it('#covered()', () => {
    const a = new List('a', 'b')

    assert.deepEqual(a.covered(['a', 'b', 'c']), ['a', 'b'])
    assert.deepEqual(a.covered(['c']), [])
    assert.deepEqual(a.covered(['b', 'c']), ['b'])
  })

  it('#uncovered()', () => {
    const a = new List('a', 'b')

    assert.deepEqual(a.uncovered(['a', 'b', 'c']), [])
    assert.deepEqual(a.uncovered(['a', 'b']), [])
    assert.deepEqual(a.uncovered(['a']), ['b'])
    assert.deepEqual(a.uncovered(['c']), ['a', 'b'])
  })
})

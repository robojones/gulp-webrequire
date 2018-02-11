// import A from './another-file'
import * as $ from './test-dir'

export function test (condition: any, msg: string): void {
  if (!condition) {
    throw new Error(msg || `Assertion failed. ${condition} is not true`)
  }
}

test($, 'jquery was not imported.')
// test((new A().value), 'another-file.js was not imported.')

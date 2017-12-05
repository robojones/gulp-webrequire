import * as assert from 'assert'
import * as command from 'command-test'

(global as any).assert = assert

describe('gulp-webrequire', () => {
  before(() => {
    (global as any).window = {}
  })

  it('should work', function (cb) {
    this.timeout(30000)

    // initialize
    require('../browser/head')

    // import the files
    require('../test-resources/main')
    require('../test-resources/another-file')
    require('../test-resources/module/jquery')

    global.window.registerModule([['./main.js', '/main.js']], 'hi', (module, exports, require) => {
      console.log('THE END!')
      cb()
    })

    console.log('done')
  })
})

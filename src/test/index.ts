import * as assert from 'assert'

const g = (global as any)

describe('gulp-webrequire', () => {
  before(() => {
    g.window = {}
  })

  it('should work', function (cb) {
    this.timeout(30000)

    // initialize
    require('../browser/head')

    // import the files
    require('../test-resources/main')
    require('../test-resources/another-file')
    require('../test-resources/module/jquery')

    g.window.registerModule([['./main.js', '/main.js']], 'hi', (module, exports, require) => {
      cb()
    })
  })
})

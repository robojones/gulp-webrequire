# gulp-webrequire

Use require in the browser with thie gulp module.

[![CircleCI](https://circleci.com/gh/robojones/gulp-webrequire.svg?style=shield)](https://circleci.com/gh/robojones/gulp-webrequire)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## How it works

The difference between this module and other solution like webpack is, that this module does not create a single .js file containing all of your code.
Instead it leaves your code as single files and imports modules like [jQuery](https://npmjs.com/package/jquery) into a `modules/` folder.
When using this module one still needs to add a `<script>`-tag for every single file to your HTML.

__So why should I use this?__

The advantage of __not packing__ all your code into one big `.js` file is, that you can decide when a resource is loaded.
So instead of downloading a whole bunch of JavaScript at once, where you only need a fraction of it, you can load only what's needed.
This lets you take advantage of the browser cache and improves your website performance.

__How is this better than adding script-tags the old-fashioned way?__

With `gulp-webrequire` you can add the `async` attribute to the `<script>`-tags.
This will allow your script files to be loaded parallely.
You don't need to worry about the order in which your scripts are executed - If one of your scripts requires another one,
`gulp-webrequire` will make sure that the required file is executed first.
To reduce the overhead of code that needs to be added to all of your files, this modules works with a __small inline code-snippet__.

## Inline snippet

```html
<script>
window.registerModule=(()=>{const n={},t={};return function(o,c,r){function e(n){u=u.filter(t=>t!==n)}function f(){u.length||function(){const o={exports:{}};r(o,o.exports,i),function(o){n[c]=o.exports,t[c]&&t[c].forEach(n=>n())}(o)}()}function i(t){const c=o.find(n=>n[0]===t)[1];return n[c]}let u=o.map(n=>n[1]);o.forEach(([o,c])=>{n[c]?e(c):function(n,o){t[n]||(t[n]=[]),t[n].push(o)}(c,()=>{e(c),f()})}),f()}})();
</script>
```

This needs to be placed in the `<head>` section of your website above all other script-tags.

The head of your Website could look like this:

```html
<head>
  <title>Very nice website</title>
  <script>
  window.registerModule=(()=>{const n={},t={};return function(o,c,r){function e(n){u=u.filter(t=>t!==n)}function f(){u.length||function(){const o={exports:{}};r(o,o.exports,i),function(o){n[c]=o.exports,t[c]&&t[c].forEach(n=>n())}(o)}()}function i(t){const c=o.find(n=>n[0]===t)[1];return n[c]}let u=o.map(n=>n[1]);o.forEach(([o,c])=>{n[c]?e(c):function(n,o){t[n]||(t[n]=[]),t[n].push(o)}(c,()=>{e(c),f()})}),f()}})();
  </script>
  <script async src="/script.js"></script>
  <script async src="/module/jquery.js"></script>
  <script async src="/menu.js"></script>
</head>
```

## Setup with gulp

In your `gulpfile.json`:

```javascript
const webrequire = require('gulp-webrequire').default

gulp.task('typescript-test-resources', function () {
  return gulp.src('src/test-resources/**/*.ts')
    .pipe(webRequire())
    .pipe(gulp.dest('build/test-resources'))
})
```

## How to find out what scripts-tags need to be added (coming soon).

There will be a command-line tool, to help with this.

# gulp-webrequire

Use require in the browser with this gulp plugin.

[![CircleCI](https://circleci.com/gh/robojones/gulp-webrequire.svg?style=shield)](https://circleci.com/gh/robojones/gulp-webrequire)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## How it works

The difference between this plugin and other solution like webpack is, that it does not create a single .js file containing all of your code.
Instead it leaves your code as single files and imports modules like [jQuery](https://npmjs.com/package/jquery) into a `modules/` folder.
When using this plugin one still needs to add a `<script>`-tag for every single file to your HTML.

__So why should I use this?__

The advantage of __not packing__ all your code into one big `.js` file is, that you can decide when a resource is loaded.
So instead of downloading a whole bunch of JavaScript at once, where you only need a fraction of it, you can load only what's needed.
This lets you take advantage of the browser cache and improves your website performance.

__How is this better than adding script-tags the old-fashioned way?__

With `gulp-webrequire` you can add the `async` attribute to the `<script>`-tags.
This will allow your script files to be loaded parallely.
You don't need to worry about the order in which your scripts are executed - If one of your scripts requires another one,
`gulp-webrequire` will make sure that the required file is executed first.
To reduce the overhead of code that needs to be added to all of your files, there a __small inline code-snippet__.

## Inline snippet

```html
<script>
window.registerModule=function(){var n={},r={};return function(t,u,o){function f(n){c=c.filter(function(r){return r!==n})}function i(){if(!c.length){var t={exports:{}};o(t,t.exports,e),n[u]=t.exports,r[u]&&r[u].forEach(function(n){return n()})}}function e(r){var u=t.filter(function(n){return n[0]===r})[1][1];return n[u]}var c=t.map(function(n){return n[1]});t.forEach(function(t){t[0];var u=t[1];n[u]?f(u):function(n,t){r[n]||(r[n]=[]),r[n].push(t)}(u,function(){f(u),i()})}),i()}}();
</script>
```

This needs to be placed in the `<head>` section of your website above all other script-tags.

The head of your Website could look like this:

```html
<head>
  <title>Very nice website</title>
  <script>
window.registerModule=function(){var n={},r={};return function(t,u,o){function f(n){c=c.filter(function(r){return r!==n})}function i(){if(!c.length){var t={exports:{}};o(t,t.exports,e),n[u]=t.exports,r[u]&&r[u].forEach(function(n){return n()})}}function e(r){var u=t.filter(function(n){return n[0]===r})[1][1];return n[u]}var c=t.map(function(n){return n[1]});t.forEach(function(t){t[0];var u=t[1];n[u]?f(u):function(n,t){r[n]||(r[n]=[]),r[n].push(t)}(u,function(){f(u),i()})}),i()}}();
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
  return gulp.src('src/**/*.js')
    .pipe(webRequire())
    .pipe(gulp.dest('build/'))
})
```

## How to find out what scripts-tags need to be added.

Gulp-webrequire comes with a small CLI that helps you with that.
To use the CLI, you will need to install this module globally:

```
sudo npm install -g gulp-webrequire
```

You can then use the `webrequire` command.

```
webrequire script.js somefolder/menu.js
```

This will output all script-tags that you need to add to your website into the terminal.

__Tip:__ If you are using e.g. a custom domain for your static resources, you can add that with the `--prefix` option.

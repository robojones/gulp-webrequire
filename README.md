# gulp-webrequire

Use require in the browser with this gulp plugin.

[![CircleCI](https://circleci.com/gh/robojones/gulp-webrequire.svg?style=shield)](https://circleci.com/gh/robojones/gulp-webrequire)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```
npm install --save gulp-webrequire
```

## How it works

The difference between this plugin and other solution like webpack is, that it does not create a single .js file containing all of your code.
Instead it detects the references between your modules and builds packages out of them using a __smart packing__ algorithm.

__Smart packing?__

It is really nice, trust me! I am planning to write a small wiki page about it.

The most important facts are:
- Every module that is not required by any other module is considered an entry point. You can generate script tags by for entry points with the (#how-to-find-out-what-scripts-tags-need-to-be-added).
- No module will be included multiple packs. --> All files can be cached by the browser and no module will be loaded twice.

__So why should I use this?__

The advantage of __not packing__ all your code into one big `.js` file is, that you can decide when a resource is loaded.
So instead of downloading a whole bunch of JavaScript at once, where you only need a fraction of it, you can load only what's needed.
This lets you take advantage of the browser cache and improves your website performance.

__How is this better than adding script-tags the old-fashioned way?__

`gulp-webrequire` generates script tags with the `async` attribute.
This will allow your script files to be loaded parallely.
You don't need to worry about the order in which your scripts are executed - If one of your scripts requires another one,
`gulp-webrequire` will make sure that the required file is executed first.

## Setup with gulp

Example with `gulp-webrequire` and `gulp-minify`

In your `gulpfile.json`:

```javascript
const gulp = require('gulp')
const minify = require('gulp-minify')
const { webrequire } = require('gulp-webrequire')

gulp.task('javascript', function () {
  return gulp.src('src/**/*.js')
    .pipe(webrequire())
    .pipe(minify())
    .pipe(gulp.dest('public/'))
})

gulp.task('default', ['javascript'])
```

## How to find out what scripts tags need to be added

Gulp-webrequire comes with an extremely nice api that you can use in your code (e.g. directly in your view engine).
```javascript
const { generateTags } = require('gulp-webrequire')

generateTags('public/js', ['login.js', 'menu.js'])
```

The generateTags method will find all js files that are being imported in the `login.js` and `menu.js` file.
It will then return HTML script tags for these files as one big string.
Your can use the returned string to render it into your website's HTML.

## generateTags method

```
generateTags (base, entryPoint, options)
```

- base `<string>` - The directory that contains your public javascript files.
- entryPoints `<string|string[]>` - Entry points to your code relative to the base directory. (The file extension should be set.)
- options
  - tagGenerator `<function>` - A function that receives a path and generates a script-tag for it. The path is relative to the base directory and does not begin with a `/`.
  - cacheTags `<boolean>` - By default the tagGenerator will never be called twice with the same path. The returned string will be cached. You can disable this behaviour by setting this option to `false`. (default: `true`)

## Examples

### Express & EJS

Your nodejs app:

```javascript
const app = require(express)()
const webrequire = require('gulp-webrequire').generateTags

app.get('/login', function(req, res){ 
  const tags = webrequire('login.js')
  res.render('index', {
    scriptTags: tags
  })
})

app.listen(80)
```

In your EJS view:

```html
<html>
  <head>
    <title>Login</title>
    <%- scriptTags %>
  </head>
  <body>
    ...your html...
  </body>
</html>
```

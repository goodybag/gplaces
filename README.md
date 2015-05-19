# Gplaces

> Dependency-free, google maps auto completion input

![http://storage.j0.hn/gplaces.gif](http://storage.j0.hn/gplaces.gif)

__install__

```
npm install -S gplaces
or
bower install gplaces
```

__usage__

After importing the script, setting up your proxy, and setting `gplaces.http`, you can simply add the attribute `data-gplaces` to an HTML element that accepts input and can respond to `keyup` events:

```html
<input type="text" data-gplaces>
<!-- Or a textarea works just as well -->
<textarea data-gplaces></textarea>
```

## Detailed Usage guide

There are two main hurdles to getting this to work:

1. Setting up your own proxy to Google's API (see [why do I need a proxy?](#why-do-i-need-a-proxy))
2. Overriding gplaces http implementation to make a request to your api


__Get Google API Access__

Setup a project in the Google Developers Console: https://code.google.com/apis/console

After creating your project, find the Google Places API Web Service and enable it. Under the credentials section on the left, get an API key.

__Setup your proxy__

Since Google's Autocomplete API isn't very CORS-friendly, you'll need to setup a proxy on your own proxy. This is easy to do with node and express:

```
npm install -S gplaces
```

In your express app, 

```javascript
var express = require('express');
var app = express();

app.use( require('body-parser')() );

// Mount your api endpoint wherever you like
app.get( '/api/places-autocomplete'
, require('gplaces').proxy({
    key: 'my-api-key'
  })
);

app.listen( 3000, function( error ){
  /* ... */
});
```

If you need help setting up a proxy for other platforms, create an issue and we'll help you out.

__Implement `gplaces.http`:__

A _feature_ of the gplaces library is the fact that the library will piggy-back off of your app's existing http interface to cut down on library size and errors.

Before making any requests, setup gplaces http method. Here's an example using [superagent](https://github.com/visionmedia/superagent) and [browserify](https://github.com/substack/browserify):

```
npm install -S superagent
```

```javascript
var request = require('superagent');
var gplaces = require('gplaces');

gplaces.http( function( input, callback ){
  request
    .get('/api/places')
    .query({ input: input })
    .end( callback );
});
```

Here's an example using jquery:

```javascript
gplaces.http( function( input, callback ){
  $.getJSON( '/api/places?input=' + input )
    .error( callback )
    .success( callback.bind( null, null ) );
});
```

## API

You can either use the HTML attribute api or the JavaScript API.

### HTML Attribute API

Adding the `data-gplaces` attribute any html element that has a value and can respond to keyup events will automatically register the gplaces plugin.

```html
<textarea data-gplaces></textarea>
```

#### `data-target="[selector]"`

Optional CSS selector that the autocomplete results will be rendered to:

```html
<input type="text" data-gplaces data-target="#wrapper > .my-target">
...
<div id="wrapper">
  <div class="my-target"></div>
</div>
```

#### `data-variant="[dark flip bouncy]"`

A space-separated list of variants that will control look-and-feel of the autocomplete popover.

### JavaScript API

The JS api has more functionality than available from the markup.

The module exports a single function (the Gplaces Object Factory) with the following properties:

* [`http( Function onRequest( input, callback ) )`](http) Connect the gplaces api to your proxy
* [`proxy( [Object options] )`](proxy) returns an express request handler

__Gplaces Object Factory__

The Gplaces Object Factory returns a Gplaces Object:

```javascript
var gplaces = require('gplaces');

document.addEventListener('DOMContentLoaded', function(){
  // The gplaces module exports a single function( Element el, Object options )
  // Calling it on an element will register the gplaces plugin
  // to that particular element
  var autocompleter = gplaces(
    document.getElementById('my-gplaces-input')
  );
});
```

#### Gplaces Object Properties:

##### `el`

The element the plugin is registered to (The first arg to the factory)

##### `options`

The options passed to the Object Factory

##### `model`

The underlying input model which has the following interface:

* val([String value]) - gets or sets current value
* makeRequest([Function callback(error, result)]) - makes request to api

##### `selectionPosition`

A model describing the current position of keyboard selection. Has the following members:

* `int length: 0` length of list
* `int pos: -1` position in list
* `up()` decrements pos
* `down()` increments pos
* `set(pos)` sets pos

##### `popoverEl`

The element referring to the popover that contains our autocomplete results

#### Gplaces Object Methods:

##### `render([APIRequest result])`

Renders the current state of the plugin given an optional result from the autocomplete api.

##### `renderPosition()`

Renders the current state of `.selectionPosition`

##### `safelySetElementValue()`

Sets the value of the input element based on the current state `.model`

##### `isShowing()`

Whether or not the popover is showing

##### `hide()`

Hides the popover results

##### `show()`

Shows the popover

##### `cursorToEnd()`

Moves the input elements' cursor position to the end

#### proxy

`gplaces.proxy(...)` is a function that will return an express request handler. You need this to setup your proxy. Be sure to pass in your api key:

```javascript
app.get('/api/places'
, require('gplaces').proxy({
    key: 'my-api-key'
  })
);
```

#### HTTP

Gplaces relies on dependency injection to perform HTTP requests. The reason being that we did not want ot solve cross-browser HTTP requests and most apps will likely already have their own solution.

If you have not implement an http callback, then gplaces will throw an error if you attempt to get autocomplete results.

```javascript
require('gplaces').http( function( input, callback ){
  $.ajax({

  })
  .success( callback.bind( null, null ) )
  .error( callback )
});
```

## FAQs

### Why do I need a proxy?

If you perform an HTTP request to another domain [see CORS](http://www.html5rocks.com/en/tutorials/cors/), most browsers will ask the server to implement the `Acccess-Control-Allow-Origin` response header. If the server does not implement the header, then browser will not allow the request.

Google does not implement this header. You will need to setup a proxy that does not violate Cross Origin Resource Policies.

### Why doesn't this library make the HTTP request for me?

Performing HTTP requests correctly from all browsers is quite frankly out-of-scope of this project. Virtually every project I work includes _at least 1_ one wrapper for XMLHTTPRequest and 
XDomain.

Simply hooking into that made for a smaller library making fewer assumptions and inevitably working in more places.

### Why does this library require polyfills to work in IE?

You're likely using them already. Why double implement wrappers for poor browsers?
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var gplaces = require('./');

if ( typeof window.define === 'function' && window.define.amd ){
  window.define( 'gplaces', function(){ return gplaces; } );
} else {
  window.gplaces = gplaces;
}
},{"./":2}],2:[function(require,module,exports){
module.exports        = require('./lib/base-view');
module.exports.proxy  = require('./lib/server');
module.exports.http   = require('./lib/http');

require('./lib/register-browser-content')( module.exports );
},{"./lib/base-view":4,"./lib/http":7,"./lib/register-browser-content":11,"./lib/server":9}],3:[function(require,module,exports){
var predictionTmpl = require('./prediction-tmpl');

module.exports = function( data ){
  return [
    '<div class="gplaces-popover-body">'
  , data.predictions.map( function( prediction ){
      return predictionTmpl( prediction );
    }).join('\n')
  , '  <div class="google-logo"></div>'
  , '</div>'
  ].join('\n');
};
},{"./prediction-tmpl":10}],4:[function(require,module,exports){
var utils             = require('./utils');
var errors            = require('./errors');
var gplaceInput       = require('./input-model');
var selectionPosition = require('./selection-position-model');

module.exports = function( el, options ){
  return Object.create({
    el: el
    
  , options: utils.defaults( options || {}, {
      tmpl:       require('./base-tmpl')
    , errorTmpl:  require('./error-tmpl')
    })
    
  , init: function(){
      this.model = gplaceInput( function( error, result ){
        if ( error ){
          return this.renderError( errors('UNKNOWN') );
        }

        if ( result && result.status !== 'OK' ){
          if ( result.status === 'ZERO_RESULTS' ){
            result.predictions = [];
          } else {
            return this.renderError( errors( result.status ) );
          }
        }

        if ( result && result.predictions ){
          this.selectionPosition = selectionPosition( result.predictions.length, function(){
            this.renderPosition();
          }.bind( this ));
        }

        this.render( result );
      }.bind( this ));

      this.selectionPosition = selectionPosition();
    
      this.popoverEl = document.createElement('div');
      this.popoverEl.classList.add( 'gplaces-popover', 'hide' );

      if ( this.el.getAttribute('data-variant') ){
        this.popoverEl.classList.add.apply(
          this.popoverEl.classList
        , this.el.getAttribute('data-variant').split(' ')
        );
      }

      // If there's a target specified, put the popover in there
      // otherwise, insert it after the input
      if ( this.options.target ){
        this.options.target.appendChild( this.popoverEl );
      } else {
        this.el.parentNode.insertBefore( this.popoverEl, this.el.nextSibling );
      }
    
      this.el.addEventListener( 'keyup', this.onInputKeyup.bind( this ) );

      // Delegate clicks to predictions
      this.popoverEl.addEventListener( 'click', this.onPredictionClickDelegation.bind( this ) );

      document.addEventListener( 'click', this.onBodyClick.bind( this ) );
    
      return this;
    }

  , renderError: function( error ){
      if ( console ) console.log( error );
      this.popoverEl.innerHTML = this.options.errorTmpl( error );
      return this;
    }
    
  , render: function( result ){
      if ( result ){
        this.popoverEl.innerHTML = this.options.tmpl( result );
      }

      this.renderPosition();

      return this;
    }

  , renderPosition: function(){
      if ( this.selectionPosition.pos === -1 ){
        return this;
      }

      var activeEl = this.popoverEl.querySelector('.active');

      if ( activeEl ){
        activeEl.classList.remove('active');
      }

      activeEl = this.popoverEl
        .querySelectorAll('.gplaces-prediction')
        [ this.selectionPosition.pos ];

      activeEl.classList.add('active');

      this.model.value = activeEl.getAttribute('data-value');

      this.safelySetElementValue();

      return this;
    }

  , safelySetElementValue: function(){
      if ( this.el.value != this.model.val() ){
        this.el.value = this.model.val();
      }

      return this;
    }

  , isShowing: function(){
      return !this.popoverEl.classList.contains('hide');
    }

  , hide: function(){
      this.popoverEl.classList.add('hide');
      return this;
    }

  , show: function(){
      this.popoverEl.classList.remove('hide');
      console.log('showing ', this.el.getAttribute('data-variant') );
      return this;
    }

  , cursorToEnd: function(){
      this.el.selectionStart = this.el.selectionEnd = this.el.value.length;
      return this;
    }

  , onInputKeyup: function( e ){
      this.model.val( e.target.value );

      if ( e.keyCode === 13 ){
        return this.hide();
      }

      if ( this.isShowing() ){
        var direction = utils.parseDirectionalKeyEvent( e );

        if ( direction ){
          this.selectionPosition[ direction ]();

          if ( direction === 'up' ){
            setTimeout( this.cursorToEnd.bind( this ), 1 );
          }
        }
      }

      if ( this.model.val().length ){
        if ( !this.isShowing() ){
          setTimeout( this.show.bind( this ), 100 );
        }
      } else if ( this.isShowing() ) {
        this.hide();
      }
    }

  , onPredictionClick: function( e ){
      this.model.val( e.target.getAttribute('data-value') );
      this.safelySetElementValue();
    }

  , onPredictionClickDelegation: function( e ){
      var foundEl = false;
      var MAX_ITERATIONS = 0;

      // Always stop at the body element, or > 5 iterations
      while ( !e.target.classList.contains('gplaces-popover-body') ){
        if ( ++MAX_ITERATIONS > 5 ) break;

        e.target = e.target.parentElement;

        if ( e.target.classList.contains('gplaces-prediction') ){
          foundEl = true;
          break;
        }
      }

      if ( !foundEl ) return true;

      this.onPredictionClick( e );
    }

  , onBodyClick: function( e ){
      var shouldClose = utils.isOutsideOf( this.popoverEl, this.el );

      if ( shouldClose( e.target ) ){
        this.hide();
      }
    }
  }).init();
};
},{"./base-tmpl":3,"./error-tmpl":5,"./errors":6,"./input-model":8,"./selection-position-model":12,"./utils":13}],5:[function(require,module,exports){
module.exports = function( data ){
  var message = data.message || 'There was an error with the request';

  return [
    '<div class="error">' + message + '</div>'
  ].join('\n');
};
},{}],6:[function(require,module,exports){
module.exports = function( code ){
  var proto = code in module.exports.errors ?
      module.exports.errors[ code ] :
      module.exports.errors.UNKNOWN;

  var error = new Error( proto.message );
  error.code = proto.code;

  return error;
};

module.exports.errors = {};

module.exports.errors.UNKNOWN = {
  code: 'UNKNOWN'
, message: 'There was an error with the request'
};

module.exports.errors.OVER_QUERY_LIMIT = {
  code: 'OVER_QUERY_LIMIT'
, message: 'You are over your quota'
};

module.exports.errors.REQUEST_DENIED = {
  code: 'REQUEST_DENIED'
, message: 'Request was denied. Perhaps check your api key?'
};

module.exports.errors.INVALID_REQUEST = {
  code: 'INVALID_REQUEST'
, message: 'Invalid request. Perhaps you\'re missing the input param?'
};
},{}],7:[function(require,module,exports){
module.exports = function( makeRequest, options ){
  module.exports.makeRequest = makeRequest;
};

module.exports.makeRequest = function(){
  console.warn('Did not implement http function');
  console.warn('Use something like:');
  console.warn('  gplaces.http( function( input, callback ){');
  console.warn("    request.get('/my-api/endpoint')");
  console.warn("      .query({ input: input })");
  console.warn("      .end( callback )");
  console.warn('  }');

  throw new Error('Must implement http functionality calling gplaces.http( callback )');
};
},{}],8:[function(require,module,exports){
var api = require('./http');

module.exports = function( onChange ){
  return Object.create({
    val: function( str ){
      if ( str === undefined ) return this.value;

      if ( str === this.value ) return this;

      this.value = str;

      onChange();

      if ( [ null, '' ].indexOf( str ) === -1 ){
        this.makeRequest();
      }
      
      return this;
    }
    
  , makeRequest: function(){
      api.makeRequest( this.val(), function( error, res ){
        if ( error ) return onChange( error );

        if ( res.body ){
          return onChange( null, res.body );
        }

        // Consumer parsed the body from the response already
        if ( Array.isArray( res.predictions ) ){
          return onChange( null, res );
        }
      });
    }
  });
};
},{"./http":7}],9:[function(require,module,exports){
module.exports = function(){};
},{}],10:[function(require,module,exports){
module.exports = function( prediction ){
  var innerText = '';
  var beginningOfMatch = false;
  var endOfMatch = false;
  var match;
  var c;

  for ( var i = 0, l = prediction.description.length, ii, ll; i < l; i++ ){
    c = prediction.description[i];

    beginningOfMatch = false;
    endOfMatch = false;

    for ( ii = 0, ll = prediction.matched_substrings.length; ii < ll; ii++ ){
      match = prediction.matched_substrings[ ii ];

      if ( match.offset === i ){
        beginningOfMatch = true;
        break;
      }

      if ( (match.offset + match.length) === i ){
        endOfMatch = true;
        break;
      }
    }

    if ( beginningOfMatch ){
      innerText += '<span class="highlight">' + c;
    } else if ( endOfMatch ){
      innerText += c + '</span>';
    } else {
      innerText += c;
    }
  }

  return [
    '<div class="gplaces-popover-item gplaces-prediction" data-value="' + prediction.description + '">'
  , innerText
  , '</div>'
  ].join('\n');
};
},{}],11:[function(require,module,exports){
(function (global){
module.exports = function( gplaces ){
  if ( !('document' in global) ) return;

  document.addEventListener('DOMContentLoaded', function(){
    var list = document.querySelectorAll('[data-gplaces]');

    for ( var i = 0, el, options, target; i < list.length; i++ ){
      el = list[ i ];
      options = {};

      target = el.getAttribute('data-target');

      if ( target ){
        options.target = document.querySelector( target );
      }

      gplaces( el, options );
    }
  });
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],12:[function(require,module,exports){
module.exports = function( length, change ){
  change = change || function(){};

  return Object.create({
    length: length || 0

  , pos: -1

  , up: function(){
      return this.set( this.pos - 1 );
    }

  , down: function(){
      return this.set( this.pos + 1 );
    }

  , set: function( pos ){
      if ( pos === this.pos ) return this;
      this.pos = Math.max( -1, Math.min( pos, this.length - 1 ) );
      change( this.pos );
      return this;
    }
  });
};
},{}],13:[function(require,module,exports){
module.exports.defaults = function( a, b ){
  for ( var key in b )
    if ( !( key in a ) ) a[ key ] = b[ key ];
  return a;
};

module.exports.mixin = function( a ){
  var args = Array.prototype.slice.call( arguments, 1 );
  var b, key;

  while ( args.length ){
    b = args.pop();

    for ( key in b ){
      a[ key ] = b[ key ];
    }
  }

  return a;
};

module.exports.isOutsideOf = function(){
  var what = Array.prototype.slice.call( arguments );

  var isOutside = function( el ){
    if ( what.indexOf( el ) > -1 ) return false;
    if ( el === null ) return true;
    return isOutside( el.parentElement );
  };

  return isOutside;
};

module.exports.parseDirectionalKeyEvent = function( e ){
  if ( !e.keyCode ) return null;

  return ({
    38: 'up'
  , 40: 'down'
  })[ e.keyCode ] || null;
};
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzdGFuZGFsb25lLWJ1aWxkLmpzIiwiaW5kZXguanMiLCJsaWIvYmFzZS10bXBsLmpzIiwibGliL2Jhc2Utdmlldy5qcyIsImxpYi9lcnJvci10bXBsLmpzIiwibGliL2Vycm9ycy5qcyIsImxpYi9odHRwLmpzIiwibGliL2lucHV0LW1vZGVsLmpzIiwibGliL25vb3AuanMiLCJsaWIvcHJlZGljdGlvbi10bXBsLmpzIiwibGliL3JlZ2lzdGVyLWJyb3dzZXItY29udGVudC5qcyIsImxpYi9zZWxlY3Rpb24tcG9zaXRpb24tbW9kZWwuanMiLCJsaWIvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBncGxhY2VzID0gcmVxdWlyZSgnLi8nKTtcblxuaWYgKCB0eXBlb2Ygd2luZG93LmRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiB3aW5kb3cuZGVmaW5lLmFtZCApe1xuICB3aW5kb3cuZGVmaW5lKCAnZ3BsYWNlcycsIGZ1bmN0aW9uKCl7IHJldHVybiBncGxhY2VzOyB9ICk7XG59IGVsc2Uge1xuICB3aW5kb3cuZ3BsYWNlcyA9IGdwbGFjZXM7XG59IiwibW9kdWxlLmV4cG9ydHMgICAgICAgID0gcmVxdWlyZSgnLi9saWIvYmFzZS12aWV3Jyk7XG5tb2R1bGUuZXhwb3J0cy5wcm94eSAgPSByZXF1aXJlKCcuL2xpYi9zZXJ2ZXInKTtcbm1vZHVsZS5leHBvcnRzLmh0dHAgICA9IHJlcXVpcmUoJy4vbGliL2h0dHAnKTtcblxucmVxdWlyZSgnLi9saWIvcmVnaXN0ZXItYnJvd3Nlci1jb250ZW50JykoIG1vZHVsZS5leHBvcnRzICk7IiwidmFyIHByZWRpY3Rpb25UbXBsID0gcmVxdWlyZSgnLi9wcmVkaWN0aW9uLXRtcGwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggZGF0YSApe1xuICByZXR1cm4gW1xuICAgICc8ZGl2IGNsYXNzPVwiZ3BsYWNlcy1wb3BvdmVyLWJvZHlcIj4nXG4gICwgZGF0YS5wcmVkaWN0aW9ucy5tYXAoIGZ1bmN0aW9uKCBwcmVkaWN0aW9uICl7XG4gICAgICByZXR1cm4gcHJlZGljdGlvblRtcGwoIHByZWRpY3Rpb24gKTtcbiAgICB9KS5qb2luKCdcXG4nKVxuICAsICcgIDxkaXYgY2xhc3M9XCJnb29nbGUtbG9nb1wiPjwvZGl2PidcbiAgLCAnPC9kaXY+J1xuICBdLmpvaW4oJ1xcbicpO1xufTsiLCJ2YXIgdXRpbHMgICAgICAgICAgICAgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgZXJyb3JzICAgICAgICAgICAgPSByZXF1aXJlKCcuL2Vycm9ycycpO1xudmFyIGdwbGFjZUlucHV0ICAgICAgID0gcmVxdWlyZSgnLi9pbnB1dC1tb2RlbCcpO1xudmFyIHNlbGVjdGlvblBvc2l0aW9uID0gcmVxdWlyZSgnLi9zZWxlY3Rpb24tcG9zaXRpb24tbW9kZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggZWwsIG9wdGlvbnMgKXtcbiAgcmV0dXJuIE9iamVjdC5jcmVhdGUoe1xuICAgIGVsOiBlbFxuICAgIFxuICAsIG9wdGlvbnM6IHV0aWxzLmRlZmF1bHRzKCBvcHRpb25zIHx8IHt9LCB7XG4gICAgICB0bXBsOiAgICAgICByZXF1aXJlKCcuL2Jhc2UtdG1wbCcpXG4gICAgLCBlcnJvclRtcGw6ICByZXF1aXJlKCcuL2Vycm9yLXRtcGwnKVxuICAgIH0pXG4gICAgXG4gICwgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgIHRoaXMubW9kZWwgPSBncGxhY2VJbnB1dCggZnVuY3Rpb24oIGVycm9yLCByZXN1bHQgKXtcbiAgICAgICAgaWYgKCBlcnJvciApe1xuICAgICAgICAgIHJldHVybiB0aGlzLnJlbmRlckVycm9yKCBlcnJvcnMoJ1VOS05PV04nKSApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCByZXN1bHQgJiYgcmVzdWx0LnN0YXR1cyAhPT0gJ09LJyApe1xuICAgICAgICAgIGlmICggcmVzdWx0LnN0YXR1cyA9PT0gJ1pFUk9fUkVTVUxUUycgKXtcbiAgICAgICAgICAgIHJlc3VsdC5wcmVkaWN0aW9ucyA9IFtdO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJFcnJvciggZXJyb3JzKCByZXN1bHQuc3RhdHVzICkgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIHJlc3VsdCAmJiByZXN1bHQucHJlZGljdGlvbnMgKXtcbiAgICAgICAgICB0aGlzLnNlbGVjdGlvblBvc2l0aW9uID0gc2VsZWN0aW9uUG9zaXRpb24oIHJlc3VsdC5wcmVkaWN0aW9ucy5sZW5ndGgsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclBvc2l0aW9uKCk7XG4gICAgICAgICAgfS5iaW5kKCB0aGlzICkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZW5kZXIoIHJlc3VsdCApO1xuICAgICAgfS5iaW5kKCB0aGlzICkpO1xuXG4gICAgICB0aGlzLnNlbGVjdGlvblBvc2l0aW9uID0gc2VsZWN0aW9uUG9zaXRpb24oKTtcbiAgICBcbiAgICAgIHRoaXMucG9wb3ZlckVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICB0aGlzLnBvcG92ZXJFbC5jbGFzc0xpc3QuYWRkKCAnZ3BsYWNlcy1wb3BvdmVyJywgJ2hpZGUnICk7XG5cbiAgICAgIGlmICggdGhpcy5lbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdmFyaWFudCcpICl7XG4gICAgICAgIHRoaXMucG9wb3ZlckVsLmNsYXNzTGlzdC5hZGQuYXBwbHkoXG4gICAgICAgICAgdGhpcy5wb3BvdmVyRWwuY2xhc3NMaXN0XG4gICAgICAgICwgdGhpcy5lbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdmFyaWFudCcpLnNwbGl0KCcgJylcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlcmUncyBhIHRhcmdldCBzcGVjaWZpZWQsIHB1dCB0aGUgcG9wb3ZlciBpbiB0aGVyZVxuICAgICAgLy8gb3RoZXJ3aXNlLCBpbnNlcnQgaXQgYWZ0ZXIgdGhlIGlucHV0XG4gICAgICBpZiAoIHRoaXMub3B0aW9ucy50YXJnZXQgKXtcbiAgICAgICAgdGhpcy5vcHRpb25zLnRhcmdldC5hcHBlbmRDaGlsZCggdGhpcy5wb3BvdmVyRWwgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoIHRoaXMucG9wb3ZlckVsLCB0aGlzLmVsLm5leHRTaWJsaW5nICk7XG4gICAgICB9XG4gICAgXG4gICAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoICdrZXl1cCcsIHRoaXMub25JbnB1dEtleXVwLmJpbmQoIHRoaXMgKSApO1xuXG4gICAgICAvLyBEZWxlZ2F0ZSBjbGlja3MgdG8gcHJlZGljdGlvbnNcbiAgICAgIHRoaXMucG9wb3ZlckVsLmFkZEV2ZW50TGlzdGVuZXIoICdjbGljaycsIHRoaXMub25QcmVkaWN0aW9uQ2xpY2tEZWxlZ2F0aW9uLmJpbmQoIHRoaXMgKSApO1xuXG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCAnY2xpY2snLCB0aGlzLm9uQm9keUNsaWNrLmJpbmQoIHRoaXMgKSApO1xuICAgIFxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICwgcmVuZGVyRXJyb3I6IGZ1bmN0aW9uKCBlcnJvciApe1xuICAgICAgaWYgKCBjb25zb2xlICkgY29uc29sZS5sb2coIGVycm9yICk7XG4gICAgICB0aGlzLnBvcG92ZXJFbC5pbm5lckhUTUwgPSB0aGlzLm9wdGlvbnMuZXJyb3JUbXBsKCBlcnJvciApO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFxuICAsIHJlbmRlcjogZnVuY3Rpb24oIHJlc3VsdCApe1xuICAgICAgaWYgKCByZXN1bHQgKXtcbiAgICAgICAgdGhpcy5wb3BvdmVyRWwuaW5uZXJIVE1MID0gdGhpcy5vcHRpb25zLnRtcGwoIHJlc3VsdCApO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnJlbmRlclBvc2l0aW9uKCk7XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAsIHJlbmRlclBvc2l0aW9uOiBmdW5jdGlvbigpe1xuICAgICAgaWYgKCB0aGlzLnNlbGVjdGlvblBvc2l0aW9uLnBvcyA9PT0gLTEgKXtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIHZhciBhY3RpdmVFbCA9IHRoaXMucG9wb3ZlckVsLnF1ZXJ5U2VsZWN0b3IoJy5hY3RpdmUnKTtcblxuICAgICAgaWYgKCBhY3RpdmVFbCApe1xuICAgICAgICBhY3RpdmVFbC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICAgIH1cblxuICAgICAgYWN0aXZlRWwgPSB0aGlzLnBvcG92ZXJFbFxuICAgICAgICAucXVlcnlTZWxlY3RvckFsbCgnLmdwbGFjZXMtcHJlZGljdGlvbicpXG4gICAgICAgIFsgdGhpcy5zZWxlY3Rpb25Qb3NpdGlvbi5wb3MgXTtcblxuICAgICAgYWN0aXZlRWwuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cbiAgICAgIHRoaXMubW9kZWwudmFsdWUgPSBhY3RpdmVFbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdmFsdWUnKTtcblxuICAgICAgdGhpcy5zYWZlbHlTZXRFbGVtZW50VmFsdWUoKTtcblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICwgc2FmZWx5U2V0RWxlbWVudFZhbHVlOiBmdW5jdGlvbigpe1xuICAgICAgaWYgKCB0aGlzLmVsLnZhbHVlICE9IHRoaXMubW9kZWwudmFsKCkgKXtcbiAgICAgICAgdGhpcy5lbC52YWx1ZSA9IHRoaXMubW9kZWwudmFsKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAsIGlzU2hvd2luZzogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiAhdGhpcy5wb3BvdmVyRWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRlJyk7XG4gICAgfVxuXG4gICwgaGlkZTogZnVuY3Rpb24oKXtcbiAgICAgIHRoaXMucG9wb3ZlckVsLmNsYXNzTGlzdC5hZGQoJ2hpZGUnKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAsIHNob3c6IGZ1bmN0aW9uKCl7XG4gICAgICB0aGlzLnBvcG92ZXJFbC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRlJyk7XG4gICAgICBjb25zb2xlLmxvZygnc2hvd2luZyAnLCB0aGlzLmVsLmdldEF0dHJpYnV0ZSgnZGF0YS12YXJpYW50JykgKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAsIGN1cnNvclRvRW5kOiBmdW5jdGlvbigpe1xuICAgICAgdGhpcy5lbC5zZWxlY3Rpb25TdGFydCA9IHRoaXMuZWwuc2VsZWN0aW9uRW5kID0gdGhpcy5lbC52YWx1ZS5sZW5ndGg7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgLCBvbklucHV0S2V5dXA6IGZ1bmN0aW9uKCBlICl7XG4gICAgICB0aGlzLm1vZGVsLnZhbCggZS50YXJnZXQudmFsdWUgKTtcblxuICAgICAgaWYgKCBlLmtleUNvZGUgPT09IDEzICl7XG4gICAgICAgIHJldHVybiB0aGlzLmhpZGUoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCB0aGlzLmlzU2hvd2luZygpICl7XG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSB1dGlscy5wYXJzZURpcmVjdGlvbmFsS2V5RXZlbnQoIGUgKTtcblxuICAgICAgICBpZiAoIGRpcmVjdGlvbiApe1xuICAgICAgICAgIHRoaXMuc2VsZWN0aW9uUG9zaXRpb25bIGRpcmVjdGlvbiBdKCk7XG5cbiAgICAgICAgICBpZiAoIGRpcmVjdGlvbiA9PT0gJ3VwJyApe1xuICAgICAgICAgICAgc2V0VGltZW91dCggdGhpcy5jdXJzb3JUb0VuZC5iaW5kKCB0aGlzICksIDEgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCB0aGlzLm1vZGVsLnZhbCgpLmxlbmd0aCApe1xuICAgICAgICBpZiAoICF0aGlzLmlzU2hvd2luZygpICl7XG4gICAgICAgICAgc2V0VGltZW91dCggdGhpcy5zaG93LmJpbmQoIHRoaXMgKSwgMTAwICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIHRoaXMuaXNTaG93aW5nKCkgKSB7XG4gICAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAsIG9uUHJlZGljdGlvbkNsaWNrOiBmdW5jdGlvbiggZSApe1xuICAgICAgdGhpcy5tb2RlbC52YWwoIGUudGFyZ2V0LmdldEF0dHJpYnV0ZSgnZGF0YS12YWx1ZScpICk7XG4gICAgICB0aGlzLnNhZmVseVNldEVsZW1lbnRWYWx1ZSgpO1xuICAgIH1cblxuICAsIG9uUHJlZGljdGlvbkNsaWNrRGVsZWdhdGlvbjogZnVuY3Rpb24oIGUgKXtcbiAgICAgIHZhciBmb3VuZEVsID0gZmFsc2U7XG4gICAgICB2YXIgTUFYX0lURVJBVElPTlMgPSAwO1xuXG4gICAgICAvLyBBbHdheXMgc3RvcCBhdCB0aGUgYm9keSBlbGVtZW50LCBvciA+IDUgaXRlcmF0aW9uc1xuICAgICAgd2hpbGUgKCAhZS50YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdncGxhY2VzLXBvcG92ZXItYm9keScpICl7XG4gICAgICAgIGlmICggKytNQVhfSVRFUkFUSU9OUyA+IDUgKSBicmVhaztcblxuICAgICAgICBlLnRhcmdldCA9IGUudGFyZ2V0LnBhcmVudEVsZW1lbnQ7XG5cbiAgICAgICAgaWYgKCBlLnRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ2dwbGFjZXMtcHJlZGljdGlvbicpICl7XG4gICAgICAgICAgZm91bmRFbCA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCAhZm91bmRFbCApIHJldHVybiB0cnVlO1xuXG4gICAgICB0aGlzLm9uUHJlZGljdGlvbkNsaWNrKCBlICk7XG4gICAgfVxuXG4gICwgb25Cb2R5Q2xpY2s6IGZ1bmN0aW9uKCBlICl7XG4gICAgICB2YXIgc2hvdWxkQ2xvc2UgPSB1dGlscy5pc091dHNpZGVPZiggdGhpcy5wb3BvdmVyRWwsIHRoaXMuZWwgKTtcblxuICAgICAgaWYgKCBzaG91bGRDbG9zZSggZS50YXJnZXQgKSApe1xuICAgICAgICB0aGlzLmhpZGUoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pLmluaXQoKTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggZGF0YSApe1xuICB2YXIgbWVzc2FnZSA9IGRhdGEubWVzc2FnZSB8fCAnVGhlcmUgd2FzIGFuIGVycm9yIHdpdGggdGhlIHJlcXVlc3QnO1xuXG4gIHJldHVybiBbXG4gICAgJzxkaXYgY2xhc3M9XCJlcnJvclwiPicgKyBtZXNzYWdlICsgJzwvZGl2PidcbiAgXS5qb2luKCdcXG4nKTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggY29kZSApe1xuICB2YXIgcHJvdG8gPSBjb2RlIGluIG1vZHVsZS5leHBvcnRzLmVycm9ycyA/XG4gICAgICBtb2R1bGUuZXhwb3J0cy5lcnJvcnNbIGNvZGUgXSA6XG4gICAgICBtb2R1bGUuZXhwb3J0cy5lcnJvcnMuVU5LTk9XTjtcblxuICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IoIHByb3RvLm1lc3NhZ2UgKTtcbiAgZXJyb3IuY29kZSA9IHByb3RvLmNvZGU7XG5cbiAgcmV0dXJuIGVycm9yO1xufTtcblxubW9kdWxlLmV4cG9ydHMuZXJyb3JzID0ge307XG5cbm1vZHVsZS5leHBvcnRzLmVycm9ycy5VTktOT1dOID0ge1xuICBjb2RlOiAnVU5LTk9XTidcbiwgbWVzc2FnZTogJ1RoZXJlIHdhcyBhbiBlcnJvciB3aXRoIHRoZSByZXF1ZXN0J1xufTtcblxubW9kdWxlLmV4cG9ydHMuZXJyb3JzLk9WRVJfUVVFUllfTElNSVQgPSB7XG4gIGNvZGU6ICdPVkVSX1FVRVJZX0xJTUlUJ1xuLCBtZXNzYWdlOiAnWW91IGFyZSBvdmVyIHlvdXIgcXVvdGEnXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5lcnJvcnMuUkVRVUVTVF9ERU5JRUQgPSB7XG4gIGNvZGU6ICdSRVFVRVNUX0RFTklFRCdcbiwgbWVzc2FnZTogJ1JlcXVlc3Qgd2FzIGRlbmllZC4gUGVyaGFwcyBjaGVjayB5b3VyIGFwaSBrZXk/J1xufTtcblxubW9kdWxlLmV4cG9ydHMuZXJyb3JzLklOVkFMSURfUkVRVUVTVCA9IHtcbiAgY29kZTogJ0lOVkFMSURfUkVRVUVTVCdcbiwgbWVzc2FnZTogJ0ludmFsaWQgcmVxdWVzdC4gUGVyaGFwcyB5b3VcXCdyZSBtaXNzaW5nIHRoZSBpbnB1dCBwYXJhbT8nXG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oIG1ha2VSZXF1ZXN0LCBvcHRpb25zICl7XG4gIG1vZHVsZS5leHBvcnRzLm1ha2VSZXF1ZXN0ID0gbWFrZVJlcXVlc3Q7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5tYWtlUmVxdWVzdCA9IGZ1bmN0aW9uKCl7XG4gIGNvbnNvbGUud2FybignRGlkIG5vdCBpbXBsZW1lbnQgaHR0cCBmdW5jdGlvbicpO1xuICBjb25zb2xlLndhcm4oJ1VzZSBzb21ldGhpbmcgbGlrZTonKTtcbiAgY29uc29sZS53YXJuKCcgIGdwbGFjZXMuaHR0cCggZnVuY3Rpb24oIGlucHV0LCBjYWxsYmFjayApeycpO1xuICBjb25zb2xlLndhcm4oXCIgICAgcmVxdWVzdC5nZXQoJy9teS1hcGkvZW5kcG9pbnQnKVwiKTtcbiAgY29uc29sZS53YXJuKFwiICAgICAgLnF1ZXJ5KHsgaW5wdXQ6IGlucHV0IH0pXCIpO1xuICBjb25zb2xlLndhcm4oXCIgICAgICAuZW5kKCBjYWxsYmFjayApXCIpO1xuICBjb25zb2xlLndhcm4oJyAgfScpO1xuXG4gIHRocm93IG5ldyBFcnJvcignTXVzdCBpbXBsZW1lbnQgaHR0cCBmdW5jdGlvbmFsaXR5IGNhbGxpbmcgZ3BsYWNlcy5odHRwKCBjYWxsYmFjayApJyk7XG59OyIsInZhciBhcGkgPSByZXF1aXJlKCcuL2h0dHAnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggb25DaGFuZ2UgKXtcbiAgcmV0dXJuIE9iamVjdC5jcmVhdGUoe1xuICAgIHZhbDogZnVuY3Rpb24oIHN0ciApe1xuICAgICAgaWYgKCBzdHIgPT09IHVuZGVmaW5lZCApIHJldHVybiB0aGlzLnZhbHVlO1xuXG4gICAgICBpZiAoIHN0ciA9PT0gdGhpcy52YWx1ZSApIHJldHVybiB0aGlzO1xuXG4gICAgICB0aGlzLnZhbHVlID0gc3RyO1xuXG4gICAgICBvbkNoYW5nZSgpO1xuXG4gICAgICBpZiAoIFsgbnVsbCwgJycgXS5pbmRleE9mKCBzdHIgKSA9PT0gLTEgKXtcbiAgICAgICAgdGhpcy5tYWtlUmVxdWVzdCgpO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgXG4gICwgbWFrZVJlcXVlc3Q6IGZ1bmN0aW9uKCl7XG4gICAgICBhcGkubWFrZVJlcXVlc3QoIHRoaXMudmFsKCksIGZ1bmN0aW9uKCBlcnJvciwgcmVzICl7XG4gICAgICAgIGlmICggZXJyb3IgKSByZXR1cm4gb25DaGFuZ2UoIGVycm9yICk7XG5cbiAgICAgICAgaWYgKCByZXMuYm9keSApe1xuICAgICAgICAgIHJldHVybiBvbkNoYW5nZSggbnVsbCwgcmVzLmJvZHkgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbnN1bWVyIHBhcnNlZCB0aGUgYm9keSBmcm9tIHRoZSByZXNwb25zZSBhbHJlYWR5XG4gICAgICAgIGlmICggQXJyYXkuaXNBcnJheSggcmVzLnByZWRpY3Rpb25zICkgKXtcbiAgICAgICAgICByZXR1cm4gb25DaGFuZ2UoIG51bGwsIHJlcyApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCl7fTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCBwcmVkaWN0aW9uICl7XG4gIHZhciBpbm5lclRleHQgPSAnJztcbiAgdmFyIGJlZ2lubmluZ09mTWF0Y2ggPSBmYWxzZTtcbiAgdmFyIGVuZE9mTWF0Y2ggPSBmYWxzZTtcbiAgdmFyIG1hdGNoO1xuICB2YXIgYztcblxuICBmb3IgKCB2YXIgaSA9IDAsIGwgPSBwcmVkaWN0aW9uLmRlc2NyaXB0aW9uLmxlbmd0aCwgaWksIGxsOyBpIDwgbDsgaSsrICl7XG4gICAgYyA9IHByZWRpY3Rpb24uZGVzY3JpcHRpb25baV07XG5cbiAgICBiZWdpbm5pbmdPZk1hdGNoID0gZmFsc2U7XG4gICAgZW5kT2ZNYXRjaCA9IGZhbHNlO1xuXG4gICAgZm9yICggaWkgPSAwLCBsbCA9IHByZWRpY3Rpb24ubWF0Y2hlZF9zdWJzdHJpbmdzLmxlbmd0aDsgaWkgPCBsbDsgaWkrKyApe1xuICAgICAgbWF0Y2ggPSBwcmVkaWN0aW9uLm1hdGNoZWRfc3Vic3RyaW5nc1sgaWkgXTtcblxuICAgICAgaWYgKCBtYXRjaC5vZmZzZXQgPT09IGkgKXtcbiAgICAgICAgYmVnaW5uaW5nT2ZNYXRjaCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZiAoIChtYXRjaC5vZmZzZXQgKyBtYXRjaC5sZW5ndGgpID09PSBpICl7XG4gICAgICAgIGVuZE9mTWF0Y2ggPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIGJlZ2lubmluZ09mTWF0Y2ggKXtcbiAgICAgIGlubmVyVGV4dCArPSAnPHNwYW4gY2xhc3M9XCJoaWdobGlnaHRcIj4nICsgYztcbiAgICB9IGVsc2UgaWYgKCBlbmRPZk1hdGNoICl7XG4gICAgICBpbm5lclRleHQgKz0gYyArICc8L3NwYW4+JztcbiAgICB9IGVsc2Uge1xuICAgICAgaW5uZXJUZXh0ICs9IGM7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIFtcbiAgICAnPGRpdiBjbGFzcz1cImdwbGFjZXMtcG9wb3Zlci1pdGVtIGdwbGFjZXMtcHJlZGljdGlvblwiIGRhdGEtdmFsdWU9XCInICsgcHJlZGljdGlvbi5kZXNjcmlwdGlvbiArICdcIj4nXG4gICwgaW5uZXJUZXh0XG4gICwgJzwvZGl2PidcbiAgXS5qb2luKCdcXG4nKTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggZ3BsYWNlcyApe1xuICBpZiAoICEoJ2RvY3VtZW50JyBpbiBnbG9iYWwpICkgcmV0dXJuO1xuXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbigpe1xuICAgIHZhciBsaXN0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtZ3BsYWNlc10nKTtcblxuICAgIGZvciAoIHZhciBpID0gMCwgZWwsIG9wdGlvbnMsIHRhcmdldDsgaSA8IGxpc3QubGVuZ3RoOyBpKysgKXtcbiAgICAgIGVsID0gbGlzdFsgaSBdO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuXG4gICAgICB0YXJnZXQgPSBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0Jyk7XG5cbiAgICAgIGlmICggdGFyZ2V0ICl7XG4gICAgICAgIG9wdGlvbnMudGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciggdGFyZ2V0ICk7XG4gICAgICB9XG5cbiAgICAgIGdwbGFjZXMoIGVsLCBvcHRpb25zICk7XG4gICAgfVxuICB9KTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggbGVuZ3RoLCBjaGFuZ2UgKXtcbiAgY2hhbmdlID0gY2hhbmdlIHx8IGZ1bmN0aW9uKCl7fTtcblxuICByZXR1cm4gT2JqZWN0LmNyZWF0ZSh7XG4gICAgbGVuZ3RoOiBsZW5ndGggfHwgMFxuXG4gICwgcG9zOiAtMVxuXG4gICwgdXA6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5zZXQoIHRoaXMucG9zIC0gMSApO1xuICAgIH1cblxuICAsIGRvd246IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5zZXQoIHRoaXMucG9zICsgMSApO1xuICAgIH1cblxuICAsIHNldDogZnVuY3Rpb24oIHBvcyApe1xuICAgICAgaWYgKCBwb3MgPT09IHRoaXMucG9zICkgcmV0dXJuIHRoaXM7XG4gICAgICB0aGlzLnBvcyA9IE1hdGgubWF4KCAtMSwgTWF0aC5taW4oIHBvcywgdGhpcy5sZW5ndGggLSAxICkgKTtcbiAgICAgIGNoYW5nZSggdGhpcy5wb3MgKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfSk7XG59OyIsIm1vZHVsZS5leHBvcnRzLmRlZmF1bHRzID0gZnVuY3Rpb24oIGEsIGIgKXtcbiAgZm9yICggdmFyIGtleSBpbiBiIClcbiAgICBpZiAoICEoIGtleSBpbiBhICkgKSBhWyBrZXkgXSA9IGJbIGtleSBdO1xuICByZXR1cm4gYTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLm1peGluID0gZnVuY3Rpb24oIGEgKXtcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCggYXJndW1lbnRzLCAxICk7XG4gIHZhciBiLCBrZXk7XG5cbiAgd2hpbGUgKCBhcmdzLmxlbmd0aCApe1xuICAgIGIgPSBhcmdzLnBvcCgpO1xuXG4gICAgZm9yICgga2V5IGluIGIgKXtcbiAgICAgIGFbIGtleSBdID0gYlsga2V5IF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5pc091dHNpZGVPZiA9IGZ1bmN0aW9uKCl7XG4gIHZhciB3aGF0ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoIGFyZ3VtZW50cyApO1xuXG4gIHZhciBpc091dHNpZGUgPSBmdW5jdGlvbiggZWwgKXtcbiAgICBpZiAoIHdoYXQuaW5kZXhPZiggZWwgKSA+IC0xICkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICggZWwgPT09IG51bGwgKSByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gaXNPdXRzaWRlKCBlbC5wYXJlbnRFbGVtZW50ICk7XG4gIH07XG5cbiAgcmV0dXJuIGlzT3V0c2lkZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnBhcnNlRGlyZWN0aW9uYWxLZXlFdmVudCA9IGZ1bmN0aW9uKCBlICl7XG4gIGlmICggIWUua2V5Q29kZSApIHJldHVybiBudWxsO1xuXG4gIHJldHVybiAoe1xuICAgIDM4OiAndXAnXG4gICwgNDA6ICdkb3duJ1xuICB9KVsgZS5rZXlDb2RlIF0gfHwgbnVsbDtcbn07Il19

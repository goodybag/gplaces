(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports        = require('./lib/base-view');
module.exports.proxy  = require('./lib/server');
module.exports.http   = require('./lib/http');

require('./lib/register-browser-content')( module.exports );
},{"./lib/base-view":3,"./lib/http":6,"./lib/register-browser-content":10,"./lib/server":8}],2:[function(require,module,exports){
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
},{"./prediction-tmpl":9}],3:[function(require,module,exports){
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

      // Delegate clicks to predictions
      this.popoverEl.addEventListener( 'click', this.onPredictionClickDelegation.bind( this ) );
    
      this.el.addEventListener( 'keyup', this.onInputKeyup.bind( this ) );
      this.el.addEventListener( 'blur', this.onBlur.bind( this ) );

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

  , onBlur: function( e ){
      var this_ = this;

      // Add a timeout both for effect and so that the click delegate
      // event handlers fires before the blur event handler
      setTimeout(function(){
        this_.hide();
      }, 100 );
    }
  }).init();
};
},{"./base-tmpl":2,"./error-tmpl":4,"./errors":5,"./input-model":7,"./selection-position-model":11,"./utils":12}],4:[function(require,module,exports){
module.exports = function( data ){
  var message = data.message || 'There was an error with the request';

  return [
    '<div class="error">' + message + '</div>'
  ].join('\n');
};
},{}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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
},{"./http":6}],8:[function(require,module,exports){
module.exports = function(){};
},{}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
var gplaces = require('./');

if ( typeof window.define === 'function' && window.define.amd ){
  window.define( 'gplaces', function(){ return gplaces; } );
} else {
  window.gplaces = gplaces;
}
},{"./":1}]},{},[13])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9iYXNlLXRtcGwuanMiLCJsaWIvYmFzZS12aWV3LmpzIiwibGliL2Vycm9yLXRtcGwuanMiLCJsaWIvZXJyb3JzLmpzIiwibGliL2h0dHAuanMiLCJsaWIvaW5wdXQtbW9kZWwuanMiLCJsaWIvbm9vcC5qcyIsImxpYi9wcmVkaWN0aW9uLXRtcGwuanMiLCJsaWIvcmVnaXN0ZXItYnJvd3Nlci1jb250ZW50LmpzIiwibGliL3NlbGVjdGlvbi1wb3NpdGlvbi1tb2RlbC5qcyIsImxpYi91dGlscy5qcyIsInN0YW5kYWxvbmUtYnVpbGQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzICAgICAgICA9IHJlcXVpcmUoJy4vbGliL2Jhc2UtdmlldycpO1xubW9kdWxlLmV4cG9ydHMucHJveHkgID0gcmVxdWlyZSgnLi9saWIvc2VydmVyJyk7XG5tb2R1bGUuZXhwb3J0cy5odHRwICAgPSByZXF1aXJlKCcuL2xpYi9odHRwJyk7XG5cbnJlcXVpcmUoJy4vbGliL3JlZ2lzdGVyLWJyb3dzZXItY29udGVudCcpKCBtb2R1bGUuZXhwb3J0cyApOyIsInZhciBwcmVkaWN0aW9uVG1wbCA9IHJlcXVpcmUoJy4vcHJlZGljdGlvbi10bXBsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oIGRhdGEgKXtcbiAgcmV0dXJuIFtcbiAgICAnPGRpdiBjbGFzcz1cImdwbGFjZXMtcG9wb3Zlci1ib2R5XCI+J1xuICAsIGRhdGEucHJlZGljdGlvbnMubWFwKCBmdW5jdGlvbiggcHJlZGljdGlvbiApe1xuICAgICAgcmV0dXJuIHByZWRpY3Rpb25UbXBsKCBwcmVkaWN0aW9uICk7XG4gICAgfSkuam9pbignXFxuJylcbiAgLCAnICA8ZGl2IGNsYXNzPVwiZ29vZ2xlLWxvZ29cIj48L2Rpdj4nXG4gICwgJzwvZGl2PidcbiAgXS5qb2luKCdcXG4nKTtcbn07IiwidmFyIHV0aWxzICAgICAgICAgICAgID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGVycm9ycyAgICAgICAgICAgID0gcmVxdWlyZSgnLi9lcnJvcnMnKTtcbnZhciBncGxhY2VJbnB1dCAgICAgICA9IHJlcXVpcmUoJy4vaW5wdXQtbW9kZWwnKTtcbnZhciBzZWxlY3Rpb25Qb3NpdGlvbiA9IHJlcXVpcmUoJy4vc2VsZWN0aW9uLXBvc2l0aW9uLW1vZGVsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oIGVsLCBvcHRpb25zICl7XG4gIHJldHVybiBPYmplY3QuY3JlYXRlKHtcbiAgICBlbDogZWxcbiAgICBcbiAgLCBvcHRpb25zOiB1dGlscy5kZWZhdWx0cyggb3B0aW9ucyB8fCB7fSwge1xuICAgICAgdG1wbDogICAgICAgcmVxdWlyZSgnLi9iYXNlLXRtcGwnKVxuICAgICwgZXJyb3JUbXBsOiAgcmVxdWlyZSgnLi9lcnJvci10bXBsJylcbiAgICB9KVxuICAgIFxuICAsIGluaXQ6IGZ1bmN0aW9uKCl7XG4gICAgICB0aGlzLm1vZGVsID0gZ3BsYWNlSW5wdXQoIGZ1bmN0aW9uKCBlcnJvciwgcmVzdWx0ICl7XG4gICAgICAgIGlmICggZXJyb3IgKXtcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJFcnJvciggZXJyb3JzKCdVTktOT1dOJykgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggcmVzdWx0ICYmIHJlc3VsdC5zdGF0dXMgIT09ICdPSycgKXtcbiAgICAgICAgICBpZiAoIHJlc3VsdC5zdGF0dXMgPT09ICdaRVJPX1JFU1VMVFMnICl7XG4gICAgICAgICAgICByZXN1bHQucHJlZGljdGlvbnMgPSBbXTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyRXJyb3IoIGVycm9ycyggcmVzdWx0LnN0YXR1cyApICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCByZXN1bHQgJiYgcmVzdWx0LnByZWRpY3Rpb25zICl7XG4gICAgICAgICAgdGhpcy5zZWxlY3Rpb25Qb3NpdGlvbiA9IHNlbGVjdGlvblBvc2l0aW9uKCByZXN1bHQucHJlZGljdGlvbnMubGVuZ3RoLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJQb3NpdGlvbigpO1xuICAgICAgICAgIH0uYmluZCggdGhpcyApKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmVuZGVyKCByZXN1bHQgKTtcbiAgICAgIH0uYmluZCggdGhpcyApKTtcblxuICAgICAgdGhpcy5zZWxlY3Rpb25Qb3NpdGlvbiA9IHNlbGVjdGlvblBvc2l0aW9uKCk7XG4gICAgXG4gICAgICB0aGlzLnBvcG92ZXJFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgdGhpcy5wb3BvdmVyRWwuY2xhc3NMaXN0LmFkZCggJ2dwbGFjZXMtcG9wb3ZlcicsICdoaWRlJyApO1xuXG4gICAgICBpZiAoIHRoaXMuZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXZhcmlhbnQnKSApe1xuICAgICAgICB0aGlzLnBvcG92ZXJFbC5jbGFzc0xpc3QuYWRkLmFwcGx5KFxuICAgICAgICAgIHRoaXMucG9wb3ZlckVsLmNsYXNzTGlzdFxuICAgICAgICAsIHRoaXMuZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXZhcmlhbnQnKS5zcGxpdCgnICcpXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZXJlJ3MgYSB0YXJnZXQgc3BlY2lmaWVkLCBwdXQgdGhlIHBvcG92ZXIgaW4gdGhlcmVcbiAgICAgIC8vIG90aGVyd2lzZSwgaW5zZXJ0IGl0IGFmdGVyIHRoZSBpbnB1dFxuICAgICAgaWYgKCB0aGlzLm9wdGlvbnMudGFyZ2V0ICl7XG4gICAgICAgIHRoaXMub3B0aW9ucy50YXJnZXQuYXBwZW5kQ2hpbGQoIHRoaXMucG9wb3ZlckVsICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKCB0aGlzLnBvcG92ZXJFbCwgdGhpcy5lbC5uZXh0U2libGluZyApO1xuICAgICAgfVxuXG4gICAgICAvLyBEZWxlZ2F0ZSBjbGlja3MgdG8gcHJlZGljdGlvbnNcbiAgICAgIHRoaXMucG9wb3ZlckVsLmFkZEV2ZW50TGlzdGVuZXIoICdjbGljaycsIHRoaXMub25QcmVkaWN0aW9uQ2xpY2tEZWxlZ2F0aW9uLmJpbmQoIHRoaXMgKSApO1xuICAgIFxuICAgICAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKCAna2V5dXAnLCB0aGlzLm9uSW5wdXRLZXl1cC5iaW5kKCB0aGlzICkgKTtcbiAgICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lciggJ2JsdXInLCB0aGlzLm9uQmx1ci5iaW5kKCB0aGlzICkgKTtcblxuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciggJ2NsaWNrJywgdGhpcy5vbkJvZHlDbGljay5iaW5kKCB0aGlzICkgKTtcbiAgICBcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAsIHJlbmRlckVycm9yOiBmdW5jdGlvbiggZXJyb3IgKXtcbiAgICAgIGlmICggY29uc29sZSApIGNvbnNvbGUubG9nKCBlcnJvciApO1xuICAgICAgdGhpcy5wb3BvdmVyRWwuaW5uZXJIVE1MID0gdGhpcy5vcHRpb25zLmVycm9yVG1wbCggZXJyb3IgKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbiAgLCByZW5kZXI6IGZ1bmN0aW9uKCByZXN1bHQgKXtcbiAgICAgIGlmICggcmVzdWx0ICl7XG4gICAgICAgIHRoaXMucG9wb3ZlckVsLmlubmVySFRNTCA9IHRoaXMub3B0aW9ucy50bXBsKCByZXN1bHQgKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5yZW5kZXJQb3NpdGlvbigpO1xuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgLCByZW5kZXJQb3NpdGlvbjogZnVuY3Rpb24oKXtcbiAgICAgIGlmICggdGhpcy5zZWxlY3Rpb25Qb3NpdGlvbi5wb3MgPT09IC0xICl7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICB2YXIgYWN0aXZlRWwgPSB0aGlzLnBvcG92ZXJFbC5xdWVyeVNlbGVjdG9yKCcuYWN0aXZlJyk7XG5cbiAgICAgIGlmICggYWN0aXZlRWwgKXtcbiAgICAgICAgYWN0aXZlRWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgICB9XG5cbiAgICAgIGFjdGl2ZUVsID0gdGhpcy5wb3BvdmVyRWxcbiAgICAgICAgLnF1ZXJ5U2VsZWN0b3JBbGwoJy5ncGxhY2VzLXByZWRpY3Rpb24nKVxuICAgICAgICBbIHRoaXMuc2VsZWN0aW9uUG9zaXRpb24ucG9zIF07XG5cbiAgICAgIGFjdGl2ZUVsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXG4gICAgICB0aGlzLm1vZGVsLnZhbHVlID0gYWN0aXZlRWwuZ2V0QXR0cmlidXRlKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgIHRoaXMuc2FmZWx5U2V0RWxlbWVudFZhbHVlKCk7XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAsIHNhZmVseVNldEVsZW1lbnRWYWx1ZTogZnVuY3Rpb24oKXtcbiAgICAgIGlmICggdGhpcy5lbC52YWx1ZSAhPSB0aGlzLm1vZGVsLnZhbCgpICl7XG4gICAgICAgIHRoaXMuZWwudmFsdWUgPSB0aGlzLm1vZGVsLnZhbCgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgLCBpc1Nob3dpbmc6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gIXRoaXMucG9wb3ZlckVsLmNsYXNzTGlzdC5jb250YWlucygnaGlkZScpO1xuICAgIH1cblxuICAsIGhpZGU6IGZ1bmN0aW9uKCl7XG4gICAgICB0aGlzLnBvcG92ZXJFbC5jbGFzc0xpc3QuYWRkKCdoaWRlJyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgLCBzaG93OiBmdW5jdGlvbigpe1xuICAgICAgdGhpcy5wb3BvdmVyRWwuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZScpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICwgY3Vyc29yVG9FbmQ6IGZ1bmN0aW9uKCl7XG4gICAgICB0aGlzLmVsLnNlbGVjdGlvblN0YXJ0ID0gdGhpcy5lbC5zZWxlY3Rpb25FbmQgPSB0aGlzLmVsLnZhbHVlLmxlbmd0aDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAsIG9uSW5wdXRLZXl1cDogZnVuY3Rpb24oIGUgKXtcbiAgICAgIHRoaXMubW9kZWwudmFsKCBlLnRhcmdldC52YWx1ZSApO1xuXG4gICAgICBpZiAoIGUua2V5Q29kZSA9PT0gMTMgKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGlkZSgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIHRoaXMuaXNTaG93aW5nKCkgKXtcbiAgICAgICAgdmFyIGRpcmVjdGlvbiA9IHV0aWxzLnBhcnNlRGlyZWN0aW9uYWxLZXlFdmVudCggZSApO1xuXG4gICAgICAgIGlmICggZGlyZWN0aW9uICl7XG4gICAgICAgICAgdGhpcy5zZWxlY3Rpb25Qb3NpdGlvblsgZGlyZWN0aW9uIF0oKTtcblxuICAgICAgICAgIGlmICggZGlyZWN0aW9uID09PSAndXAnICl7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCB0aGlzLmN1cnNvclRvRW5kLmJpbmQoIHRoaXMgKSwgMSApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIHRoaXMubW9kZWwudmFsKCkubGVuZ3RoICl7XG4gICAgICAgIGlmICggIXRoaXMuaXNTaG93aW5nKCkgKXtcbiAgICAgICAgICBzZXRUaW1lb3V0KCB0aGlzLnNob3cuYmluZCggdGhpcyApLCAxMDAgKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICggdGhpcy5pc1Nob3dpbmcoKSApIHtcbiAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICwgb25QcmVkaWN0aW9uQ2xpY2s6IGZ1bmN0aW9uKCBlICl7XG4gICAgICB0aGlzLm1vZGVsLnZhbCggZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLXZhbHVlJykgKTtcbiAgICAgIHRoaXMuc2FmZWx5U2V0RWxlbWVudFZhbHVlKCk7XG4gICAgfVxuXG4gICwgb25QcmVkaWN0aW9uQ2xpY2tEZWxlZ2F0aW9uOiBmdW5jdGlvbiggZSApe1xuICAgICAgdmFyIGZvdW5kRWwgPSBmYWxzZTtcbiAgICAgIHZhciBNQVhfSVRFUkFUSU9OUyA9IDA7XG5cbiAgICAgIC8vIEFsd2F5cyBzdG9wIGF0IHRoZSBib2R5IGVsZW1lbnQsIG9yID4gNSBpdGVyYXRpb25zXG4gICAgICB3aGlsZSAoICFlLnRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ2dwbGFjZXMtcG9wb3Zlci1ib2R5JykgKXtcbiAgICAgICAgaWYgKCArK01BWF9JVEVSQVRJT05TID4gNSApIGJyZWFrO1xuXG4gICAgICAgIGUudGFyZ2V0ID0gZS50YXJnZXQucGFyZW50RWxlbWVudDtcblxuICAgICAgICBpZiAoIGUudGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnZ3BsYWNlcy1wcmVkaWN0aW9uJykgKXtcbiAgICAgICAgICBmb3VuZEVsID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoICFmb3VuZEVsICkgcmV0dXJuIHRydWU7XG5cbiAgICAgIHRoaXMub25QcmVkaWN0aW9uQ2xpY2soIGUgKTtcbiAgICB9XG5cbiAgLCBvbkJvZHlDbGljazogZnVuY3Rpb24oIGUgKXtcbiAgICAgIHZhciBzaG91bGRDbG9zZSA9IHV0aWxzLmlzT3V0c2lkZU9mKCB0aGlzLnBvcG92ZXJFbCwgdGhpcy5lbCApO1xuXG4gICAgICBpZiAoIHNob3VsZENsb3NlKCBlLnRhcmdldCApICl7XG4gICAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAsIG9uQmx1cjogZnVuY3Rpb24oIGUgKXtcbiAgICAgIHZhciB0aGlzXyA9IHRoaXM7XG5cbiAgICAgIC8vIEFkZCBhIHRpbWVvdXQgYm90aCBmb3IgZWZmZWN0IGFuZCBzbyB0aGF0IHRoZSBjbGljayBkZWxlZ2F0ZVxuICAgICAgLy8gZXZlbnQgaGFuZGxlcnMgZmlyZXMgYmVmb3JlIHRoZSBibHVyIGV2ZW50IGhhbmRsZXJcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpc18uaGlkZSgpO1xuICAgICAgfSwgMTAwICk7XG4gICAgfVxuICB9KS5pbml0KCk7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oIGRhdGEgKXtcbiAgdmFyIG1lc3NhZ2UgPSBkYXRhLm1lc3NhZ2UgfHwgJ1RoZXJlIHdhcyBhbiBlcnJvciB3aXRoIHRoZSByZXF1ZXN0JztcblxuICByZXR1cm4gW1xuICAgICc8ZGl2IGNsYXNzPVwiZXJyb3JcIj4nICsgbWVzc2FnZSArICc8L2Rpdj4nXG4gIF0uam9pbignXFxuJyk7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oIGNvZGUgKXtcbiAgdmFyIHByb3RvID0gY29kZSBpbiBtb2R1bGUuZXhwb3J0cy5lcnJvcnMgP1xuICAgICAgbW9kdWxlLmV4cG9ydHMuZXJyb3JzWyBjb2RlIF0gOlxuICAgICAgbW9kdWxlLmV4cG9ydHMuZXJyb3JzLlVOS05PV047XG5cbiAgdmFyIGVycm9yID0gbmV3IEVycm9yKCBwcm90by5tZXNzYWdlICk7XG4gIGVycm9yLmNvZGUgPSBwcm90by5jb2RlO1xuXG4gIHJldHVybiBlcnJvcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmVycm9ycyA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cy5lcnJvcnMuVU5LTk9XTiA9IHtcbiAgY29kZTogJ1VOS05PV04nXG4sIG1lc3NhZ2U6ICdUaGVyZSB3YXMgYW4gZXJyb3Igd2l0aCB0aGUgcmVxdWVzdCdcbn07XG5cbm1vZHVsZS5leHBvcnRzLmVycm9ycy5PVkVSX1FVRVJZX0xJTUlUID0ge1xuICBjb2RlOiAnT1ZFUl9RVUVSWV9MSU1JVCdcbiwgbWVzc2FnZTogJ1lvdSBhcmUgb3ZlciB5b3VyIHF1b3RhJ1xufTtcblxubW9kdWxlLmV4cG9ydHMuZXJyb3JzLlJFUVVFU1RfREVOSUVEID0ge1xuICBjb2RlOiAnUkVRVUVTVF9ERU5JRUQnXG4sIG1lc3NhZ2U6ICdSZXF1ZXN0IHdhcyBkZW5pZWQuIFBlcmhhcHMgY2hlY2sgeW91ciBhcGkga2V5Pydcbn07XG5cbm1vZHVsZS5leHBvcnRzLmVycm9ycy5JTlZBTElEX1JFUVVFU1QgPSB7XG4gIGNvZGU6ICdJTlZBTElEX1JFUVVFU1QnXG4sIG1lc3NhZ2U6ICdJbnZhbGlkIHJlcXVlc3QuIFBlcmhhcHMgeW91XFwncmUgbWlzc2luZyB0aGUgaW5wdXQgcGFyYW0/J1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCBtYWtlUmVxdWVzdCwgb3B0aW9ucyApe1xuICBtb2R1bGUuZXhwb3J0cy5tYWtlUmVxdWVzdCA9IG1ha2VSZXF1ZXN0O1xufTtcblxubW9kdWxlLmV4cG9ydHMubWFrZVJlcXVlc3QgPSBmdW5jdGlvbigpe1xuICBjb25zb2xlLndhcm4oJ0RpZCBub3QgaW1wbGVtZW50IGh0dHAgZnVuY3Rpb24nKTtcbiAgY29uc29sZS53YXJuKCdVc2Ugc29tZXRoaW5nIGxpa2U6Jyk7XG4gIGNvbnNvbGUud2FybignICBncGxhY2VzLmh0dHAoIGZ1bmN0aW9uKCBpbnB1dCwgY2FsbGJhY2sgKXsnKTtcbiAgY29uc29sZS53YXJuKFwiICAgIHJlcXVlc3QuZ2V0KCcvbXktYXBpL2VuZHBvaW50JylcIik7XG4gIGNvbnNvbGUud2FybihcIiAgICAgIC5xdWVyeSh7IGlucHV0OiBpbnB1dCB9KVwiKTtcbiAgY29uc29sZS53YXJuKFwiICAgICAgLmVuZCggY2FsbGJhY2sgKVwiKTtcbiAgY29uc29sZS53YXJuKCcgIH0nKTtcblxuICB0aHJvdyBuZXcgRXJyb3IoJ011c3QgaW1wbGVtZW50IGh0dHAgZnVuY3Rpb25hbGl0eSBjYWxsaW5nIGdwbGFjZXMuaHR0cCggY2FsbGJhY2sgKScpO1xufTsiLCJ2YXIgYXBpID0gcmVxdWlyZSgnLi9odHRwJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oIG9uQ2hhbmdlICl7XG4gIHJldHVybiBPYmplY3QuY3JlYXRlKHtcbiAgICB2YWw6IGZ1bmN0aW9uKCBzdHIgKXtcbiAgICAgIGlmICggc3RyID09PSB1bmRlZmluZWQgKSByZXR1cm4gdGhpcy52YWx1ZTtcblxuICAgICAgaWYgKCBzdHIgPT09IHRoaXMudmFsdWUgKSByZXR1cm4gdGhpcztcblxuICAgICAgdGhpcy52YWx1ZSA9IHN0cjtcblxuICAgICAgb25DaGFuZ2UoKTtcblxuICAgICAgaWYgKCBbIG51bGwsICcnIF0uaW5kZXhPZiggc3RyICkgPT09IC0xICl7XG4gICAgICAgIHRoaXMubWFrZVJlcXVlc3QoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFxuICAsIG1ha2VSZXF1ZXN0OiBmdW5jdGlvbigpe1xuICAgICAgYXBpLm1ha2VSZXF1ZXN0KCB0aGlzLnZhbCgpLCBmdW5jdGlvbiggZXJyb3IsIHJlcyApe1xuICAgICAgICBpZiAoIGVycm9yICkgcmV0dXJuIG9uQ2hhbmdlKCBlcnJvciApO1xuXG4gICAgICAgIGlmICggcmVzLmJvZHkgKXtcbiAgICAgICAgICByZXR1cm4gb25DaGFuZ2UoIG51bGwsIHJlcy5ib2R5ICk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb25zdW1lciBwYXJzZWQgdGhlIGJvZHkgZnJvbSB0aGUgcmVzcG9uc2UgYWxyZWFkeVxuICAgICAgICBpZiAoIEFycmF5LmlzQXJyYXkoIHJlcy5wcmVkaWN0aW9ucyApICl7XG4gICAgICAgICAgcmV0dXJuIG9uQ2hhbmdlKCBudWxsLCByZXMgKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpe307IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggcHJlZGljdGlvbiApe1xuICB2YXIgaW5uZXJUZXh0ID0gJyc7XG4gIHZhciBiZWdpbm5pbmdPZk1hdGNoID0gZmFsc2U7XG4gIHZhciBlbmRPZk1hdGNoID0gZmFsc2U7XG4gIHZhciBtYXRjaDtcbiAgdmFyIGM7XG5cbiAgZm9yICggdmFyIGkgPSAwLCBsID0gcHJlZGljdGlvbi5kZXNjcmlwdGlvbi5sZW5ndGgsIGlpLCBsbDsgaSA8IGw7IGkrKyApe1xuICAgIGMgPSBwcmVkaWN0aW9uLmRlc2NyaXB0aW9uW2ldO1xuXG4gICAgYmVnaW5uaW5nT2ZNYXRjaCA9IGZhbHNlO1xuICAgIGVuZE9mTWF0Y2ggPSBmYWxzZTtcblxuICAgIGZvciAoIGlpID0gMCwgbGwgPSBwcmVkaWN0aW9uLm1hdGNoZWRfc3Vic3RyaW5ncy5sZW5ndGg7IGlpIDwgbGw7IGlpKysgKXtcbiAgICAgIG1hdGNoID0gcHJlZGljdGlvbi5tYXRjaGVkX3N1YnN0cmluZ3NbIGlpIF07XG5cbiAgICAgIGlmICggbWF0Y2gub2Zmc2V0ID09PSBpICl7XG4gICAgICAgIGJlZ2lubmluZ09mTWF0Y2ggPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYgKCAobWF0Y2gub2Zmc2V0ICsgbWF0Y2gubGVuZ3RoKSA9PT0gaSApe1xuICAgICAgICBlbmRPZk1hdGNoID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCBiZWdpbm5pbmdPZk1hdGNoICl7XG4gICAgICBpbm5lclRleHQgKz0gJzxzcGFuIGNsYXNzPVwiaGlnaGxpZ2h0XCI+JyArIGM7XG4gICAgfSBlbHNlIGlmICggZW5kT2ZNYXRjaCApe1xuICAgICAgaW5uZXJUZXh0ICs9IGMgKyAnPC9zcGFuPic7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlubmVyVGV4dCArPSBjO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbXG4gICAgJzxkaXYgY2xhc3M9XCJncGxhY2VzLXBvcG92ZXItaXRlbSBncGxhY2VzLXByZWRpY3Rpb25cIiBkYXRhLXZhbHVlPVwiJyArIHByZWRpY3Rpb24uZGVzY3JpcHRpb24gKyAnXCI+J1xuICAsIGlubmVyVGV4dFxuICAsICc8L2Rpdj4nXG4gIF0uam9pbignXFxuJyk7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oIGdwbGFjZXMgKXtcbiAgaWYgKCAhKCdkb2N1bWVudCcgaW4gZ2xvYmFsKSApIHJldHVybjtcblxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZnVuY3Rpb24oKXtcbiAgICB2YXIgbGlzdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLWdwbGFjZXNdJyk7XG5cbiAgICBmb3IgKCB2YXIgaSA9IDAsIGVsLCBvcHRpb25zLCB0YXJnZXQ7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrICl7XG4gICAgICBlbCA9IGxpc3RbIGkgXTtcbiAgICAgIG9wdGlvbnMgPSB7fTtcblxuICAgICAgdGFyZ2V0ID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXRhcmdldCcpO1xuXG4gICAgICBpZiAoIHRhcmdldCApe1xuICAgICAgICBvcHRpb25zLnRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoIHRhcmdldCApO1xuICAgICAgfVxuXG4gICAgICBncGxhY2VzKCBlbCwgb3B0aW9ucyApO1xuICAgIH1cbiAgfSk7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oIGxlbmd0aCwgY2hhbmdlICl7XG4gIGNoYW5nZSA9IGNoYW5nZSB8fCBmdW5jdGlvbigpe307XG5cbiAgcmV0dXJuIE9iamVjdC5jcmVhdGUoe1xuICAgIGxlbmd0aDogbGVuZ3RoIHx8IDBcblxuICAsIHBvczogLTFcblxuICAsIHVwOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuc2V0KCB0aGlzLnBvcyAtIDEgKTtcbiAgICB9XG5cbiAgLCBkb3duOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuc2V0KCB0aGlzLnBvcyArIDEgKTtcbiAgICB9XG5cbiAgLCBzZXQ6IGZ1bmN0aW9uKCBwb3MgKXtcbiAgICAgIGlmICggcG9zID09PSB0aGlzLnBvcyApIHJldHVybiB0aGlzO1xuICAgICAgdGhpcy5wb3MgPSBNYXRoLm1heCggLTEsIE1hdGgubWluKCBwb3MsIHRoaXMubGVuZ3RoIC0gMSApICk7XG4gICAgICBjaGFuZ2UoIHRoaXMucG9zICk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH0pO1xufTsiLCJtb2R1bGUuZXhwb3J0cy5kZWZhdWx0cyA9IGZ1bmN0aW9uKCBhLCBiICl7XG4gIGZvciAoIHZhciBrZXkgaW4gYiApXG4gICAgaWYgKCAhKCBrZXkgaW4gYSApICkgYVsga2V5IF0gPSBiWyBrZXkgXTtcbiAgcmV0dXJuIGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5taXhpbiA9IGZ1bmN0aW9uKCBhICl7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoIGFyZ3VtZW50cywgMSApO1xuICB2YXIgYiwga2V5O1xuXG4gIHdoaWxlICggYXJncy5sZW5ndGggKXtcbiAgICBiID0gYXJncy5wb3AoKTtcblxuICAgIGZvciAoIGtleSBpbiBiICl7XG4gICAgICBhWyBrZXkgXSA9IGJbIGtleSBdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhO1xufTtcblxubW9kdWxlLmV4cG9ydHMuaXNPdXRzaWRlT2YgPSBmdW5jdGlvbigpe1xuICB2YXIgd2hhdCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKCBhcmd1bWVudHMgKTtcblxuICB2YXIgaXNPdXRzaWRlID0gZnVuY3Rpb24oIGVsICl7XG4gICAgaWYgKCB3aGF0LmluZGV4T2YoIGVsICkgPiAtMSApIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIGVsID09PSBudWxsICkgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGlzT3V0c2lkZSggZWwucGFyZW50RWxlbWVudCApO1xuICB9O1xuXG4gIHJldHVybiBpc091dHNpZGU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wYXJzZURpcmVjdGlvbmFsS2V5RXZlbnQgPSBmdW5jdGlvbiggZSApe1xuICBpZiAoICFlLmtleUNvZGUgKSByZXR1cm4gbnVsbDtcblxuICByZXR1cm4gKHtcbiAgICAzODogJ3VwJ1xuICAsIDQwOiAnZG93bidcbiAgfSlbIGUua2V5Q29kZSBdIHx8IG51bGw7XG59OyIsInZhciBncGxhY2VzID0gcmVxdWlyZSgnLi8nKTtcblxuaWYgKCB0eXBlb2Ygd2luZG93LmRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiB3aW5kb3cuZGVmaW5lLmFtZCApe1xuICB3aW5kb3cuZGVmaW5lKCAnZ3BsYWNlcycsIGZ1bmN0aW9uKCl7IHJldHVybiBncGxhY2VzOyB9ICk7XG59IGVsc2Uge1xuICB3aW5kb3cuZ3BsYWNlcyA9IGdwbGFjZXM7XG59Il19

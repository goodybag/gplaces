(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
module.exports        = require('./lib/base-view');
module.exports.proxy  = require('./lib/server');
module.exports.http   = require('./lib/http');

if ( 'document' in global ){
  document.addEventListener('DOMContentLoaded', function(){
    var list = document.querySelectorAll('[data-gplaces]');

    for ( var i = 0, el, options, target; i < list.length; i++ ){
      el = list[ i ];
      options = {};

      target = el.getAttribute('data-target');

      if ( target ){
        options.target = document.querySelector( target );
      }

      module.exports( el, options );
    }
  });
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./lib/base-view":3,"./lib/http":6,"./lib/server":8}],2:[function(require,module,exports){
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
},{"./base-tmpl":2,"./error-tmpl":4,"./errors":5,"./input-model":7,"./selection-position-model":10,"./utils":11}],4:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9iYXNlLXRtcGwuanMiLCJsaWIvYmFzZS12aWV3LmpzIiwibGliL2Vycm9yLXRtcGwuanMiLCJsaWIvZXJyb3JzLmpzIiwibGliL2h0dHAuanMiLCJsaWIvaW5wdXQtbW9kZWwuanMiLCJsaWIvbm9vcC5qcyIsImxpYi9wcmVkaWN0aW9uLXRtcGwuanMiLCJsaWIvc2VsZWN0aW9uLXBvc2l0aW9uLW1vZGVsLmpzIiwibGliL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzICAgICAgICA9IHJlcXVpcmUoJy4vbGliL2Jhc2UtdmlldycpO1xubW9kdWxlLmV4cG9ydHMucHJveHkgID0gcmVxdWlyZSgnLi9saWIvc2VydmVyJyk7XG5tb2R1bGUuZXhwb3J0cy5odHRwICAgPSByZXF1aXJlKCcuL2xpYi9odHRwJyk7XG5cbmlmICggJ2RvY3VtZW50JyBpbiBnbG9iYWwgKXtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uKCl7XG4gICAgdmFyIGxpc3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1ncGxhY2VzXScpO1xuXG4gICAgZm9yICggdmFyIGkgPSAwLCBlbCwgb3B0aW9ucywgdGFyZ2V0OyBpIDwgbGlzdC5sZW5ndGg7IGkrKyApe1xuICAgICAgZWwgPSBsaXN0WyBpIF07XG4gICAgICBvcHRpb25zID0ge307XG5cbiAgICAgIHRhcmdldCA9IGVsLmdldEF0dHJpYnV0ZSgnZGF0YS10YXJnZXQnKTtcblxuICAgICAgaWYgKCB0YXJnZXQgKXtcbiAgICAgICAgb3B0aW9ucy50YXJnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCB0YXJnZXQgKTtcbiAgICAgIH1cblxuICAgICAgbW9kdWxlLmV4cG9ydHMoIGVsLCBvcHRpb25zICk7XG4gICAgfVxuICB9KTtcbn0iLCJ2YXIgcHJlZGljdGlvblRtcGwgPSByZXF1aXJlKCcuL3ByZWRpY3Rpb24tdG1wbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCBkYXRhICl7XG4gIHJldHVybiBbXG4gICAgJzxkaXYgY2xhc3M9XCJncGxhY2VzLXBvcG92ZXItYm9keVwiPidcbiAgLCBkYXRhLnByZWRpY3Rpb25zLm1hcCggZnVuY3Rpb24oIHByZWRpY3Rpb24gKXtcbiAgICAgIHJldHVybiBwcmVkaWN0aW9uVG1wbCggcHJlZGljdGlvbiApO1xuICAgIH0pLmpvaW4oJ1xcbicpXG4gICwgJyAgPGRpdiBjbGFzcz1cImdvb2dsZS1sb2dvXCI+PC9kaXY+J1xuICAsICc8L2Rpdj4nXG4gIF0uam9pbignXFxuJyk7XG59OyIsInZhciB1dGlscyAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBlcnJvcnMgICAgICAgICAgICA9IHJlcXVpcmUoJy4vZXJyb3JzJyk7XG52YXIgZ3BsYWNlSW5wdXQgICAgICAgPSByZXF1aXJlKCcuL2lucHV0LW1vZGVsJyk7XG52YXIgc2VsZWN0aW9uUG9zaXRpb24gPSByZXF1aXJlKCcuL3NlbGVjdGlvbi1wb3NpdGlvbi1tb2RlbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCBlbCwgb3B0aW9ucyApe1xuICByZXR1cm4gT2JqZWN0LmNyZWF0ZSh7XG4gICAgZWw6IGVsXG4gICAgXG4gICwgb3B0aW9uczogdXRpbHMuZGVmYXVsdHMoIG9wdGlvbnMgfHwge30sIHtcbiAgICAgIHRtcGw6ICAgICAgIHJlcXVpcmUoJy4vYmFzZS10bXBsJylcbiAgICAsIGVycm9yVG1wbDogIHJlcXVpcmUoJy4vZXJyb3ItdG1wbCcpXG4gICAgfSlcbiAgICBcbiAgLCBpbml0OiBmdW5jdGlvbigpe1xuICAgICAgdGhpcy5tb2RlbCA9IGdwbGFjZUlucHV0KCBmdW5jdGlvbiggZXJyb3IsIHJlc3VsdCApe1xuICAgICAgICBpZiAoIGVycm9yICl7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyRXJyb3IoIGVycm9ycygnVU5LTk9XTicpICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIHJlc3VsdCAmJiByZXN1bHQuc3RhdHVzICE9PSAnT0snICl7XG4gICAgICAgICAgaWYgKCByZXN1bHQuc3RhdHVzID09PSAnWkVST19SRVNVTFRTJyApe1xuICAgICAgICAgICAgcmVzdWx0LnByZWRpY3Rpb25zID0gW107XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbmRlckVycm9yKCBlcnJvcnMoIHJlc3VsdC5zdGF0dXMgKSApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggcmVzdWx0ICYmIHJlc3VsdC5wcmVkaWN0aW9ucyApe1xuICAgICAgICAgIHRoaXMuc2VsZWN0aW9uUG9zaXRpb24gPSBzZWxlY3Rpb25Qb3NpdGlvbiggcmVzdWx0LnByZWRpY3Rpb25zLmxlbmd0aCwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyUG9zaXRpb24oKTtcbiAgICAgICAgICB9LmJpbmQoIHRoaXMgKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlbmRlciggcmVzdWx0ICk7XG4gICAgICB9LmJpbmQoIHRoaXMgKSk7XG5cbiAgICAgIHRoaXMuc2VsZWN0aW9uUG9zaXRpb24gPSBzZWxlY3Rpb25Qb3NpdGlvbigpO1xuICAgIFxuICAgICAgdGhpcy5wb3BvdmVyRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHRoaXMucG9wb3ZlckVsLmNsYXNzTGlzdC5hZGQoICdncGxhY2VzLXBvcG92ZXInLCAnaGlkZScgKTtcblxuICAgICAgaWYgKCB0aGlzLmVsLmdldEF0dHJpYnV0ZSgnZGF0YS12YXJpYW50JykgKXtcbiAgICAgICAgdGhpcy5wb3BvdmVyRWwuY2xhc3NMaXN0LmFkZC5hcHBseShcbiAgICAgICAgICB0aGlzLnBvcG92ZXJFbC5jbGFzc0xpc3RcbiAgICAgICAgLCB0aGlzLmVsLmdldEF0dHJpYnV0ZSgnZGF0YS12YXJpYW50Jykuc3BsaXQoJyAnKVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGVyZSdzIGEgdGFyZ2V0IHNwZWNpZmllZCwgcHV0IHRoZSBwb3BvdmVyIGluIHRoZXJlXG4gICAgICAvLyBvdGhlcndpc2UsIGluc2VydCBpdCBhZnRlciB0aGUgaW5wdXRcbiAgICAgIGlmICggdGhpcy5vcHRpb25zLnRhcmdldCApe1xuICAgICAgICB0aGlzLm9wdGlvbnMudGFyZ2V0LmFwcGVuZENoaWxkKCB0aGlzLnBvcG92ZXJFbCApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSggdGhpcy5wb3BvdmVyRWwsIHRoaXMuZWwubmV4dFNpYmxpbmcgKTtcbiAgICAgIH1cbiAgICBcbiAgICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lciggJ2tleXVwJywgdGhpcy5vbklucHV0S2V5dXAuYmluZCggdGhpcyApICk7XG5cbiAgICAgIC8vIERlbGVnYXRlIGNsaWNrcyB0byBwcmVkaWN0aW9uc1xuICAgICAgdGhpcy5wb3BvdmVyRWwuYWRkRXZlbnRMaXN0ZW5lciggJ2NsaWNrJywgdGhpcy5vblByZWRpY3Rpb25DbGlja0RlbGVnYXRpb24uYmluZCggdGhpcyApICk7XG5cbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoICdjbGljaycsIHRoaXMub25Cb2R5Q2xpY2suYmluZCggdGhpcyApICk7XG4gICAgXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgLCByZW5kZXJFcnJvcjogZnVuY3Rpb24oIGVycm9yICl7XG4gICAgICBpZiAoIGNvbnNvbGUgKSBjb25zb2xlLmxvZyggZXJyb3IgKTtcbiAgICAgIHRoaXMucG9wb3ZlckVsLmlubmVySFRNTCA9IHRoaXMub3B0aW9ucy5lcnJvclRtcGwoIGVycm9yICk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgXG4gICwgcmVuZGVyOiBmdW5jdGlvbiggcmVzdWx0ICl7XG4gICAgICBpZiAoIHJlc3VsdCApe1xuICAgICAgICB0aGlzLnBvcG92ZXJFbC5pbm5lckhUTUwgPSB0aGlzLm9wdGlvbnMudG1wbCggcmVzdWx0ICk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVuZGVyUG9zaXRpb24oKTtcblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICwgcmVuZGVyUG9zaXRpb246IGZ1bmN0aW9uKCl7XG4gICAgICBpZiAoIHRoaXMuc2VsZWN0aW9uUG9zaXRpb24ucG9zID09PSAtMSApe1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgdmFyIGFjdGl2ZUVsID0gdGhpcy5wb3BvdmVyRWwucXVlcnlTZWxlY3RvcignLmFjdGl2ZScpO1xuXG4gICAgICBpZiAoIGFjdGl2ZUVsICl7XG4gICAgICAgIGFjdGl2ZUVsLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgICAgfVxuXG4gICAgICBhY3RpdmVFbCA9IHRoaXMucG9wb3ZlckVsXG4gICAgICAgIC5xdWVyeVNlbGVjdG9yQWxsKCcuZ3BsYWNlcy1wcmVkaWN0aW9uJylcbiAgICAgICAgWyB0aGlzLnNlbGVjdGlvblBvc2l0aW9uLnBvcyBdO1xuXG4gICAgICBhY3RpdmVFbC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblxuICAgICAgdGhpcy5tb2RlbC52YWx1ZSA9IGFjdGl2ZUVsLmdldEF0dHJpYnV0ZSgnZGF0YS12YWx1ZScpO1xuXG4gICAgICB0aGlzLnNhZmVseVNldEVsZW1lbnRWYWx1ZSgpO1xuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgLCBzYWZlbHlTZXRFbGVtZW50VmFsdWU6IGZ1bmN0aW9uKCl7XG4gICAgICBpZiAoIHRoaXMuZWwudmFsdWUgIT0gdGhpcy5tb2RlbC52YWwoKSApe1xuICAgICAgICB0aGlzLmVsLnZhbHVlID0gdGhpcy5tb2RlbC52YWwoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICwgaXNTaG93aW5nOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuICF0aGlzLnBvcG92ZXJFbC5jbGFzc0xpc3QuY29udGFpbnMoJ2hpZGUnKTtcbiAgICB9XG5cbiAgLCBoaWRlOiBmdW5jdGlvbigpe1xuICAgICAgdGhpcy5wb3BvdmVyRWwuY2xhc3NMaXN0LmFkZCgnaGlkZScpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICwgc2hvdzogZnVuY3Rpb24oKXtcbiAgICAgIHRoaXMucG9wb3ZlckVsLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGUnKTtcbiAgICAgIGNvbnNvbGUubG9nKCdzaG93aW5nICcsIHRoaXMuZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXZhcmlhbnQnKSApO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICwgY3Vyc29yVG9FbmQ6IGZ1bmN0aW9uKCl7XG4gICAgICB0aGlzLmVsLnNlbGVjdGlvblN0YXJ0ID0gdGhpcy5lbC5zZWxlY3Rpb25FbmQgPSB0aGlzLmVsLnZhbHVlLmxlbmd0aDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAsIG9uSW5wdXRLZXl1cDogZnVuY3Rpb24oIGUgKXtcbiAgICAgIHRoaXMubW9kZWwudmFsKCBlLnRhcmdldC52YWx1ZSApO1xuXG4gICAgICBpZiAoIGUua2V5Q29kZSA9PT0gMTMgKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGlkZSgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIHRoaXMuaXNTaG93aW5nKCkgKXtcbiAgICAgICAgdmFyIGRpcmVjdGlvbiA9IHV0aWxzLnBhcnNlRGlyZWN0aW9uYWxLZXlFdmVudCggZSApO1xuXG4gICAgICAgIGlmICggZGlyZWN0aW9uICl7XG4gICAgICAgICAgdGhpcy5zZWxlY3Rpb25Qb3NpdGlvblsgZGlyZWN0aW9uIF0oKTtcblxuICAgICAgICAgIGlmICggZGlyZWN0aW9uID09PSAndXAnICl7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCB0aGlzLmN1cnNvclRvRW5kLmJpbmQoIHRoaXMgKSwgMSApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIHRoaXMubW9kZWwudmFsKCkubGVuZ3RoICl7XG4gICAgICAgIGlmICggIXRoaXMuaXNTaG93aW5nKCkgKXtcbiAgICAgICAgICBzZXRUaW1lb3V0KCB0aGlzLnNob3cuYmluZCggdGhpcyApLCAxMDAgKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICggdGhpcy5pc1Nob3dpbmcoKSApIHtcbiAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICwgb25QcmVkaWN0aW9uQ2xpY2s6IGZ1bmN0aW9uKCBlICl7XG4gICAgICB0aGlzLm1vZGVsLnZhbCggZS50YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLXZhbHVlJykgKTtcbiAgICAgIHRoaXMuc2FmZWx5U2V0RWxlbWVudFZhbHVlKCk7XG4gICAgfVxuXG4gICwgb25QcmVkaWN0aW9uQ2xpY2tEZWxlZ2F0aW9uOiBmdW5jdGlvbiggZSApe1xuICAgICAgdmFyIGZvdW5kRWwgPSBmYWxzZTtcbiAgICAgIHZhciBNQVhfSVRFUkFUSU9OUyA9IDA7XG5cbiAgICAgIC8vIEFsd2F5cyBzdG9wIGF0IHRoZSBib2R5IGVsZW1lbnQsIG9yID4gNSBpdGVyYXRpb25zXG4gICAgICB3aGlsZSAoICFlLnRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ2dwbGFjZXMtcG9wb3Zlci1ib2R5JykgKXtcbiAgICAgICAgaWYgKCArK01BWF9JVEVSQVRJT05TID4gNSApIGJyZWFrO1xuXG4gICAgICAgIGUudGFyZ2V0ID0gZS50YXJnZXQucGFyZW50RWxlbWVudDtcblxuICAgICAgICBpZiAoIGUudGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnZ3BsYWNlcy1wcmVkaWN0aW9uJykgKXtcbiAgICAgICAgICBmb3VuZEVsID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoICFmb3VuZEVsICkgcmV0dXJuIHRydWU7XG5cbiAgICAgIHRoaXMub25QcmVkaWN0aW9uQ2xpY2soIGUgKTtcbiAgICB9XG5cbiAgLCBvbkJvZHlDbGljazogZnVuY3Rpb24oIGUgKXtcbiAgICAgIHZhciBzaG91bGRDbG9zZSA9IHV0aWxzLmlzT3V0c2lkZU9mKCB0aGlzLnBvcG92ZXJFbCwgdGhpcy5lbCApO1xuXG4gICAgICBpZiAoIHNob3VsZENsb3NlKCBlLnRhcmdldCApICl7XG4gICAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfSkuaW5pdCgpO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCBkYXRhICl7XG4gIHZhciBtZXNzYWdlID0gZGF0YS5tZXNzYWdlIHx8ICdUaGVyZSB3YXMgYW4gZXJyb3Igd2l0aCB0aGUgcmVxdWVzdCc7XG5cbiAgcmV0dXJuIFtcbiAgICAnPGRpdiBjbGFzcz1cImVycm9yXCI+JyArIG1lc3NhZ2UgKyAnPC9kaXY+J1xuICBdLmpvaW4oJ1xcbicpO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCBjb2RlICl7XG4gIHZhciBwcm90byA9IGNvZGUgaW4gbW9kdWxlLmV4cG9ydHMuZXJyb3JzID9cbiAgICAgIG1vZHVsZS5leHBvcnRzLmVycm9yc1sgY29kZSBdIDpcbiAgICAgIG1vZHVsZS5leHBvcnRzLmVycm9ycy5VTktOT1dOO1xuXG4gIHZhciBlcnJvciA9IG5ldyBFcnJvciggcHJvdG8ubWVzc2FnZSApO1xuICBlcnJvci5jb2RlID0gcHJvdG8uY29kZTtcblxuICByZXR1cm4gZXJyb3I7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5lcnJvcnMgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMuZXJyb3JzLlVOS05PV04gPSB7XG4gIGNvZGU6ICdVTktOT1dOJ1xuLCBtZXNzYWdlOiAnVGhlcmUgd2FzIGFuIGVycm9yIHdpdGggdGhlIHJlcXVlc3QnXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5lcnJvcnMuT1ZFUl9RVUVSWV9MSU1JVCA9IHtcbiAgY29kZTogJ09WRVJfUVVFUllfTElNSVQnXG4sIG1lc3NhZ2U6ICdZb3UgYXJlIG92ZXIgeW91ciBxdW90YSdcbn07XG5cbm1vZHVsZS5leHBvcnRzLmVycm9ycy5SRVFVRVNUX0RFTklFRCA9IHtcbiAgY29kZTogJ1JFUVVFU1RfREVOSUVEJ1xuLCBtZXNzYWdlOiAnUmVxdWVzdCB3YXMgZGVuaWVkLiBQZXJoYXBzIGNoZWNrIHlvdXIgYXBpIGtleT8nXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5lcnJvcnMuSU5WQUxJRF9SRVFVRVNUID0ge1xuICBjb2RlOiAnSU5WQUxJRF9SRVFVRVNUJ1xuLCBtZXNzYWdlOiAnSW52YWxpZCByZXF1ZXN0LiBQZXJoYXBzIHlvdVxcJ3JlIG1pc3NpbmcgdGhlIGlucHV0IHBhcmFtPydcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggbWFrZVJlcXVlc3QsIG9wdGlvbnMgKXtcbiAgbW9kdWxlLmV4cG9ydHMubWFrZVJlcXVlc3QgPSBtYWtlUmVxdWVzdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzLm1ha2VSZXF1ZXN0ID0gZnVuY3Rpb24oKXtcbiAgY29uc29sZS53YXJuKCdEaWQgbm90IGltcGxlbWVudCBodHRwIGZ1bmN0aW9uJyk7XG4gIGNvbnNvbGUud2FybignVXNlIHNvbWV0aGluZyBsaWtlOicpO1xuICBjb25zb2xlLndhcm4oJyAgZ3BsYWNlcy5odHRwKCBmdW5jdGlvbiggaW5wdXQsIGNhbGxiYWNrICl7Jyk7XG4gIGNvbnNvbGUud2FybihcIiAgICByZXF1ZXN0LmdldCgnL215LWFwaS9lbmRwb2ludCcpXCIpO1xuICBjb25zb2xlLndhcm4oXCIgICAgICAucXVlcnkoeyBpbnB1dDogaW5wdXQgfSlcIik7XG4gIGNvbnNvbGUud2FybihcIiAgICAgIC5lbmQoIGNhbGxiYWNrIClcIik7XG4gIGNvbnNvbGUud2FybignICB9Jyk7XG5cbiAgdGhyb3cgbmV3IEVycm9yKCdNdXN0IGltcGxlbWVudCBodHRwIGZ1bmN0aW9uYWxpdHkgY2FsbGluZyBncGxhY2VzLmh0dHAoIGNhbGxiYWNrICknKTtcbn07IiwidmFyIGFwaSA9IHJlcXVpcmUoJy4vaHR0cCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCBvbkNoYW5nZSApe1xuICByZXR1cm4gT2JqZWN0LmNyZWF0ZSh7XG4gICAgdmFsOiBmdW5jdGlvbiggc3RyICl7XG4gICAgICBpZiAoIHN0ciA9PT0gdW5kZWZpbmVkICkgcmV0dXJuIHRoaXMudmFsdWU7XG5cbiAgICAgIGlmICggc3RyID09PSB0aGlzLnZhbHVlICkgcmV0dXJuIHRoaXM7XG5cbiAgICAgIHRoaXMudmFsdWUgPSBzdHI7XG5cbiAgICAgIG9uQ2hhbmdlKCk7XG5cbiAgICAgIGlmICggWyBudWxsLCAnJyBdLmluZGV4T2YoIHN0ciApID09PSAtMSApe1xuICAgICAgICB0aGlzLm1ha2VSZXF1ZXN0KCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbiAgLCBtYWtlUmVxdWVzdDogZnVuY3Rpb24oKXtcbiAgICAgIGFwaS5tYWtlUmVxdWVzdCggdGhpcy52YWwoKSwgZnVuY3Rpb24oIGVycm9yLCByZXMgKXtcbiAgICAgICAgaWYgKCBlcnJvciApIHJldHVybiBvbkNoYW5nZSggZXJyb3IgKTtcblxuICAgICAgICBpZiAoIHJlcy5ib2R5ICl7XG4gICAgICAgICAgcmV0dXJuIG9uQ2hhbmdlKCBudWxsLCByZXMuYm9keSApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29uc3VtZXIgcGFyc2VkIHRoZSBib2R5IGZyb20gdGhlIHJlc3BvbnNlIGFscmVhZHlcbiAgICAgICAgaWYgKCBBcnJheS5pc0FycmF5KCByZXMucHJlZGljdGlvbnMgKSApe1xuICAgICAgICAgIHJldHVybiBvbkNoYW5nZSggbnVsbCwgcmVzICk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKXt9OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oIHByZWRpY3Rpb24gKXtcbiAgdmFyIGlubmVyVGV4dCA9ICcnO1xuICB2YXIgYmVnaW5uaW5nT2ZNYXRjaCA9IGZhbHNlO1xuICB2YXIgZW5kT2ZNYXRjaCA9IGZhbHNlO1xuICB2YXIgbWF0Y2g7XG4gIHZhciBjO1xuXG4gIGZvciAoIHZhciBpID0gMCwgbCA9IHByZWRpY3Rpb24uZGVzY3JpcHRpb24ubGVuZ3RoLCBpaSwgbGw7IGkgPCBsOyBpKysgKXtcbiAgICBjID0gcHJlZGljdGlvbi5kZXNjcmlwdGlvbltpXTtcblxuICAgIGJlZ2lubmluZ09mTWF0Y2ggPSBmYWxzZTtcbiAgICBlbmRPZk1hdGNoID0gZmFsc2U7XG5cbiAgICBmb3IgKCBpaSA9IDAsIGxsID0gcHJlZGljdGlvbi5tYXRjaGVkX3N1YnN0cmluZ3MubGVuZ3RoOyBpaSA8IGxsOyBpaSsrICl7XG4gICAgICBtYXRjaCA9IHByZWRpY3Rpb24ubWF0Y2hlZF9zdWJzdHJpbmdzWyBpaSBdO1xuXG4gICAgICBpZiAoIG1hdGNoLm9mZnNldCA9PT0gaSApe1xuICAgICAgICBiZWdpbm5pbmdPZk1hdGNoID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmICggKG1hdGNoLm9mZnNldCArIG1hdGNoLmxlbmd0aCkgPT09IGkgKXtcbiAgICAgICAgZW5kT2ZNYXRjaCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICggYmVnaW5uaW5nT2ZNYXRjaCApe1xuICAgICAgaW5uZXJUZXh0ICs9ICc8c3BhbiBjbGFzcz1cImhpZ2hsaWdodFwiPicgKyBjO1xuICAgIH0gZWxzZSBpZiAoIGVuZE9mTWF0Y2ggKXtcbiAgICAgIGlubmVyVGV4dCArPSBjICsgJzwvc3Bhbj4nO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbm5lclRleHQgKz0gYztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gW1xuICAgICc8ZGl2IGNsYXNzPVwiZ3BsYWNlcy1wb3BvdmVyLWl0ZW0gZ3BsYWNlcy1wcmVkaWN0aW9uXCIgZGF0YS12YWx1ZT1cIicgKyBwcmVkaWN0aW9uLmRlc2NyaXB0aW9uICsgJ1wiPidcbiAgLCBpbm5lclRleHRcbiAgLCAnPC9kaXY+J1xuICBdLmpvaW4oJ1xcbicpO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCBsZW5ndGgsIGNoYW5nZSApe1xuICBjaGFuZ2UgPSBjaGFuZ2UgfHwgZnVuY3Rpb24oKXt9O1xuXG4gIHJldHVybiBPYmplY3QuY3JlYXRlKHtcbiAgICBsZW5ndGg6IGxlbmd0aCB8fCAwXG5cbiAgLCBwb3M6IC0xXG5cbiAgLCB1cDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiB0aGlzLnNldCggdGhpcy5wb3MgLSAxICk7XG4gICAgfVxuXG4gICwgZG93bjogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiB0aGlzLnNldCggdGhpcy5wb3MgKyAxICk7XG4gICAgfVxuXG4gICwgc2V0OiBmdW5jdGlvbiggcG9zICl7XG4gICAgICBpZiAoIHBvcyA9PT0gdGhpcy5wb3MgKSByZXR1cm4gdGhpcztcbiAgICAgIHRoaXMucG9zID0gTWF0aC5tYXgoIC0xLCBNYXRoLm1pbiggcG9zLCB0aGlzLmxlbmd0aCAtIDEgKSApO1xuICAgICAgY2hhbmdlKCB0aGlzLnBvcyApO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9KTtcbn07IiwibW9kdWxlLmV4cG9ydHMuZGVmYXVsdHMgPSBmdW5jdGlvbiggYSwgYiApe1xuICBmb3IgKCB2YXIga2V5IGluIGIgKVxuICAgIGlmICggISgga2V5IGluIGEgKSApIGFbIGtleSBdID0gYlsga2V5IF07XG4gIHJldHVybiBhO1xufTtcblxubW9kdWxlLmV4cG9ydHMubWl4aW4gPSBmdW5jdGlvbiggYSApe1xuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKCBhcmd1bWVudHMsIDEgKTtcbiAgdmFyIGIsIGtleTtcblxuICB3aGlsZSAoIGFyZ3MubGVuZ3RoICl7XG4gICAgYiA9IGFyZ3MucG9wKCk7XG5cbiAgICBmb3IgKCBrZXkgaW4gYiApe1xuICAgICAgYVsga2V5IF0gPSBiWyBrZXkgXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmlzT3V0c2lkZU9mID0gZnVuY3Rpb24oKXtcbiAgdmFyIHdoYXQgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCggYXJndW1lbnRzICk7XG5cbiAgdmFyIGlzT3V0c2lkZSA9IGZ1bmN0aW9uKCBlbCApe1xuICAgIGlmICggd2hhdC5pbmRleE9mKCBlbCApID4gLTEgKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCBlbCA9PT0gbnVsbCApIHJldHVybiB0cnVlO1xuICAgIHJldHVybiBpc091dHNpZGUoIGVsLnBhcmVudEVsZW1lbnQgKTtcbiAgfTtcblxuICByZXR1cm4gaXNPdXRzaWRlO1xufTtcblxubW9kdWxlLmV4cG9ydHMucGFyc2VEaXJlY3Rpb25hbEtleUV2ZW50ID0gZnVuY3Rpb24oIGUgKXtcbiAgaWYgKCAhZS5rZXlDb2RlICkgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuICh7XG4gICAgMzg6ICd1cCdcbiAgLCA0MDogJ2Rvd24nXG4gIH0pWyBlLmtleUNvZGUgXSB8fCBudWxsO1xufTsiXX0=

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./lib/base-view');
module.exports.proxy = require('./lib/server');
module.exports.http = require('./lib/http');
},{"./lib/base-view":3,"./lib/http":4,"./lib/server":6}],2:[function(require,module,exports){
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
},{"./prediction-tmpl":7}],3:[function(require,module,exports){
var utils             = require('./utils');
var gplaceInput       = require('./input-model');
var selectionPosition = require('./selection-position-model');

module.exports = function( el, options ){
  return Object.create({
    el: el
    
  , options: utils.defaults( options || {}, {
      tmpl: require('./base-tmpl')
    })
    
  , init: function(){
      this.model = gplaceInput( function( error, result ){
        if ( error ){
          if ( console ) console.log( error );
          return alert('Error!');
        }

        if ( result ){
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

      // If there's a wrapper specified, put the popover in there
      // otherwise, insert it after the input
      if ( this.options.wrapper ){
        this.options.wrapper.appendChild( this.popoverEl );
      } else {
        this.el.parentNode.insertBefore( this.popoverEl, this.el.nextSibling );
      }
    
      this.el.addEventListener( 'keyup', this.onInputKeyup.bind( this ) );

      // Delegate clicks to predictions
      this.popoverEl.addEventListener( 'click', this.onPredictionClickDelegation.bind( this ) );

      document.addEventListener( 'click', this.onBodyClick.bind( this ) );
    
      return this;
    }
    
  , render: function( result ){
      if ( result ){
        this.popoverEl.innerHTML = this.options.tmpl( result );

        if ( result.predictions.length === 1 ){
          this.hide();
        }
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
      console.log('hide!');
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
  }).init();
};
},{"./base-tmpl":2,"./input-model":5,"./selection-position-model":8,"./utils":9}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
var api = require('./http');

module.exports = function( onChange ){
  return Object.create({
    val: function( str ){
      if ( str === undefined ) return this.value;

      if ( str === this.value ) return this;

      this.value = str;

      onChange();

      this.makeRequest();
      
      return this;
    }
    
  , makeRequest: function(){
      api.makeRequest( this.val(), function( error, res ){
        if ( error ) return onChange( error );
        return onChange( null, res.body );
      });
    }
  });
};
},{"./http":4}],6:[function(require,module,exports){
module.exports = function(){};
},{}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9iYXNlLXRtcGwuanMiLCJsaWIvYmFzZS12aWV3LmpzIiwibGliL2h0dHAuanMiLCJsaWIvaW5wdXQtbW9kZWwuanMiLCJsaWIvbm9vcC5qcyIsImxpYi9wcmVkaWN0aW9uLXRtcGwuanMiLCJsaWIvc2VsZWN0aW9uLXBvc2l0aW9uLW1vZGVsLmpzIiwibGliL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvYmFzZS12aWV3Jyk7XG5tb2R1bGUuZXhwb3J0cy5wcm94eSA9IHJlcXVpcmUoJy4vbGliL3NlcnZlcicpO1xubW9kdWxlLmV4cG9ydHMuaHR0cCA9IHJlcXVpcmUoJy4vbGliL2h0dHAnKTsiLCJ2YXIgcHJlZGljdGlvblRtcGwgPSByZXF1aXJlKCcuL3ByZWRpY3Rpb24tdG1wbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCBkYXRhICl7XG4gIHJldHVybiBbXG4gICAgJzxkaXYgY2xhc3M9XCJncGxhY2VzLXBvcG92ZXItYm9keVwiPidcbiAgLCBkYXRhLnByZWRpY3Rpb25zLm1hcCggZnVuY3Rpb24oIHByZWRpY3Rpb24gKXtcbiAgICAgIHJldHVybiBwcmVkaWN0aW9uVG1wbCggcHJlZGljdGlvbiApO1xuICAgIH0pLmpvaW4oJ1xcbicpXG4gICwgJyAgPGRpdiBjbGFzcz1cImdvb2dsZS1sb2dvXCI+PC9kaXY+J1xuICAsICc8L2Rpdj4nXG4gIF0uam9pbignXFxuJyk7XG59OyIsInZhciB1dGlscyAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBncGxhY2VJbnB1dCAgICAgICA9IHJlcXVpcmUoJy4vaW5wdXQtbW9kZWwnKTtcbnZhciBzZWxlY3Rpb25Qb3NpdGlvbiA9IHJlcXVpcmUoJy4vc2VsZWN0aW9uLXBvc2l0aW9uLW1vZGVsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oIGVsLCBvcHRpb25zICl7XG4gIHJldHVybiBPYmplY3QuY3JlYXRlKHtcbiAgICBlbDogZWxcbiAgICBcbiAgLCBvcHRpb25zOiB1dGlscy5kZWZhdWx0cyggb3B0aW9ucyB8fCB7fSwge1xuICAgICAgdG1wbDogcmVxdWlyZSgnLi9iYXNlLXRtcGwnKVxuICAgIH0pXG4gICAgXG4gICwgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgIHRoaXMubW9kZWwgPSBncGxhY2VJbnB1dCggZnVuY3Rpb24oIGVycm9yLCByZXN1bHQgKXtcbiAgICAgICAgaWYgKCBlcnJvciApe1xuICAgICAgICAgIGlmICggY29uc29sZSApIGNvbnNvbGUubG9nKCBlcnJvciApO1xuICAgICAgICAgIHJldHVybiBhbGVydCgnRXJyb3IhJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIHJlc3VsdCApe1xuICAgICAgICAgIHRoaXMuc2VsZWN0aW9uUG9zaXRpb24gPSBzZWxlY3Rpb25Qb3NpdGlvbiggcmVzdWx0LnByZWRpY3Rpb25zLmxlbmd0aCwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyUG9zaXRpb24oKTtcbiAgICAgICAgICB9LmJpbmQoIHRoaXMgKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlbmRlciggcmVzdWx0ICk7XG4gICAgICB9LmJpbmQoIHRoaXMgKSk7XG5cbiAgICAgIHRoaXMuc2VsZWN0aW9uUG9zaXRpb24gPSBzZWxlY3Rpb25Qb3NpdGlvbigpO1xuICAgIFxuICAgICAgdGhpcy5wb3BvdmVyRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHRoaXMucG9wb3ZlckVsLmNsYXNzTGlzdC5hZGQoICdncGxhY2VzLXBvcG92ZXInLCAnaGlkZScgKTtcblxuICAgICAgaWYgKCB0aGlzLmVsLmdldEF0dHJpYnV0ZSgnZGF0YS12YXJpYW50JykgKXtcbiAgICAgICAgdGhpcy5wb3BvdmVyRWwuY2xhc3NMaXN0LmFkZC5hcHBseShcbiAgICAgICAgICB0aGlzLnBvcG92ZXJFbC5jbGFzc0xpc3RcbiAgICAgICAgLCB0aGlzLmVsLmdldEF0dHJpYnV0ZSgnZGF0YS12YXJpYW50Jykuc3BsaXQoJyAnKVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGVyZSdzIGEgd3JhcHBlciBzcGVjaWZpZWQsIHB1dCB0aGUgcG9wb3ZlciBpbiB0aGVyZVxuICAgICAgLy8gb3RoZXJ3aXNlLCBpbnNlcnQgaXQgYWZ0ZXIgdGhlIGlucHV0XG4gICAgICBpZiAoIHRoaXMub3B0aW9ucy53cmFwcGVyICl7XG4gICAgICAgIHRoaXMub3B0aW9ucy53cmFwcGVyLmFwcGVuZENoaWxkKCB0aGlzLnBvcG92ZXJFbCApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSggdGhpcy5wb3BvdmVyRWwsIHRoaXMuZWwubmV4dFNpYmxpbmcgKTtcbiAgICAgIH1cbiAgICBcbiAgICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lciggJ2tleXVwJywgdGhpcy5vbklucHV0S2V5dXAuYmluZCggdGhpcyApICk7XG5cbiAgICAgIC8vIERlbGVnYXRlIGNsaWNrcyB0byBwcmVkaWN0aW9uc1xuICAgICAgdGhpcy5wb3BvdmVyRWwuYWRkRXZlbnRMaXN0ZW5lciggJ2NsaWNrJywgdGhpcy5vblByZWRpY3Rpb25DbGlja0RlbGVnYXRpb24uYmluZCggdGhpcyApICk7XG5cbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoICdjbGljaycsIHRoaXMub25Cb2R5Q2xpY2suYmluZCggdGhpcyApICk7XG4gICAgXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgXG4gICwgcmVuZGVyOiBmdW5jdGlvbiggcmVzdWx0ICl7XG4gICAgICBpZiAoIHJlc3VsdCApe1xuICAgICAgICB0aGlzLnBvcG92ZXJFbC5pbm5lckhUTUwgPSB0aGlzLm9wdGlvbnMudG1wbCggcmVzdWx0ICk7XG5cbiAgICAgICAgaWYgKCByZXN1bHQucHJlZGljdGlvbnMubGVuZ3RoID09PSAxICl7XG4gICAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5yZW5kZXJQb3NpdGlvbigpO1xuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgLCByZW5kZXJQb3NpdGlvbjogZnVuY3Rpb24oKXtcbiAgICAgIGlmICggdGhpcy5zZWxlY3Rpb25Qb3NpdGlvbi5wb3MgPT09IC0xICl7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICB2YXIgYWN0aXZlRWwgPSB0aGlzLnBvcG92ZXJFbC5xdWVyeVNlbGVjdG9yKCcuYWN0aXZlJyk7XG5cbiAgICAgIGlmICggYWN0aXZlRWwgKXtcbiAgICAgICAgYWN0aXZlRWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgICB9XG5cbiAgICAgIGFjdGl2ZUVsID0gdGhpcy5wb3BvdmVyRWxcbiAgICAgICAgLnF1ZXJ5U2VsZWN0b3JBbGwoJy5ncGxhY2VzLXByZWRpY3Rpb24nKVxuICAgICAgICBbIHRoaXMuc2VsZWN0aW9uUG9zaXRpb24ucG9zIF07XG5cbiAgICAgIGFjdGl2ZUVsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXG4gICAgICB0aGlzLm1vZGVsLnZhbHVlID0gYWN0aXZlRWwuZ2V0QXR0cmlidXRlKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgIHRoaXMuc2FmZWx5U2V0RWxlbWVudFZhbHVlKCk7XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAsIHNhZmVseVNldEVsZW1lbnRWYWx1ZTogZnVuY3Rpb24oKXtcbiAgICAgIGlmICggdGhpcy5lbC52YWx1ZSAhPSB0aGlzLm1vZGVsLnZhbCgpICl7XG4gICAgICAgIHRoaXMuZWwudmFsdWUgPSB0aGlzLm1vZGVsLnZhbCgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgLCBpc1Nob3dpbmc6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gIXRoaXMucG9wb3ZlckVsLmNsYXNzTGlzdC5jb250YWlucygnaGlkZScpO1xuICAgIH1cblxuICAsIGhpZGU6IGZ1bmN0aW9uKCl7XG4gICAgICBjb25zb2xlLmxvZygnaGlkZSEnKTtcbiAgICAgIHRoaXMucG9wb3ZlckVsLmNsYXNzTGlzdC5hZGQoJ2hpZGUnKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAsIHNob3c6IGZ1bmN0aW9uKCl7XG4gICAgICB0aGlzLnBvcG92ZXJFbC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRlJyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgLCBjdXJzb3JUb0VuZDogZnVuY3Rpb24oKXtcbiAgICAgIHRoaXMuZWwuc2VsZWN0aW9uU3RhcnQgPSB0aGlzLmVsLnNlbGVjdGlvbkVuZCA9IHRoaXMuZWwudmFsdWUubGVuZ3RoO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICwgb25JbnB1dEtleXVwOiBmdW5jdGlvbiggZSApe1xuICAgICAgdGhpcy5tb2RlbC52YWwoIGUudGFyZ2V0LnZhbHVlICk7XG5cbiAgICAgIGlmICggZS5rZXlDb2RlID09PSAxMyApe1xuICAgICAgICByZXR1cm4gdGhpcy5oaWRlKCk7XG4gICAgICB9XG5cbiAgICAgIGlmICggdGhpcy5pc1Nob3dpbmcoKSApe1xuICAgICAgICB2YXIgZGlyZWN0aW9uID0gdXRpbHMucGFyc2VEaXJlY3Rpb25hbEtleUV2ZW50KCBlICk7XG5cbiAgICAgICAgaWYgKCBkaXJlY3Rpb24gKXtcbiAgICAgICAgICB0aGlzLnNlbGVjdGlvblBvc2l0aW9uWyBkaXJlY3Rpb24gXSgpO1xuXG4gICAgICAgICAgaWYgKCBkaXJlY3Rpb24gPT09ICd1cCcgKXtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoIHRoaXMuY3Vyc29yVG9FbmQuYmluZCggdGhpcyApLCAxICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICggdGhpcy5tb2RlbC52YWwoKS5sZW5ndGggKXtcbiAgICAgICAgaWYgKCAhdGhpcy5pc1Nob3dpbmcoKSApe1xuICAgICAgICAgIHNldFRpbWVvdXQoIHRoaXMuc2hvdy5iaW5kKCB0aGlzICksIDEwMCApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCB0aGlzLmlzU2hvd2luZygpICkge1xuICAgICAgICB0aGlzLmhpZGUoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgLCBvblByZWRpY3Rpb25DbGljazogZnVuY3Rpb24oIGUgKXtcbiAgICAgIHRoaXMubW9kZWwudmFsKCBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdmFsdWUnKSApO1xuICAgICAgdGhpcy5zYWZlbHlTZXRFbGVtZW50VmFsdWUoKTtcbiAgICB9XG5cbiAgLCBvblByZWRpY3Rpb25DbGlja0RlbGVnYXRpb246IGZ1bmN0aW9uKCBlICl7XG4gICAgICB2YXIgZm91bmRFbCA9IGZhbHNlO1xuICAgICAgdmFyIE1BWF9JVEVSQVRJT05TID0gMDtcblxuICAgICAgLy8gQWx3YXlzIHN0b3AgYXQgdGhlIGJvZHkgZWxlbWVudCwgb3IgPiA1IGl0ZXJhdGlvbnNcbiAgICAgIHdoaWxlICggIWUudGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnZ3BsYWNlcy1wb3BvdmVyLWJvZHknKSApe1xuICAgICAgICBpZiAoICsrTUFYX0lURVJBVElPTlMgPiA1ICkgYnJlYWs7XG5cbiAgICAgICAgZS50YXJnZXQgPSBlLnRhcmdldC5wYXJlbnRFbGVtZW50O1xuXG4gICAgICAgIGlmICggZS50YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdncGxhY2VzLXByZWRpY3Rpb24nKSApe1xuICAgICAgICAgIGZvdW5kRWwgPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICggIWZvdW5kRWwgKSByZXR1cm4gdHJ1ZTtcblxuICAgICAgdGhpcy5vblByZWRpY3Rpb25DbGljayggZSApO1xuICAgIH1cblxuICAsIG9uQm9keUNsaWNrOiBmdW5jdGlvbiggZSApe1xuICAgICAgdmFyIHNob3VsZENsb3NlID0gdXRpbHMuaXNPdXRzaWRlT2YoIHRoaXMucG9wb3ZlckVsLCB0aGlzLmVsICk7XG5cbiAgICAgIGlmICggc2hvdWxkQ2xvc2UoIGUudGFyZ2V0ICkgKXtcbiAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICB9XG4gICAgfVxuICB9KS5pbml0KCk7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oIG1ha2VSZXF1ZXN0LCBvcHRpb25zICl7XG4gIG1vZHVsZS5leHBvcnRzLm1ha2VSZXF1ZXN0ID0gbWFrZVJlcXVlc3Q7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5tYWtlUmVxdWVzdCA9IGZ1bmN0aW9uKCl7XG4gIGNvbnNvbGUud2FybignRGlkIG5vdCBpbXBsZW1lbnQgaHR0cCBmdW5jdGlvbicpO1xuICBjb25zb2xlLndhcm4oJ1VzZSBzb21ldGhpbmcgbGlrZTonKTtcbiAgY29uc29sZS53YXJuKCcgIGdwbGFjZXMuaHR0cCggZnVuY3Rpb24oIGlucHV0LCBjYWxsYmFjayApeycpO1xuICBjb25zb2xlLndhcm4oXCIgICAgcmVxdWVzdC5nZXQoJy9teS1hcGkvZW5kcG9pbnQnKVwiKTtcbiAgY29uc29sZS53YXJuKFwiICAgICAgLnF1ZXJ5KHsgaW5wdXQ6IGlucHV0IH0pXCIpO1xuICBjb25zb2xlLndhcm4oXCIgICAgICAuZW5kKCBjYWxsYmFjayApXCIpO1xuICBjb25zb2xlLndhcm4oJyAgfScpO1xuXG4gIHRocm93IG5ldyBFcnJvcignTXVzdCBpbXBsZW1lbnQgaHR0cCBmdW5jdGlvbmFsaXR5IGNhbGxpbmcgZ3BsYWNlcy5odHRwKCBjYWxsYmFjayApJyk7XG59OyIsInZhciBhcGkgPSByZXF1aXJlKCcuL2h0dHAnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggb25DaGFuZ2UgKXtcbiAgcmV0dXJuIE9iamVjdC5jcmVhdGUoe1xuICAgIHZhbDogZnVuY3Rpb24oIHN0ciApe1xuICAgICAgaWYgKCBzdHIgPT09IHVuZGVmaW5lZCApIHJldHVybiB0aGlzLnZhbHVlO1xuXG4gICAgICBpZiAoIHN0ciA9PT0gdGhpcy52YWx1ZSApIHJldHVybiB0aGlzO1xuXG4gICAgICB0aGlzLnZhbHVlID0gc3RyO1xuXG4gICAgICBvbkNoYW5nZSgpO1xuXG4gICAgICB0aGlzLm1ha2VSZXF1ZXN0KCk7XG4gICAgICBcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbiAgLCBtYWtlUmVxdWVzdDogZnVuY3Rpb24oKXtcbiAgICAgIGFwaS5tYWtlUmVxdWVzdCggdGhpcy52YWwoKSwgZnVuY3Rpb24oIGVycm9yLCByZXMgKXtcbiAgICAgICAgaWYgKCBlcnJvciApIHJldHVybiBvbkNoYW5nZSggZXJyb3IgKTtcbiAgICAgICAgcmV0dXJuIG9uQ2hhbmdlKCBudWxsLCByZXMuYm9keSApO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpe307IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiggcHJlZGljdGlvbiApe1xuICB2YXIgaW5uZXJUZXh0ID0gJyc7XG4gIHZhciBiZWdpbm5pbmdPZk1hdGNoID0gZmFsc2U7XG4gIHZhciBlbmRPZk1hdGNoID0gZmFsc2U7XG4gIHZhciBtYXRjaDtcbiAgdmFyIGM7XG5cbiAgZm9yICggdmFyIGkgPSAwLCBsID0gcHJlZGljdGlvbi5kZXNjcmlwdGlvbi5sZW5ndGgsIGlpLCBsbDsgaSA8IGw7IGkrKyApe1xuICAgIGMgPSBwcmVkaWN0aW9uLmRlc2NyaXB0aW9uW2ldO1xuXG4gICAgYmVnaW5uaW5nT2ZNYXRjaCA9IGZhbHNlO1xuICAgIGVuZE9mTWF0Y2ggPSBmYWxzZTtcblxuICAgIGZvciAoIGlpID0gMCwgbGwgPSBwcmVkaWN0aW9uLm1hdGNoZWRfc3Vic3RyaW5ncy5sZW5ndGg7IGlpIDwgbGw7IGlpKysgKXtcbiAgICAgIG1hdGNoID0gcHJlZGljdGlvbi5tYXRjaGVkX3N1YnN0cmluZ3NbIGlpIF07XG5cbiAgICAgIGlmICggbWF0Y2gub2Zmc2V0ID09PSBpICl7XG4gICAgICAgIGJlZ2lubmluZ09mTWF0Y2ggPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYgKCAobWF0Y2gub2Zmc2V0ICsgbWF0Y2gubGVuZ3RoKSA9PT0gaSApe1xuICAgICAgICBlbmRPZk1hdGNoID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCBiZWdpbm5pbmdPZk1hdGNoICl7XG4gICAgICBpbm5lclRleHQgKz0gJzxzcGFuIGNsYXNzPVwiaGlnaGxpZ2h0XCI+JyArIGM7XG4gICAgfSBlbHNlIGlmICggZW5kT2ZNYXRjaCApe1xuICAgICAgaW5uZXJUZXh0ICs9IGMgKyAnPC9zcGFuPic7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlubmVyVGV4dCArPSBjO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbXG4gICAgJzxkaXYgY2xhc3M9XCJncGxhY2VzLXBvcG92ZXItaXRlbSBncGxhY2VzLXByZWRpY3Rpb25cIiBkYXRhLXZhbHVlPVwiJyArIHByZWRpY3Rpb24uZGVzY3JpcHRpb24gKyAnXCI+J1xuICAsIGlubmVyVGV4dFxuICAsICc8L2Rpdj4nXG4gIF0uam9pbignXFxuJyk7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oIGxlbmd0aCwgY2hhbmdlICl7XG4gIGNoYW5nZSA9IGNoYW5nZSB8fCBmdW5jdGlvbigpe307XG5cbiAgcmV0dXJuIE9iamVjdC5jcmVhdGUoe1xuICAgIGxlbmd0aDogbGVuZ3RoIHx8IDBcblxuICAsIHBvczogLTFcblxuICAsIHVwOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuc2V0KCB0aGlzLnBvcyAtIDEgKTtcbiAgICB9XG5cbiAgLCBkb3duOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuc2V0KCB0aGlzLnBvcyArIDEgKTtcbiAgICB9XG5cbiAgLCBzZXQ6IGZ1bmN0aW9uKCBwb3MgKXtcbiAgICAgIGlmICggcG9zID09PSB0aGlzLnBvcyApIHJldHVybiB0aGlzO1xuICAgICAgdGhpcy5wb3MgPSBNYXRoLm1heCggLTEsIE1hdGgubWluKCBwb3MsIHRoaXMubGVuZ3RoIC0gMSApICk7XG4gICAgICBjaGFuZ2UoIHRoaXMucG9zICk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH0pO1xufTsiLCJtb2R1bGUuZXhwb3J0cy5kZWZhdWx0cyA9IGZ1bmN0aW9uKCBhLCBiICl7XG4gIGZvciAoIHZhciBrZXkgaW4gYiApXG4gICAgaWYgKCAhKCBrZXkgaW4gYSApICkgYVsga2V5IF0gPSBiWyBrZXkgXTtcbiAgcmV0dXJuIGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5taXhpbiA9IGZ1bmN0aW9uKCBhICl7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoIGFyZ3VtZW50cywgMSApO1xuICB2YXIgYiwga2V5O1xuXG4gIHdoaWxlICggYXJncy5sZW5ndGggKXtcbiAgICBiID0gYXJncy5wb3AoKTtcblxuICAgIGZvciAoIGtleSBpbiBiICl7XG4gICAgICBhWyBrZXkgXSA9IGJbIGtleSBdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhO1xufTtcblxubW9kdWxlLmV4cG9ydHMuaXNPdXRzaWRlT2YgPSBmdW5jdGlvbigpe1xuICB2YXIgd2hhdCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKCBhcmd1bWVudHMgKTtcblxuICB2YXIgaXNPdXRzaWRlID0gZnVuY3Rpb24oIGVsICl7XG4gICAgaWYgKCB3aGF0LmluZGV4T2YoIGVsICkgPiAtMSApIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIGVsID09PSBudWxsICkgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGlzT3V0c2lkZSggZWwucGFyZW50RWxlbWVudCApO1xuICB9O1xuXG4gIHJldHVybiBpc091dHNpZGU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wYXJzZURpcmVjdGlvbmFsS2V5RXZlbnQgPSBmdW5jdGlvbiggZSApe1xuICBpZiAoICFlLmtleUNvZGUgKSByZXR1cm4gbnVsbDtcblxuICByZXR1cm4gKHtcbiAgICAzODogJ3VwJ1xuICAsIDQwOiAnZG93bidcbiAgfSlbIGUua2V5Q29kZSBdIHx8IG51bGw7XG59OyJdfQ==

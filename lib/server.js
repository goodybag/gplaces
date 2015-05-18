var https = require('https');
var qs = require('querystring');

var defaults = {
  baseUrl: 'https://maps.googleapis.com/maps/api/place/autocomplete/json?'
, optionsToQueryString: ['key']
};

module.exports = function( options ){
  options = options || {};

  for ( var key in defaults ){
    if ( !(key in options) ){
      options[ key ] = defaults[ key ];
    }
  }

  if ( !options.key ){
    throw new Error('Must provide Google Places Autocomplete API key');
  }

  return function( req, res ){
    res.header( 'Content-Type', 'application/json' );

    // Copy some properties from options (mainly, `key`)
    var query = options.optionsToQueryString.reduce( function( obj, key ){
      obj[ key ] = options[ key ];
      return obj;
    }, {} );

    // Copy the request query string to the new request
    for ( var key in req.query ){
      query[ key ] = req.query[ key ];
    }

    var url = options.baseUrl + qs.stringify( query );

    return https
      .get( url, function( gres ){
        gres.pipe( res );
      });
  };
};
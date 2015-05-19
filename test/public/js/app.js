var gplaces = require('../../../');
var $       = require('jquery');
var request = require('superagent');
var config  = require('../../config');

gplaces.http( function( input, callback ){
  // request
  //   .get('/api/places')
  //   .query({ input: input })
  //   .end( callback );
  $.getJSON( '/api/places?input=' + input )
    .error( callback )
    .success( callback.bind( null, null ) );
});
var gplaces = require('../../../');
var request = require('superagent');

gplaces.http( function( input, callback ){
  request
    .get('/api/places')
    .query({ input: input })
    .end( callback );
});
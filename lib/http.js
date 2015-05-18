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
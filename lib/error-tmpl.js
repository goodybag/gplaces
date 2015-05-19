module.exports = function( data ){
  var message = data.message || 'There was an error with the request';

  return [
    '<div class="error">' + message + '</div>'
  ].join('\n');
};
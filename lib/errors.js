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
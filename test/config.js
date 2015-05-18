var local = require('./config.local');

for ( var key in local ){
  module.exports[ key ] = local[ key ];
}
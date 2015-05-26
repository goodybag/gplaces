var gplaces = require('./');

if ( typeof window.define === 'function' && window.define.amd ){
  window.define( 'gplaces', function(){ return gplaces; } );
} else {
  window.gplaces = gplaces;
}
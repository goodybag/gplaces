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
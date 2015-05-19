module.exports        = require('./lib/base-view');
module.exports.proxy  = require('./lib/server');
module.exports.http   = require('./lib/http');

if ( 'document' in global ){
  document.addEventListener('DOMContentLoaded', function(){
    Array.prototype.slice
      .call( document.querySelectorAll('[data-gplaces]') )
      .map( function( el ){
        var options = {};

        options.target = document
          .querySelector( el.getAttribute('data-target') );

        if ( !options.target ){
          delete options.target;
        }

        return module.exports( el, options );
      });
  });
}
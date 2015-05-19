var api = require('./http');

module.exports = function( onChange ){
  return Object.create({
    val: function( str ){
      if ( str === undefined ) return this.value;

      if ( str === this.value ) return this;

      this.value = str;

      onChange();

      if ( [ null, '' ].indexOf( str ) === -1 ){
        this.makeRequest();
      }
      
      return this;
    }
    
  , makeRequest: function(){
      api.makeRequest( this.val(), function( error, res ){
        if ( error ) return onChange( error );

        if ( res.body ){
          return onChange( null, res.body );
        }

        // Consumer parsed the body from the response already
        if ( Array.isArray( res.predictions ) ){
          return onChange( null, res );
        }
      });
    }
  });
};
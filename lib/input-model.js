var api = require('./http');

module.exports = function( onChange ){
  return Object.create({
    val: function( str ){
      if ( str === undefined ) return this.value;

      if ( str === this.value ) return this;

      this.value = str;

      onChange();

      this.makeRequest();
      
      return this;
    }
    
  , makeRequest: function(){
      api.makeRequest( this.val(), function( error, res ){
        if ( error ) return onChange( error );
        return onChange( null, res.body );
      });
    }
  });
};
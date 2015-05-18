module.exports = function( length, change ){
  change = change || function(){};

  return Object.create({
    length: length || 0

  , pos: -1

  , up: function(){
      return this.set( this.pos - 1 );
    }

  , down: function(){
      return this.set( this.pos + 1 );
    }

  , set: function( pos ){
      if ( pos === this.pos ) return this;
      this.pos = Math.max( -1, Math.min( pos, this.length - 1 ) );
      change( this.pos );
      return this;
    }
  });
};
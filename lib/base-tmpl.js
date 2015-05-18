var predictionTmpl = require('./prediction-tmpl');

module.exports = function( data ){
  return [
    '<div class="gplaces-popover-body">'
  , data.predictions.map( function( prediction ){
      return predictionTmpl( prediction );
    }).join('\n')
  , '  <div class="google-logo"></div>'
  , '</div>'
  ].join('\n');
};
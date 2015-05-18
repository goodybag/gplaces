module.exports = function( prediction ){
  var innerText = '';
  var beginningOfMatch = false;
  var endOfMatch = false;
  var match;
  var c;

  for ( var i = 0, l = prediction.description.length, ii, ll; i < l; i++ ){
    c = prediction.description[i];

    beginningOfMatch = false;
    endOfMatch = false;

    for ( ii = 0, ll = prediction.matched_substrings.length; ii < ll; ii++ ){
      match = prediction.matched_substrings[ ii ];

      if ( match.offset === i ){
        beginningOfMatch = true;
        break;
      }

      if ( (match.offset + match.length) === i ){
        endOfMatch = true;
        break;
      }
    }

    if ( beginningOfMatch ){
      innerText += '<span class="highlight">' + c;
    } else if ( endOfMatch ){
      innerText += c + '</span>';
    } else {
      innerText += c;
    }
  }

  return [
    '<div class="gplaces-popover-item gplaces-prediction" data-value="' + prediction.description + '">'
  , innerText
  , '</div>'
  ].join('\n');
};
var fs        = require('fs');
var gulp      = require('gulp');
var pkg       = require('./package.json');
gulp.util     = require('gulp-util');

var config = {
  scripts: ['*.js', 'test/public/js/*.js', 'lib/*.js', 'test/*.js']
};

config.lint = config.scripts.concat(['test/*.js']);

gulp.task('clear-dist-dir', function(){
  fs.readdirSync('./dist').forEach( function( filename ){
    fs.unlinkSync( './dist/' + filename );
  });
});

gulp.task( 'build-dist', ['lint', 'clear-dist-dir'], function(){
  return require('browserify')({
      debug: true
    })
    .add('./standalone-build.js')
    .bundle()
    .pipe( fs.createWriteStream('./dist/gplaces.js') );
});

gulp.task( 'minify-dist', ['clear-dist-dir', 'build-dist'], function(){
  return gulp.src('./dist/gplaces.js')
    .pipe( require('gulp-uglify')() )
    .pipe( require('gulp-concat')('gplaces.min.js') )
    .pipe( gulp.dest('./dist') );
});

gulp.task( 'scripts', function(){
  return require('browserify')({
      debug: true
    })
    .add('./test/public/js/app.js')
    .bundle()
    .pipe( fs.createWriteStream('./test/public/dist/app.js') );
});

gulp.task( 'less', function(){
  return gulp.src('less/app.less')
    .pipe( require('gulp-less')() )
    .pipe( require('gulp-autoprefixer')() )
    .pipe( gulp.dest('test/public/dist') );
});

gulp.task( 'less-dist', ['clear-dist-dir'], function(){
  return gulp.src('less/components/gplaces.less')
    .pipe( require('gulp-less')() )
    .pipe( require('gulp-autoprefixer')() )
    .pipe( gulp.dest('./dist') );
});

gulp.task( 'lint', function(){
  return gulp.src( config.lint )
    .pipe( require('gulp-jshint')({
      "laxcomma": true,
      "sub": true,
      "globals": {
        "console": true,
        "module": true
      }
    }))
    .pipe( require('gulp-jshint').reporter('jshint-stylish') );
});

gulp.task( 'server', function( done ){
  var PORT = 3020;
  require('./test/server').listen( PORT, function( error ){
    if ( error ) return done( error );

    gulp.util.log( 'Server started on port ' + gulp.util.colors.blue( PORT ) );

    done();
  });
});

gulp.task( 'watch', function(){
  gulp.watch( config.lint, ['lint'] );
  gulp.watch( config.scripts, ['scripts'] );
  gulp.watch( ['less/*.less', 'less/**/*.less'], ['less'] );
});

gulp.task( 'dist', [ 'lint', 'clear-dist-dir', 'less-dist', 'build-dist', 'minify-dist' ] );
gulp.task( 'build', [ 'less', 'lint', 'scripts' ] );
gulp.task( 'default', [ 'build', 'server', 'watch' ] );
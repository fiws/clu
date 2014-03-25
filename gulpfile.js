var gulp = require('gulp');

gulp.task('lint', function(){
	var jshint = require('gulp-jshint');
	var stylish = require('jshint-stylish');

	gulp.src(['./lib/*.js', './*.js'])
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('mocha', function(){
	var mocha = require('gulp-mocha');
    gulp.src('./test/*.js')
        .pipe(mocha({reporter: 'spec'}));
});

gulp.task('test', ['lint', 'mocha']);
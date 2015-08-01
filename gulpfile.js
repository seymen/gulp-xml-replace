var gulp = require('gulp');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');

gulp.task('jshint', function() {
	return gulp.src(['./source/*.js', './test/*.js', './test/**/*.js'])
		.pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('test', ['jshint'], function (cb) {
	gulp.src(['./source/*.js'])
		.pipe(istanbul())
		.pipe(istanbul.hookRequire()) 
		.on('finish', function () {
			gulp.src(['./test/*.js'])
				.pipe(mocha())
				.pipe(istanbul.writeReports())
				.pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }))
				.on('end', cb);
		});
});
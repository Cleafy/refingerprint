var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var del = require('del');

var paths = {
    ownScripts: ['./src/*.js'],
    scripts: ['./bower_components/fingerprintjs2/fingerprint2.js', './src/*.js'],
    images: './images/*'
};

gulp.task('clean', function() {
    return del(['dist']);
});

gulp.task('script-standalone', ['clean'], function() {
    return gulp.src(paths.scripts)
        .pipe(uglify())
        .pipe(concat('refingerprint.min.js'))
        .pipe(gulp.dest('./dist'));
});

gulp.task('script-partial', ['clean'], function() {
    return gulp.src(paths.ownScripts)
        .pipe(uglify())
        .pipe(concat('refingerprint.partial.min.js'))
        .pipe(gulp.dest('./dist'));
});

gulp.task('images', ['clean'], function() {
    return gulp.src(paths.images)
        .pipe(gulp.dest('./dist/images'));
});

gulp.task('default', ['script-standalone', 'script-partial', 'images']);
'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');
const bump = require('gulp-bump');
const git = require('gulp-git');
const filter = require('gulp-filter');
const eslint = require('gulp-eslint');
const tag = require('gulp-tag-version');
const spawn = require('child_process').spawn;

gulp.task('test', done => {
  gulp.src(['lib/**/*']).on('finish', () => {
    gulp
      .src(['test/*.js'])
      .pipe(mocha())
      .on('end', done);
  });
});

function inc(importance) {
  // get all the files to bump version in
  return (
    gulp
      .src(['./package.json', './bower.json'])
      // bump the version number in those files
      .pipe(bump({ type: importance }))

      // save it back to filesystem
      .pipe(gulp.dest('./'))

      // commit the changed version number
      .pipe(git.commit('bumps package version'))

      // read only one file to get the version number
      .pipe(filter('package.json'))

      // **tag it in the repository**
      .pipe(tag())
  );
}

gulp.task('publish', done => {
  spawn('npm', ['publish'], { stdio: 'inherit' }).on('close', done);
});

gulp.task('patch', () => inc('patch'));

gulp.task('feature', () => inc('minor'));

gulp.task('major', () => inc('major'));

gulp.task('lint', () =>
  gulp
    .src('./lib/**/*.js')
    .pipe(eslint())
    .pipe(eslint.format())
);

gulp.task('push', done => {
  git.push('origin', 'master', { args: '--tags' }, done);
});

gulp.task('release', ['lint', 'test', 'patch']);

gulp.task('default', ['lint', 'test']);

/**
 * Run predefined tasks whenever watched file patterns are added, changed or deleted.
 *
 * ---------------------------------------------------------------
 *
 * Watch for changes on
 * - files in the `assets` folder
 * - the `tasks/pipeline.js` file
 * and re-run the appropriate tasks.
 *
 * For usage docs see:
 *    https://github.com/gruntjs/grunt-contrib-watch
 *
 */
module.exports = function (grunt) {

  grunt.config.set('watch', {
    api: {

      // API files to watch:
      files: ['api/**/*']
    },
    assets: {

      // Assets to watch:
      files: [
        'assets/**/*',
        'tasks/pipeline.js'
      ],

      // When assets are changed:
      tasks: [
        'less:dev',
        'copy:dev',
        'sails-linker:devJs',
        'sails-linker:devStyles',
        'eslint',
        'browserify:dev'
      ],

      options: {
        livereload: true,
        livereloadOnError: false
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
};

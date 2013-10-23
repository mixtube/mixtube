'use strict';

module.exports = function (grunt) {

    grunt.initConfig({

        mixtube: {
            app: 'app'
        },

        clean: ['.tmp'],

        // compiles sass files to css but excludes external libs
        sass: [
            {
                expand: true,
                cwd: 'app',
                src: [ '**/*.scss', '!**/vendor/**'],
                dest: '.tmp',
                ext: '.css'
            }
        ],

        // watches sass files to compile them a soon as they are modified by running the sass task
        watch: {
            files: ['<%= mixtube.app %>/**/*.scss'],
            tasks: ['sass']
        },

        // the web server for dev purposes
        connect: {
            server: {
                options: {
                    port: 8080,
                    base: ['.tmp', '<%= mixtube.app %>']
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');

    // a dev oriented task that watches file that need to be compiled and starts a local server
    grunt.registerTask('server', ['clean', 'sass', 'connect', 'watch']);
};
'use strict';

module.exports = function (grunt) {

    grunt.initConfig({

        mixtube: {
            app: 'app',
            dist: 'dist'

        },

        clean: {
            dist: {
                files: [
                    {
                        dot: true,
                        src: [ '.tmp', '<%= mixtube.dist %>/*']
                    }
                ]
            },
            server: '.tmp'
        },

        // compiles sass files to css but excludes external libs
        sass: [
            {
                expand: true,
                cwd: 'app',
                // we need to manually exclude the sass partials (see https://github.com/gruntjs/grunt-contrib-sass/issues/72)
                src: [ '**/*.scss', '!**/_*.scss', '!**/vendor/**'],
                dest: '.tmp',
                ext: '.css'
            }
        ],

        pleeease: {
            options: {
                optimizers: {
                    import: false,
                    minifier: false,
                    mqpacker: false

                },
                fallbacks: {
                    autoprefixer: ['last 1 version'],
                    variables: false,
                    rem: false,
                    pseudoElements: false
                }
            },
            css: {
                files: {
                    '.tmp/styles/css/main.css': '.tmp/**/*.css'
                }
            }
        },

        watch: {

            // watches sass files to compile them a soon as they are modified by running the sass task
            style: {
                files: ['<%= mixtube.app %>/**/*.scss'],
                tasks: ['style']
            },

            // reload the css in the browser when changed
            livereload: {
                files: ['.tmp/**/*.css'],
                options: {
                    livereload: true
                }
            }
        },

        // the web server for dev purposes
        connect: {
            server: {
                options: {
                    hostname: '*',
                    port: 8080,
                    base: ['.tmp', '<%= mixtube.app %>']
                }
            }
        },

        // prepares the the conf for concat
        useminPrepare: {
            options: {
                dest: '<%= mixtube.dist %>',
                flow: {
                    steps: {'js': ['concat'], css: ['concat']},
                    post: {}
                }
            },
            html: '<%= mixtube.app %>/*.html'
        },

        // copies all the files that don't need any special processing
        copy: [
            {expand: true, cwd: '<%= mixtube.app %>', dest: '<%= mixtube.dist %>', src: ['*.html']},
            {expand: true, flatten: true, cwd: '<%= mixtube.app %>', dest: '<%= mixtube.dist %>/styles', src: ['**/*.{eot,svg,ttf,woff}']}
        ],

        inline_angular_templates: {
            dist: {
                options: {
                    base: 'app',
                    prefix: '/'
                },
                files: {
                    '<%= mixtube.dist %>/index.html': ['<%= mixtube.app %>/scripts/components/**/*.html']
                }
            }
        },

        // prepends files name with a hash of the content, we need to process the css dependencies first and then treat
        // the html dependencies
        rev: {
            css: {
                files: {
                    src: ['<%= mixtube.dist %>/styles/*.{eot,svg,ttf,woff}']
                }
            },
            html: {
                files: {
                    src: ['<%= mixtube.dist %>/scripts/*.js', '<%= mixtube.dist %>/styles/*.css']
                }
            }
        },

        // replaces path in index.html by the concatenated versions
        usemin: {
            css: ['<%= mixtube.dist %>/styles/*.css'],
            html: ['<%= mixtube.dist %>/*.html']
        },

        'gh-pages': {
            options: {
                base: 'dist'
            },
            src: '**/*'
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-pleeease');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-usemin');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-rev');
    grunt.loadNpmTasks('grunt-gh-pages');
    grunt.loadNpmTasks('grunt-inline-angular-templates');

    // sass and autoprefix the styles
    grunt.registerTask('style', ['sass', 'pleeease']);

    // a dev oriented task that watches file that need to be compiled and starts a local server
    grunt.registerTask('server', ['clean:server', 'style', 'connect', 'watch']);

    grunt.registerTask('build', ['clean:dist', 'style', 'useminPrepare', 'concat', 'copy', 'inline_angular_templates', 'rev:css', 'usemin:css', 'rev:html', 'usemin:html']);

    grunt.registerTask('publish-gh-pages', ['build', 'gh-pages']);
};
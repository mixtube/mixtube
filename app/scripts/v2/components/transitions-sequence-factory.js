(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mTransitionsSequenceFactory', function ($window) {

        var SLICE_METHOD = [].slice;

        var TransitionsSequence = {

            _stages: null,

            get _currentStage() {
                return this._stages[this._stages.length - 1];
            },

            begin: function () {
                this._stages = [];
                return this.then();
            },

            then: function () {
                this._stages.push([]);
                return this;
            },

            end: function (element, doneCallback) {
                var sequence = this;

                // defined and execute the sequencing loop
                (function runNextStage() {
                    var stage = sequence._stages.shift();

                    // apply all defined stage's commands
                    stage.forEach(function (command) {
                        if ('method' in command && 'args' in command) {
                            element[command.method].apply(element, command.args);
                        } else if (angular.isFunction(command)) {
                            command();
                        }
                    });

                    var nextCallback = sequence._stages.length ? runNextStage : doneCallback;

                    // we try to get a transition duration since it is the only required property for valid transitions
                    // if there isn't computed duration it means this stage doesn't trigger any transition and that we have to use a "manual" progress
                    //
                    // WARNING: this detection is not perfect though because if the properties declared in the transition are not modified
                    // the transition won't be triggered then the "transitionend" event won't be triggered and we will get a never ending sequence.
                    // A better impl would make a diff between css property values before and after applying commands to check if it triggers the transiton
                    var transitionDefined = !!parseFloat($window.getComputedStyle(element[0]).getPropertyValue('transition-duration'));

                    if (transitionDefined) {
                        element.one('transitionend', nextCallback);
                    } else {
                        // "manual" stage progress
                        $window.requestAnimationFrame(nextCallback);
                    }
                })();
            },

            pushMethodCommand: function (name, args) {
                // make a defensive shallow copy of the given arguments object
                var argsCopy = SLICE_METHOD.call(args, 0);
                this._currentStage.push({method: name, args: argsCopy});
                return this;
            },

            addClass: function (classes) {
                return this.pushMethodCommand('addClass', arguments);
            },

            removeClass: function (classes) {
                return this.pushMethodCommand('removeClass', arguments);
            },

            css: function (name, value) {
                return this.pushMethodCommand('css', arguments);
            },

            exec: function (cb) {
                this._currentStage.push(cb);
                return this;
            }
        };

        return {
            getInstance: function () {
                return Object.create(TransitionsSequence);
            }
        };
    });

})(mt);
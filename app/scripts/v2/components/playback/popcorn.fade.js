(function (Popcorn) {

    'use strict';

    function CountDownLatch(count, done) {
        this.count = count;
        this.done = done;
    }

    CountDownLatch.prototype = {
        countDown: function () {
            var latch = this;
            if (!--latch.count) {
                window.setTimeout(function () {
                    latch.done();
                }, 0);
            }
        }
    };

    function volumeStep(popcorn, state) {
        popcorn.volume(state.volume);
    }

    function opacityStep(popcorn, state) {
        popcorn.media.style.opacity = state.opacity;
    }

    function stopTweenable(tweenable) {
        if (tweenable && tweenable.isPlaying()) {
            tweenable.stop();
        }
    }

    Popcorn.prototype.fade = function (options) {
        var instance = this;

        // if there is a running fade action stop it and start the new one
        stopTweenable(instance.volumeTweenable);
        instance.volumeTweenable = new Tweenable();

        stopTweenable(instance.opacityTweenable);
        instance.opacityTweenable = new Tweenable();

        var durationInMillis = options.duration * 1000;

        var volumeTweenableConfig = {
            duration: durationInMillis,
            step: _.partial(volumeStep, instance),
            from: { volume: instance.volume() },
            to: { volume: null }
        };

        var opacityTweenableConfig = {
            duration: durationInMillis,
            step: _.partial(opacityStep, instance),
            from: { opacity: parseFloat(instance.media.style.opacity) },
            to: { opacity: null }
        };

        if (options.direction === 'in') {
            volumeTweenableConfig.to.volume = opacityTweenableConfig.to.opacity = 1;
        } else if (options.direction === 'out') {
            volumeTweenableConfig.to.volume = opacityTweenableConfig.to.opacity = 0;
        }

        //  we instantiate the latch only if the caller is interested in knowing when the fade is finished
        if ('done' in options) {
            var latch = new CountDownLatch(2, options.done);
            volumeTweenableConfig.finish = opacityTweenableConfig.finish = function () {
                latch.countDown();
            };
        }

        instance.volumeTweenable.tween(volumeTweenableConfig);
        instance.opacityTweenable.tween(opacityTweenableConfig);
    };
})(Popcorn);
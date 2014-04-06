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
        stopTweenable(instance.opacityTweenable);

        instance.volumeTweenable = new Tweenable();
        // browser can throttle requestAnimationFrame execution while the window is not visible
        // use setTimeout for sound because we don't want this behavior while fading in or out
        instance.volumeTweenable.setScheduleFunction(window.setTimeout);

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

        var latch = new CountDownLatch(2, function () {
            instance.off('play', playHandler);
            instance.off('pause', pauseHandler);

            if ('done' in options) {
                options.done();
            }
        });
        volumeTweenableConfig.finish = opacityTweenableConfig.finish = function () {
            latch.countDown();
        };

        function playHandler() {
            // not nice to access a private member of tweenable but there is not public accessor for it
            if (instance.volumeTweenable._isPaused) {
                instance.volumeTweenable.resume();
            }
            if (instance.opacityTweenable._isPaused) {
                instance.opacityTweenable.resume();
            }
        }

        function pauseHandler() {
            instance.volumeTweenable.pause();
            instance.opacityTweenable.pause();
        }

        instance.on('play', playHandler);
        instance.on('pause', pauseHandler);

        instance.volumeTweenable.tween(volumeTweenableConfig);
        instance.opacityTweenable.tween(opacityTweenableConfig);
    };
})(Popcorn);
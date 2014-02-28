(function (Popcorn) {

    'use strict';

    var volumeTweenable = new Tweenable();
    var opacityTweenable = new Tweenable();

    function volumeStep(popcorn, state) {
        popcorn.volume(state.volume);
        console.log(popcorn.volume());
    }

    function opacityStep(popcorn, state) {
        popcorn.media.style.opacity = state.opacity;
    }

    Popcorn.prototype.fade = function (options) {
        var instance = this;

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

        volumeTweenable.tween(volumeTweenableConfig);
        opacityTweenable.tween(opacityTweenableConfig);
    };
})(Popcorn);
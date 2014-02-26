(function (Popcorn) {

    'use strict';

    function soundFadeInTween(target, progress) {
        target.volume(progress);
    }

    function elementFadeInTween(target, progress) {
        target.media.style['opacity'] = progress;
    }

    function invertTween(tween) {
        return function (target, progress) {
            tween(target, 1 - progress);
        };
    }

    Popcorn.prototype.fade = function (options) {
        var instance = this;

        var durationInMillis = options.duration * 1000;

        var soundTween = null;
        var elementTween = null;
        if (options.direction === 'in') {
            soundTween = soundFadeInTween;
            elementTween = elementFadeInTween;
        } else if (options.direction === 'out') {
            soundTween = invertTween(soundFadeInTween);
            elementTween = invertTween(elementFadeInTween);
        }

        var startTs = Date.now();

        _.defer(function frame() {
            var progress = Math.min((Date.now() - startTs) / durationInMillis, 1);

            soundTween(instance, progress);
            elementTween(instance, progress);

            if (progress < 1) {
                window.setTimeout(frame, 16);
            }
        });

        return {};
    };
})(Popcorn);
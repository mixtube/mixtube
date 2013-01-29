(function (mt) {
    var globalPlayersCounter = 0;
    var noop = function () {
    };

    function nextInstanceId() {
        return globalPlayersCounter++;
    }

    function VideoRequest(videoId, coarseDuration) {
        this.videoId = videoId;
        this.coarseDuration = coarseDuration;
        this.canPlayThroughDeferred = Q.defer();
    }

    mt.player = {
        /**
         * @param {YT.Player} delegate the player to wrap
         * @constructor
         */
        Player: function (delegate) {
            var self = this;

            this.delegate = delegate;
            // define css transition for visual fade
            this.delegate.getIframe().style['-webkit-transition'] = 'opacity ' + this.fadeDuration + 'ms';

            this.instanceId = nextInstanceId();

            // preloads 20 seconds of video
            this.preloadDuration = 20000;
            this.fadeDuration = 3000;

            /**
             * @type {{time: number, callback: function}}
             */
            this.playbackProgressListener = [];

            this.delegate.addEventListener('onStateChange', function (evt) {

                console.log("State of player " + self.instanceId + ' ' + evt.data);

                if (evt.data === YT.PlayerState.PLAYING) {
                    // end of first buffering phase is considered as a can play through event
                    if (!self.videoRequest.canPlayThroughDeferred.isResolved()) {
                        self.videoRequest.canPlayThroughDeferred.resolve();
                    }
                }
            });

            setInterval(function () {
                if ('getVideoLoadedFraction' in  self.delegate) {
                    console.debug('Player %d progress buffering %s', self.instanceId, Math.round(100 * self.delegate.getVideoLoadedFraction()));
                }
            }, 500);

            // poll the current video position to execute playback progress listeners right in time
            setInterval(function () {
                if ('getCurrentTime' in self.delegate && self.coarseDuration) {

                    var currentVideoTime = self.delegate.getCurrentTime() * 1000;

                    for (var idx = 0; idx < self.playbackProgressListener.length; idx++) {
                        var listener = self.playbackProgressListener[idx];
                        // If time is positive, execute the listener after X milliseconds from the beginning
                        // of the video. If time is negative execute it X milliseconds before the end

                        // console.debug('Found a listener with time %d (current time is %d, video duration %d)', listener.time, currentVideoTime, self.coarseDuration);

                        if (listener.time > 0 && listener.time < currentVideoTime
                            || listener.time < 0 && Math.abs(listener.time) > this.coarseDuration - currentVideoTime) {

                            listener.callback();
                        }
                    }
                }
            }, 100);
        }
    };

    /**
     * Preloads a video and execute a callback when it is done. The video is paused after this function returns.
     *
     * @param videoId {string}
     * @param coarseDuration {number} the approximate duration in milliseconds
     * @return {Q.promise} a promise that will be resolved when the video can play without stop until the end
     */
    mt.player.Player.prototype.preloadVideoById = function (videoId, coarseDuration) {
        var self = this;

        this.videoRequest = new VideoRequest(videoId, coarseDuration);

        // pause the video when first buffering is done
        this.videoRequest.canPlayThroughDeferred.done(function () {
            console.debug('Player %s : end of buffering', self.instanceId);
            self.delegate.pauseVideo();
        });

        // load the video, and when the video will start to play, we will pause it, see notifyBufferingDone
        this.delegate.loadVideoById({videoId: this.videoRequest.videoId, suggestedQuality: 'small'});

        return this.videoRequest.canPlayThroughDeferred.promise;
    };

    /**
     * Starts and fade in the video.
     *
     * @return {Q.promise} that will be resolved when the in operation is terminated (when the fade in is terminated)
     */
    mt.player.Player.prototype.in = function () {
        if (!this.videoRequest) {
            throw new Error('Can\'t start because there is no video request');
        }
        this.delegate.playVideo();
        return this.fade('in');
    };

    /**
     * Fades out and stops the video. After that the video request is cleared, so the video can not be played again
     * without being reloaded.
     *
     * @return {Q.promise} that will be resolved when the in operation is terminated (when the fade out is terminated)
     */
    mt.player.Player.prototype.out = function () {
        var self = this;
        return this.fade('out').done(function () {
            self.delegate.stopVideo();
            this.videoRequest = undefined;
        });
    };

    /**
     * Fades in or out the video. The sound is faded by javascript, the image is faded thanks to css transition.
     *
     * @param {string} direction 'in' or 'out'
     * @return {Q.promise} a promise that will be resolved when the fade operation is terminated
     */
    mt.player.Player.prototype.fade = function (direction) {
        if (this.fadeInterval) {
            throw new Error('A fade operation is already in progress on player ' + this.instanceId);
        }

        var self = this;
        var deferred = Q.defer();

        this.delegate.getIframe().style.opacity = direction === 'in' ? 100 : 0;
        this.delegate.setVolume(direction === 'in' ? 0 : 100);

        var fadeStartTime = Date.now();
        this.fadeInterval = setInterval(function () {
            var ratio = Math.min((Date.now() - fadeStartTime) / self.fadeDuration, 1);
            if (ratio === 1) {
                clearInterval(self.fadeInterval);
                self.fadeInterval = undefined;
                deferred.resolve();
            }
            self.delegate.setVolume(100 * (direction === 'in' ? ratio : 1 - ratio));
        }, 100);

        return deferred.promise;
    };

    /**
     * Add a listener to execute when the time has come. The function will be executed only once by preload video request.
     *
     * @param time {number} in milliseconds. Positive means the time after the beginning of the video, negative means
     * the time before the end.
     * @param callback {function} the function to execute at the specified time
     */
    mt.player.Player.prototype.addPlaybackProgressListener = function (time, callback) {
        var deferred = Q.defer();
        this.playbackProgressListener.push({time: time, callback: deferred(callback)});
    };

    /**
     * @param player {mt.player.Player}
     * @param fn {function}
     * @constructor
     */
    function OnceCallback(player, fn) {
        this.player = player;
        this.fn = fn;
        this.lastPvrId = undefined;
    }

    OnceCallback.prototype.execute = function () {
        if (this.player.pvrId !== this.lastPvrId) {
            this.lastPvrId = this.player.pvrId;
            this.fn.apply(null, arguments);
        }
    };
})(window.mt = window.mt || {});
(function (mt) {
    var globalPlayersCounter = 0;
    var noop = function () {
    };

    function nextInstanceId() {
        return globalPlayersCounter++;
    }

    mt.player = {
        /**
         * @param {YT.Player} delegate the player to wrap
         * @constructor
         */
        Player: function (delegate) {
            this.instanceId = nextInstanceId();
            
            // stands for preloadVideoRequestId. Incremented each time a preload request is done
            this.pvrId = 0;

            // true if the player received a pvr and has not be stopped out yet
            this.nextVideoDefined = false;

            this.coarseDuration = undefined;

            // preloads 20 seconds of video
            this.preloadDuration = 20000;
            this.fadeDuration = 3000;

            this.delegate = delegate;

            // define css transition for visual fade
            this.delegate.getIframe().style['-webkit-transition'] = 'opacity ' + this.fadeDuration + 'ms';

            /**
             * @type {{time: number, callback: function}}
             */
            this.playbackProgressListener = [];

            var self = this;

            this.onBufferingDoneUserCallback = noop;
            var playingListener = new OnceCallback(this, function () {
                self.notifyBufferingDone()
            });
            this.delegate.addEventListener('onStateChange', function (evt) {
                console.log("State of player " + self.instanceId + ' ' + evt.data);
                if (evt.data === YT.PlayerState.PLAYING) {
                    playingListener.execute();
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
     * @param {function} [onReadyCallback] a callback called when the video is fully preloaded
     */
    mt.player.Player.prototype.preloadVideoById = function (videoId, coarseDuration, onReadyCallback) {
        onReadyCallback = onReadyCallback || noop;

        this.pvrId++;
        this.nextVideoDefined = true;
        this.coarseDuration = coarseDuration;

        this.onBufferingDoneUserCallback = onReadyCallback;

        // load the video, and when the video will start to play, we will pause it, see notifyBufferingDone
        this.delegate.loadVideoById({videoId: videoId, suggestedQuality: 'small'});

        // calculate the minimum preloading time
        var minimumFractionToPreload = this.preloadDuration / coarseDuration;
        var self = this;
        // poll to detect when the preloaded fraction reaches the minimum
//        this.preloadInterval = setInterval(function () {
//            console.debug('Player %d progress buffering %s', self.instanceId, self.delegate.getVideoLoadedFraction());
//            if (self.delegate.getVideoLoadedFraction() >= minimumFractionToPreload) {
//                clearInterval(self.preloadInterval);
//                onReadyCallback();
//            }
//        }, 100);
    };

    mt.player.Player.prototype.notifyBufferingDone = function () {
        console.debug('Player %d end of buffering', this.instanceId);
        this.delegate.pauseVideo();
        this.onBufferingDoneUserCallback();
    };

    mt.player.Player.prototype.in = function () {
        if (this.nextVideoDefined) {
            this.delegate.playVideo();
            this.fade('in');
        }
    };

    mt.player.Player.prototype.out = function () {
        this.nextVideoDefined = false;
        var self = this;
        this.fade('out', function () {
            //self.delegate.stopVideo();
        });
    };

    /**
     * Fades in or out the video. The sound is faded by javascript, the image is faded thanks to css transition.
     *
     * @param {string} direction 'in' or 'out'
     * @param {function} [onEndCallback]
     */
    mt.player.Player.prototype.fade = function (direction, onEndCallback) {
        if (this.fadeInterval) {
            throw new Error('A fade operation is already in progress on player ' + this.instanceId);
        }
        onEndCallback = onEndCallback || noop;

        this.delegate.getIframe().style.opacity = direction === 'in' ? 100 : 0;
        this.delegate.setVolume(direction === 'in' ? 0 : 100);

        var fadeStartTime = Date.now();
        var self = this;
        this.fadeInterval = setInterval(function () {
            var ratio = Math.min((Date.now() - fadeStartTime) / self.fadeDuration, 1);
            if (ratio === 1) {
                clearInterval(self.fadeInterval);
                self.fadeInterval = undefined;
                onEndCallback();
            }
            self.delegate.setVolume(100 * (direction === 'in' ? ratio : 1 - ratio));
        }, 100);
    };

    /**
     * Add a listener to execute when the time has come. The function will be executed only once by preload video request.
     *
     * @param time {number} in milliseconds. Positive means the time after the beginning of the video, negative means
     * the time before the end.
     * @param callback {function} the function to execute at the specified time
     */
    mt.player.Player.prototype.addPlaybackProgressListener = function (time, callback) {
        this.playbackProgressListener.push({time: time, callback: this.onceByPvr(callback)});
    };

    /**
     * Wraps a method that should be executed only once by preload video request.
     *
     * It is useful for event listener that are registered once by player instance but that need to be executed once by
     * pvr.
     *
     * @param fn {Function} the function to wrap. The return value will be ignored.
     * @return {Function} the new function to use
     */
    mt.player.Player.prototype.onceByPvr = function (fn) {
        var onceCallback = new OnceCallback(this, fn);
        return function () {
            onceCallback.execute(arguments);
        };
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
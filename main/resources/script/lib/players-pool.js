(function (mt) {

    mt.player = {};

    /**
     * @param {YT.Player} delegate
     * @param logger
     * @constructor
     */
    mt.player.YoutubePlayer = function (delegate, logger) {
        var self = this;

        self.delegate = delegate;
        self.logger = logger;
        self.busy = false;
        self.lastSampledTime = 0;
        self.canPlayThroughDeferred = undefined;
        self.endOfFadeDeferred = undefined;
        self.listeners = {timeupdate: {}};

        self.delegate.addEventListener('onStateChange', function (evt) {
            self.logger.debug('onStateChange executed', evt.data);

            if (evt.data === YT.PlayerState.PLAYING) {
                // end of first buffering phase is considered as a can play through event
                self.canPlayThroughDeferred.resolve();
            }
        });
    };

    /**
     * Clears the previous playback state and initialize required objects for the next one.
     */
    mt.player.YoutubePlayer.prototype.reset = function () {
        var self = this;

        self.lastSampledTime = 0;

        // clear previous state
        if (self.canPlayThroughDeferred) {
            self.canPlayThroughDeferred.reject();
        }

        if (self.endOfFadeDeferred) {
            self.endOfFadeDeferred.resolve();
        }

        // install new state
        self.canPlayThroughDeferred = jQuery.Deferred();
        self.canPlayThroughDeferred.done(function () {
            self.delegate.pauseVideo();
        });

        // make the player silent and invisible
        self.fade('out', 0);
    };

    /**
     * @param {string} key the listener unique key, can be used to remove it later
     * @param {function} listener the listener function
     */
    mt.player.YoutubePlayer.prototype.addTimeUpdateListener = function (key, listener) {
        this.listeners.timeupdate[key] = this.listeners.timeupdate[key] || [];
        this.listeners.timeupdate[key].push(listener);
    };

    /**
     * @param {string} key
     */
    mt.player.YoutubePlayer.prototype.removeTimeUpdateListener = function (key) {
        if (key in this.listeners.timeupdate) {
            this.listeners.timeupdate[key] = [];
        }
    };

    /**
     * Clears the previous playback (stop a execute all promises) and start to load the given video.
     *
     * @param {string} videoId
     * @return {jQuery.promise} resolved when the video can play through the end without stop
     */
    mt.player.YoutubePlayer.prototype.loadVideo = function (videoId) {
        var self = this;

        self.reset();

        self.busy = true;

        // load the video, and when the video will start to play, we will pause it, see canPlayThroughDeferred
        self.delegate.loadVideoById({videoId: videoId, suggestedQuality: 'default'});

        // poll the current video position to generate the timeupdate event
        self.sampleTimeInterval = setInterval(function () {
            var sampledTime = self.delegate.getCurrentTime() * 1000;
            if (self.lastSampledTime !== sampledTime) {
                var event = {currentTime: sampledTime};

                for (var key in self.listeners.timeupdate)
                    for (var idxCallback = 0; idxCallback < self.listeners.timeupdate[key].length; idxCallback++) {
                        var callback = self.listeners.timeupdate[key][idxCallback];
                        callback(event);
                    }
            }
            self.lastSampledTime = sampledTime;
        }, 100);

        return self.canPlayThroughDeferred.promise();
    };

    /**
     * Starts the previously loaded video.
     */
    mt.player.YoutubePlayer.prototype.playVideo = function () {
        this.delegate.playVideo();
    };

    mt.player.YoutubePlayer.prototype.pauseVideo = function() {
        this.delegate.pauseVideo();
    };

    /**
     * Stops the video and release the player for further usage.
     */
    mt.player.YoutubePlayer.prototype.stopVideo = function () {
        clearInterval(this.sampleTimeInterval);
        this.delegate.stopVideo();
        this.busy = false;
    };

    /**
     * Fades the player without modifying the playback status (no play or stop call).
     *
     * If there was a pending fade operation, it is terminated so that it jumps to the end values. If duration is equal
     * to 0, it means immediate transition.
     *
     * @param {string} direction "in" or "out"
     * @param {number} duration the duration in milliseconds
     * @return {jQuery.promise} resolved when the fade operation is finished
     */
    mt.player.YoutubePlayer.prototype.fade = function (direction, duration) {
        var bounds = {'in': {start: 0, end: 100}, out: {start: 100, end: 0}};
        var self = this;
        var immediate = duration === 0;

        if (self.endOfFadeDeferred) {
            // there is a pending fade operation, ensure it is resolved
            self.endOfFadeDeferred.resolve();
        }

        self.endOfFadeDeferred = jQuery.Deferred();

        var playerStyle = self.delegate.getIframe().style;

        // remove transition and set extreme values when it is resolved
        self.endOfFadeDeferred.always(function () {
            playerStyle['-webkit-transition'] = '';
            playerStyle.opacity = bounds[direction].end;
            self.delegate.setVolume(bounds[direction].end);
        });

        if (immediate) {
            // no animation, resolve straight
            self.endOfFadeDeferred.resolve();
        } else {
            // make sure we start form the beginning
            playerStyle.opacity = bounds[direction].start;
            self.delegate.setVolume(bounds[direction].start);

            // use css transitions to animate opacity
            playerStyle['-webkit-transition'] = 'opacity ' + duration + 'ms';
            playerStyle.opacity = bounds[direction].end;

            // use classic js interval for sound fade
            var fadeStartTime = Date.now();
            var fadeInterval = setInterval(function () {
                var ratio = Math.min((Date.now() - fadeStartTime) / duration, 1);
                if (ratio === 1) {
                    self.endOfFadeDeferred.resolve();
                }
                self.delegate.setVolume(100 * (direction === 'in' ? ratio : 1 - ratio));
            }, 100);

            self.endOfFadeDeferred.always(function () {
                clearInterval(fadeInterval);
            });
        }

        return self.endOfFadeDeferred.promise();
    };


/////////////////////////////// VideoHandle

    /**
     * @param {mt.player.PlayersPool} playersPool
     * @param {string} uid a generated id that is unique to this handle
     * @param {{id: string, provider: string, coarseDuration: number}} video
     * @param {Array.<{time: number, callback: function}>} cues the cue points
     * @param logger
     * @constructor
     */
    mt.player.VideoHandle = function (playersPool, uid, video, cues, logger) {
        this.playersPool = playersPool;
        this.uid = uid;
        this.video = video;
        this.cues = cues;
        this.logger = logger;
        this.player = undefined;
        this.canPlayThroughDeferred = jQuery.Deferred();
        this.outDeferred = jQuery.Deferred();
        this.disposed = false;
    };

    /**
     * @return {jQuery.promise} when the video can play through
     */
    mt.player.VideoHandle.prototype.load = function () {
        var self = this;

        self.checkNotDisposed();
        self.playersPool.ensurePlayerAvailableForProvider(this.video.provider).done(function (player) {
            self.player = player;
            var lastCurrentTime = 0;
            // register the listener for cues
            self.player.addTimeUpdateListener(self.uid + '_cue', function (evt) {
                // go through each cue and execute it if it is the goode time slot
                self.cues.forEach(function (cue) {
                    // execute the cue if last time is before the cue time and current time is after
                    if (lastCurrentTime <= cue.time && cue.time <= evt.currentTime) {
                        self.logger.log('%s executed', self.uid + '_cue');
                        cue.callback();
                    }
                    lastCurrentTime = evt.currentTime;
                })
            });
            self.player.loadVideo(self.video.id).done(self.canPlayThroughDeferred.resolve);
        });
        return self.canPlayThroughDeferred.promise();
    };

    mt.player.VideoHandle.prototype.pause = function () {
        this.checkNotDisposed();
        this.player.pauseVideo();
    };

    mt.player.VideoHandle.prototype.unpause = function () {
        this.checkNotDisposed();
        this.player.playVideo();
    };

    /**
     * Properly release the handle by removing all the listeners and stopping the video.
     *
     * After a call to that method, it is not possible to reuse the handle.
     */
    mt.player.VideoHandle.prototype.dispose = function () {
        this.disposed = true;
        this.player.removeTimeUpdateListener(this.uid + '_cue');
        this.canPlayThroughDeferred.reject();
        this.player.stopVideo();
    };

    /**
     * Starts and fade in the video.
     *
     * @param {number} duration fade duration in milliseconds
     */
    mt.player.VideoHandle.prototype.in = function (duration) {
        this.checkNotDisposed();
        if (!this.player) throw new Error('The video should be loaded before calling in');

        this.player.playVideo();
        this.player.fade('in', duration);
    };

    /**
     * Fades out and stops the video.
     *
     * @param {number} fadeDuration fade duration in milliseconds
     * @return {jQuery.promise} resolved when the fade operation is finished and the player stopped. The argument it this handle.
     */
    mt.player.VideoHandle.prototype.out = function (fadeDuration) {
        this.checkNotDisposed();
        if (!this.player) throw new Error('The video should be loaded before calling out');

        var self = this;
        self.player.fade('out', fadeDuration).done(function () {
            self.outDeferred.resolve(self);
        });
        return self.outDeferred.promise();
    };

    /**
     * Throws an error if handle is disposed.
     *
     * @throws {Error}
     * @private
     */
    mt.player.VideoHandle.prototype.checkNotDisposed = function () {
        if (this.disposed) {
            throw new Error('Can not use a the disposed handle ' + this.uid);
        }
    };


/////////////////////////////// PlayerPool

    /**
     * @param {function(): HTMLElement} domNodeSupplier a function that supply the dom to attach the player
     * @param logger a pre configured logger object
     * @constructor
     */
    mt.player.PlayersPool = function (domNodeSupplier, logger) {
        this.domNodeSupplierFn = domNodeSupplier;
        this.playersByProvider = {youtube: []};
        this.logger = logger;
    };

    /**
     * Prepares a video and gives back a handle to interact with it.
     *
     * @param {{id: string, provider: string, coarseDuration: number}} video the video the load
     * @param {Array.<{time: number, callback: function}>} cues the cues points
     * @return {mt.player.VideoHandle}
     */
    mt.player.PlayersPool.prototype.prepareVideo = function (video, cues) {
        return new mt.player.VideoHandle(this, mt.tools.uniqueId(), video, cues, this.logger);
    };

    /**
     * Ensures that there is enough players available for the supplied provider.
     *
     * If all the players for that provider are playing, creates a new one.
     *
     * @param {string} provider the video provider name
     * @return {jQuery.promise} resolved when the player is ready to accept load requests
     */
    mt.player.PlayersPool.prototype.ensurePlayerAvailableForProvider = function (provider) {
        var self = this;
        if (!(provider in self.playersByProvider)) {
            throw new Error("Unknown provider " + provider);
        }

        var playerDeferred = jQuery.Deferred();
        var found = false;

        var players = self.playersByProvider[provider];
        for (var idx = 0; idx < players.length; idx++) {
            var player = players[idx];
            if (!player.busy) {
                found = true;
                playerDeferred.resolve(player);
            }
        }

        if (!found) {
            // we need to create a new instance, when done save it
            playerDeferred.done(function (player) {
                players.push(player);
                self.logger.debug('Created a new instance of player for %s, there are now %d instances', provider, players.length);
            });

            // get the dom node where we are going to insert the player
            var domNode = self.domNodeSupplierFn();

            // avoid black flash by hiding the container until the player is ready
            domNode.style.display = 'none';

            if (provider === 'youtube') {
                new YT.Player(domNode, {
                    height: '390',
                    width: '640',
                    playerVars: {
                        controls: 0,
                        showinfo: 0,
                        iv_load_policy: 3,
                        disablekb: 1,
                        modestbranding: 1,
                        rel: 0
                    },
                    events: {
                        onReady: function (evt) {
                            // now that the player is ready we can make it visible
                            evt.target.getIframe().style.display = '';
                            playerDeferred.resolve(new mt.player.YoutubePlayer(evt.target, self.logger));
                        }
                    }
                });
            }
        }

        return playerDeferred.promise();
    };

})(window.mt = window.mt || {});
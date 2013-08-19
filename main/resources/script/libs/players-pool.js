(function (mt, undefined) {
    'use strict';

    Q.longStackSupport = true;

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
        self.canPlayThroughDeferred = null;
        self.endOfFadeDeferred = null;
        self.activeFadeTween = null;
        self.listeners = {timeupdate: {}};

        self.delegate.addEventListener('onStateChange', function (evt) {
            self.logger.debug('Youtube player %s onStateChange executed, code %s', evt.target.id, evt.data);

            if (evt.data === YT.PlayerState.PLAYING) {
                // end of first buffering phase is considered as a can play through event
                if (self.canPlayThroughDeferred) {
                    // surprisingly this can be called before we told the player to load any video
                    // so we need to check if the deferred has been created before calling it
                    self.canPlayThroughDeferred.resolve();
                }
            }
        });
        self.delegate.addEventListener('onError', function (evt) {
            self.logger.debug('Youtube player %s onError executed, code %s', evt.target.id, evt.data);
            self.canPlayThroughDeferred.reject();
        });
    };

    /**
     * Clears the previous playback state and initialize required objects for the next one.
     */
    mt.player.YoutubePlayer.prototype.reset = function () {
        var self = this;

        self.lastSampledTime = 0;

        if (self.endOfFadeDeferred) {
            self.endOfFadeDeferred.resolve();
        }

        // install new state
        self.canPlayThroughDeferred = Q.defer();
        self.canPlayThroughDeferred.promise.done(function () {
            self.delegate.pauseVideo();
        });

        // make the player silent and invisible
        self.cloak();
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
     * @return {Q.Promise} resolved when the video can play through the end without stop
     */
    mt.player.YoutubePlayer.prototype.loadVideo = function (videoId) {
        var self = this;

        self.logger.debug('Youtube player %s loadVideo executed with video %s', self.delegate.id, videoId);

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

        return self.canPlayThroughDeferred.promise;
    };

    /**
     * Starts the previously loaded video.
     */
    mt.player.YoutubePlayer.prototype.playVideo = function () {
        this.delegate.playVideo();
        if (this.activeFadeTween) {
            this.activeFadeTween.play();
        }
    };

    mt.player.YoutubePlayer.prototype.pauseVideo = function () {
        this.delegate.pauseVideo();
        if (this.activeFadeTween) {
            this.activeFadeTween.pause();
        }
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
     * Immediately hides and mutes the player.
     */
    mt.player.YoutubePlayer.prototype.cloak = function () {
        this.delegate.getIframe().style.opacity = 0;
        this.delegate.setVolume(0);
    };

    /**
     * Fades the player without modifying the playback status (no play or stop call).
     *
     * If there was a pending fade operation, it is terminated so that it jumps to the end values. If duration is equal
     * to 0, it means immediate transition.
     *
     * @param {string} direction "in" or "out"
     * @param {number} duration the duration in milliseconds
     * @return {Q.Promise} resolved when the fade operation is finished
     */
    mt.player.YoutubePlayer.prototype.fade = function (direction, duration) {
        var self = this;

        if (self.endOfFadeDeferred) {
            // there is a pending fade operation, ensure it is resolved
            self.endOfFadeDeferred.resolve();
        }

        self.endOfFadeDeferred = Q.defer();

        var playerIFrameStyle = self.delegate.getIframe().style;
        self.activeFadeTween = mt.tools.tween({
            target: function (values) {
                playerIFrameStyle.opacity = values.opacity;
                self.delegate.setVolume(values.volume);
            },
            from: {
                opacity: direction === 'in' ? 0 : 1,
                volume: direction === 'in' ? 0 : 100
            },
            to: {
                opacity: direction === 'in' ? 1 : 0,
                volume: direction === 'in' ? 100 : 0
            },
            duration: duration,
            complete: function () {
                self.endOfFadeDeferred.resolve();
                self.activeFadeTween = null;
            }
        }).play();

        return self.endOfFadeDeferred.promise;
    };


/////////////////////////////// VideoHandle

    /**
     * @param {mt.player.PlayersPool} playersPool
     * @param {string} uid a generated id that is unique to this handle
     * @param {{id: string, provider: string, coarseDuration: number}} video
     * @param logger
     * @constructor
     */
    mt.player.VideoHandle = function (playersPool, uid, video, logger) {
        this.playersPool = playersPool;
        this.uid = uid;
        this.video = video;
        this.cueByName = {};
        this.logger = logger;
        this.player = null;
        this.canPlayThroughDeferred = Q.defer();
        this.disposed = false;
    };

    /**
     * @param {string} name
     * @param {{time: number, callback: function}} cues
     */
    mt.player.VideoHandle.prototype.defineCue = function (name, cue) {
        this.cueByName[name] = cue;
    };

    /**
     * @param {string} name
     */
    mt.player.VideoHandle.prototype.removeCue = function (name) {
        delete this.cueByName[name];
    };

    /**
     * @return {Q.Promise} resolved when the video can play through
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
                for (var cueName in self.cueByName) {
                    var cue = self.cueByName[cueName];
                    // execute the cue if last time is before the cue time and current time is after
                    if (lastCurrentTime <= cue.time && cue.time <= evt.currentTime) {
                        self.logger.debug('Cue point ' + cueName + ' for %s executed', self.uid);
                        cue.callback();
                    }
                }
                lastCurrentTime = evt.currentTime;
            });
            if (self.canPlayThroughDeferred) {
                self.player.loadVideo(self.video.id).then(self.canPlayThroughDeferred.resolve, self.canPlayThroughDeferred.reject);
            }
        });
        return self.canPlayThroughDeferred.promise;
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
        this.canPlayThroughDeferred = null;
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
     * Fades out, stops the video and dispose the handle, so that it can be used anymore.
     *
     * @param {number} fadeDuration fade duration in milliseconds
     * @return {Q.Promise} resolved when the fade out action is done
     */
    mt.player.VideoHandle.prototype.out = function (fadeDuration) {
        this.checkNotDisposed();
        if (!this.player) throw new Error('The video should be loaded before calling out');

        var self = this;
        return self.player.fade('out', fadeDuration).then(function () {
            self.dispose();
            return self;
        });
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
     * @return {mt.player.VideoHandle}
     */
    mt.player.PlayersPool.prototype.prepareVideo = function (video) {
        return new mt.player.VideoHandle(this, mt.tools.uniqueId(), video, this.logger);
    };

    /**
     * Ensures that there is enough players available for the supplied provider.
     *
     * If all the players for that provider are playing, creates a new one.
     *
     * @param {string} provider the video provider name
     * @return {Q.Promise} resolved when the player is ready to accept load requests
     */
    mt.player.PlayersPool.prototype.ensurePlayerAvailableForProvider = function (provider) {
        var self = this;
        if (!(provider in self.playersByProvider)) {
            throw new Error("Unknown provider " + provider);
        }

        var playerDeferred = Q.defer();
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
            // get the dom node where we are going to insert the player
            var domNode = self.domNodeSupplierFn();

            if (provider === 'youtube') {

                // if the YouTube API is already loaded
                if ('YT' in window) {
                    new YT.Player(domNode, {
                        height: '390',
                        width: '640',
                        playerVars: {
                            controls: 0,
                            showinfo: 0,
                            iv_load_policy: 3,
                            disablekb: 1,
                            modestbranding: 1,
                            rel: 0,
                            wmode: 'opaque' /* needed by Firefox, else the video is not shown */
                        },
                        events: {
                            onReady: function (evt) {
                                var player = new mt.player.YoutubePlayer(evt.target, self.logger);
                                players.push(player);
                                self.logger.debug('Created a new instance of player for %s, there are now %d instances', provider, players.length);

                                // now that the player is ready we can make it visible
                                evt.target.getIframe().style.top = 0;

                                playerDeferred.resolve(player);
                            }
                        }
                    });
                }
            }
        }

        return playerDeferred.promise;
    };

})(window.mt = window.mt || {});
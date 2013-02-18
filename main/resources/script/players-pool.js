(function (mt) {

    mt.player = {};

    /**
     * @param {YT.Player} delegate
     * @constructor
     */
    mt.player.YoutubePlayer = function (delegate) {
        var self = this;

        self.fadeDuration = 5000;

        self.delegate = delegate;
        self.busy = false;
        self.lastSampledTime = 0;
        self.canPlayThroughDeferred = undefined;
        self.endOfFadeDeferred = undefined;
        self.listeners = {timeupdate: {}};
        self.timeupdateCallbacks = jQuery.Callbacks();

        self.delegate.addEventListener('onStateChange', function (evt) {
            console.debug('onStateChange executed', evt.data);

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
        self.fade('out', true);
    };

    /**
     * @param {string} key the listener unique key, can be used to remove it later
     * @param {function} listener the listener function
     */
    mt.player.YoutubePlayer.prototype.addTimeUpdateListener = function (key, listener) {
        this.listeners.timeupdate[key] = this.listeners.timeupdate[key] || [];
        this.listeners.timeupdate[key].push(listener);
        this.timeupdateCallbacks.add(listener);
    };

    /**
     * @param {string} key
     */
    mt.player.YoutubePlayer.prototype.removeTimeUpdateListener = function (key) {
        if (key in this.listeners.timeupdate) {
            this.timeupdateCallbacks.remove(this.listeners.timeupdate[key]);
            this.listeners.timeupdate[key] = undefined;
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
        self.delegate.loadVideoById({videoId: videoId, suggestedQuality: 'small'});

        // poll the current video position to generate the timeupdate event
        self.sampleTimeInterval = setInterval(function () {
            var sampledTime = self.delegate.getCurrentTime() * 1000;
            if (self.lastSampledTime !== sampledTime) {
                self.timeupdateCallbacks.fire({currentTime: sampledTime});
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
     * If there was a pending fade operation, it is terminated so that it jumps to the end values.
     *
     * @param {string} direction "in" or "out"
     * @param {boolean=} immediate should the fade operation go straight to the end
     * @return {jQuery.promise} resolved when the fade operation is finished
     */
    mt.player.YoutubePlayer.prototype.fade = function (direction, immediate) {
        var bounds = {'in': {start: 0, end: 100}, out: {start: 100, end: 0}};
        var self = this;
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
            playerStyle['-webkit-transition'] = 'opacity ' + self.fadeDuration + 'ms';
            playerStyle.opacity = bounds[direction].end;

            // use classic js interval for sound fade
            var fadeStartTime = Date.now();
            var fadeInterval = setInterval(function () {
                var ratio = Math.min((Date.now() - fadeStartTime) / self.fadeDuration, 1);
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
     * @constructor
     */
    mt.player.VideoHandle = function (playersPool, uid, video, cues) {
        this.playersPool = playersPool;
        this.uid = uid;
        this.video = video;
        this.cues = cues;
        this.player = undefined;
        this.canPlayThroughDeferred = jQuery.Deferred();
        this.outDeferred = jQuery.Deferred();
    };

    /**
     * @return {Q.promise} when the video can play through
     */
    mt.player.VideoHandle.prototype.load = function () {
        var self = this;
        self.playersPool.ensurePlayerAvailableForProvider(this.video.provider).done(function (player) {
            self.player = player;
            var lastCurrentTime = 0;
            self.player.addTimeUpdateListener(self.uid + '_cue', function (evt) {
                self.cues.forEach(function(cue) {
                    if(cue.time <= evt.currentTime && lastCurrentTime <= cue.time) {
                        console.log('%s executed', self.uid + '_cue');
                        cue.callback();
                    }
                    lastCurrentTime = evt.currentTime;
                })
            });
            self.player.loadVideo(self.video.id).done(self.canPlayThroughDeferred.resolve);
        });
        return self.canPlayThroughDeferred.promise();
    };

    /**
     * Starts and fade in the video.
     */
    mt.player.VideoHandle.prototype.in = function () {
        if (!this.player) throw new Error('The video should be loaded before calling in');

        this.player.playVideo();
        this.player.fade('in');
    };

    /**
     * Fades out and stops the video.
     *
     * @return {jQuery.promise} resolved when the fade operation is finished and the player stopped
     */
    mt.player.VideoHandle.prototype.out = function () {
        if (!this.player) throw new Error('The video should be loaded before calling out');

        var self = this;
        self.player.fade('out').done(self.outDeferred.resolve).done(function () {
            self.player.removeTimeUpdateListener(self.uid + '_cue');
            self.player.stopVideo();
        });
        return self.outDeferred.promise();
    };


/////////////////////////////// PlayerPool

    /**
     * @param {function(): HTMLElement} domNodeSupplier a function that supply the dom to attach the player
     * @constructor
     */
    mt.player.PlayersPool = function (domNodeSupplier) {
        this.domNodeSupplierFn = domNodeSupplier;
        this.playersByProvider = {youtube: []};
        this.handlesCounter = 0;
    };

    /**
     * Prepares a video and gives back a handle to interact with it.
     *
     * @param {{id: string, provider: string, coarseDuration: number}} video the video the load
     * @param {Array.<{time: number, callback: function}>} cues the cues points
     * @return {mt.player.VideoHandle}
     */
    mt.player.PlayersPool.prototype.prepareVideo = function (video, cues) {
        var uid = 'handle' + this.handlesCounter++;
        return new mt.player.VideoHandle(this, uid, video, cues);
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
                            playerDeferred.resolve(new mt.player.YoutubePlayer(evt.target))
                        }
                    }
                });
            }
        }

        return playerDeferred.promise();
    };

})(window.mt = window.mt || {});
(function (mt) {

    mt.player = {};

    /**
     * @param {YT.Player} delegate
     * @constructor
     */
    mt.player.YoutubePlayer = function (delegate) {
        var self = this;

        self.delegate = delegate;
        self.busy = false;
        self.canPlayThroughDeferred = undefined;
        self.endOfFadeDeferred = undefined;

        self.delegate.addEventListener('onStateChange', function (evt) {
            console.log("State of player " + self.instanceId + ' ' + evt.data);
            if (evt.data === YT.PlayerState.PLAYING) {
                // end of first buffering phase is considered as a can play through event
                if (!self.canPlayThroughDeferred.isResolved()) {
                    self.canPlayThroughDeferred.resolve();
                }
            }
        });
    };

    /**
     * Clears the previous playback state and initialize required objects for the next one.
     */
    mt.player.YoutubePlayer.prototype.reset = function () {
        var self = this;

        // clear previous state
        if (self.canPlayThroughDeferred && !self.canPlayThroughDeferred.isResolved()) {
            self.canPlayThroughDeferred.reject();
        }

        if (self.endOfFadeDeferred && !self.endOfFadeDeferred.isResolved()) {
            self.endOfFadeDeferred.resolve();
        }

        // install new state
        self.canPlayThroughDeferred = Q.defer();
        self.canPlayThroughDeferred.done(function () {
            self.delegate.pauseVideo();
        });

        // make the player silent and invisible
        self.fade('out', true);
    };

    /**
     * Clears the previous playback (stop a execute all promises) and start to load the given video.
     *
     * @param {string} videoId
     * @return {Q.promise} resolved when the video can play through the end without stop
     */
    mt.player.YoutubePlayer.prototype.loadVideo = function (videoId) {
        var self = this;

        self.busy = true;
        self.reset();

        // load the video, and when the video will start to play, we will pause it, see notifyBufferingDone
        self.delegate.loadVideoById({videoId: videoId, suggestedQuality: 'small'});
        return self.canPlayThroughDeferred.promise;
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
     * @return {Q.promise} resolved when the fade operation is finished
     */
    mt.player.YoutubePlayer.prototype.fade = function (direction, immediate) {
        var bounds = {'in': {start: 0, end: 100}, out: {start: 100, end: 0}};
        var self = this;
        if (self.endOfFadeDeferred && !self.endOfFadeDeferred.isResolved()) {
            // there is a pending fade operation, resolve it first
            self.endOfFadeDeferred.resolve();
        }

        self.endOfFadeDeferred = Q.defer();

        var playerStyle = self.delegate.getIframe().style;

        // remove transition and set extreme values when it is resolved
        self.endOfFadeDeferred.done(function () {
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
            playerStyle['-webkit-transition'] = 'opacity ' + this.fadeDuration + 'ms';
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

            self.endOfFadeDeferred.done(function () {
                clearInterval(fadeInterval);
            });
        }

        return self.endOfFadeDeferred.promise;
    };


/////////////////////////////// VideoHandle

    /**
     * @param {mt.player.PlayersPool} playersPool
     * @param {{id: string, provider: string, coarseDuration: number}} video
     * @constructor
     */
    mt.player.VideoHandle = function (playersPool, video) {
        this.playersPool = playersPool;
        this.player = undefined;
        this.video = video;
        this.canPlayThroughDeferred = Q.defer();
        this.outDeferred = Q.defer();
    };

    /**
     * @return {Q.promise} when the video can play through
     */
    mt.player.VideoHandle.prototype.load = function () {
        var self = this;
        self.playersPool.ensurePlayerAvailableForProvider(this.video.provider).done(function (player) {
            self.player = player;
            self.player.loadVideo(self.video).done(self.canPlayThroughDeferred.resolve);
        });
        return self.canPlayThroughDeferred.promise;
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
     * @return {Q.promise} resolved when the fade operation is finished and the player stopped
     */
    mt.player.VideoHandle.prototype.out = function () {
        if (!this.player) throw new Error('The video should be loaded before calling out');

        var self = this;
        self.player.fade('in').done(self.outDeferred.resolve).done(function () {
            self.stopVideo();
        });
        return this.outDeferred.promise;
    };


/////////////////////////////// PlayerPool

    /**
     * @param {function(): HTMLElement} domNodeSupplier a function that supply the dom to attach the player
     * @constructor
     */
    mt.player.PlayersPool = function (domNodeSupplier) {
        this.domNodeSupplierFn = domNodeSupplier;
        this.playersByProvider = {youtube: []};
    };


    /**
     * Prepares a video and gives back a handle to interact with it.
     *
     * @param {{id: string, provider: string, coarseDuration: number}} video the video the load
     * @return {mt.player.VideoHandle}
     */
    mt.player.PlayersPool.prototype.prepareVideo = function (video) {
        return new mt.player.VideoHandle(this, video);
    };

    /**
     * Ensures that there is enough player available for the supplied provider.
     *
     * If all the players for that provider are playing, instantiate a new one.
     *
     * @param {string} provider the video provider name
     * @return {Q.promise} resolved when the player is ready to accept load requests
     */
    mt.player.PlayersPool.prototype.ensurePlayerAvailableForProvider = function (provider) {
        var self = this;
        if (!(provider in self.playersByProvider)) {
            throw new Error("Unknown provider " + provider);
        }

        var playerDeferred = Q.defer();
        var found = false;

        var playersByProvider = self.playersByProvider[provider];
        for (var idx = 0; idx < playersByProvider.length; idx++) {
            var player = playersByProvider[idx];
            if (!player.busy) {
                found = true;
                playerDeferred.resolve(player);
            }
        }

        if (!found) {

            // we need to create a new instance, when done save it
            playerDeferred.done(function (player) {
                self.playersByProvider.push(player);
            });

            // get the dom node where we are going to insert the player
            var domNode = self.domNodeSupplierFn();

            if (provider === 'youtube') {
                new YT.Player(domNode, {
                    height: '390',
                    width: '640',
                    playerVars: {
                        controls: 0,
                        showinfo: 0,
                        iv_load_policy: 3,
                        disablekb: 1
                    },
                    events: {
                        onReady: function (evt) {
                            playerDeferred.resolve(new mt.player.YoutubePlayer(evt.target))
                        }
                    }
                });
            }
        }

        return playerDeferred.promise;
    };

})(window.mt = window.mt || {});
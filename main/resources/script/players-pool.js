(function (mt) {

    mt.player = {
        /** @constructor */
        YoutubePlayer: function () {

        },

        /** @constructor */
        VideoHandle: function (playersPool, video) {
            /** @type {mt.player.PlayersPool}*/
            this.playersPool = playersPool;
            this.player = undefined;
            this.video = video;
            this.canPlayTroughDeferred = Q.defer();
            this.outDeferred = Q.defer();
        },

        /** @constructor */
        PlayersPool: function () {
            this.playersByType = {};
        }
    };

    mt.player.YoutubePlayer.prototype.clear = function () {
        self.canPlayTroughDeferred.reject();
    };

    mt.player.YoutubePlayer.prototype.init = function () {
        var self = this;
        self.canPlayTroughDeferred = Q.defer();
    };

    /**
     * Clears the previous playback (stop a execute all promises) and start to load the given video.
     *
     * @param {string} videoId
     * @return {Q.promise} resolved when the video can play through the end without stop
     */
    mt.player.YoutubePlayer.prototype.loadVideo = function (videoId) {
        var self = this;

        self.clear();
        self.init();


        // load the video, and when the video will start to play, we will pause it, see notifyBufferingDone
        self.delegate.loadVideoById({videoId: videoId, suggestedQuality: 'small'});
        return self.canPlayTroughDeferred.promise;
    };

    mt.player.YoutubePlayer.prototype.playVideo = function () {
        this.delegate.playVideo();
    };


    mt.player.VideoHandle.prototype.load = function () {
        var self = this;
        self.playersPool.ensurePlayerAvailableForProvider(this.video.provider).done(function (player) {
            self.player = player;
            self.player.loadVideo(self.video).done(self.canPlayTroughDeferred.resolve);
        });
        return self.canPlayTroughDeferred.promise;
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
        self.player.fadeOut('in').done(self.outDeferred.resolve).done(function () {
            self.stopVideo();
        });
        return this.outDeferred.promise;
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
     */
    mt.player.PlayersPool.prototype.ensurePlayerAvailableForProvider = function (provider) {

    };


})(window.mt = window.mt || {});


// usage

var pool = new mt.player.PlayersPool();

var handle = pool.prepareVideo({id: 'hjklkoo', provider: 'youtube', coarseDuration: 1000});




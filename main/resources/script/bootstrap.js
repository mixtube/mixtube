(function (mt) {
    mt.MixTubeApp = angular.module('mtMixTubeApp', ['ngResource'])
        .config(function ($locationProvider) {
            $locationProvider.html5Mode(true);
        }).run(function ($rootScope, mtYoutubeClient) {
            var wordCharRegExp = /\w/;
            document.addEventListener('keyup', function (evt) {
                var convertedString = String.fromCharCode(evt.which);
                if (wordCharRegExp.test(convertedString)) {
                    $rootScope.$apply(function () {
                        $rootScope.$broadcast(mt.events.OpenSearchFrameRequest, {typedChar: convertedString});
                    });
                }
            });


            // used to generate a static array of videos for test purposes
            var dumpSearch = function () {
                var callCount = 0;
                mtYoutubeClient.searchVideosByQuery('booba', function (videos) {
                    if (++callCount === 3) {
                        console.log(JSON.stringify(videos));
                    }
                });
            };

            // dumpSearch();
        });

    mt.events = {
        LoadPlaylistEntryRequest: 'LoadPlaylistEntryRequest',
        NextPlaylistEntryRequest: 'NextPlaylistEntryRequest',
        OpenSearchFrameRequest: 'OpenSearchFrameRequest',
        AppendVideoToPlaylistRequest: 'AppendVideoToPlaylistRequest',
        PlayersPoolReady: 'PlayersPoolReady',
        PlaylistModified: 'PlaylistModified',
        PlaylistEntryActivated: 'PlaylistEntryActivated'
    };

    mt.model = {
        Video: function () {
            this.id = undefined;
            this.title = undefined;
            this.thumbnailUrl = undefined;
            this.duration = undefined;
            this.viewCount = undefined;
            this.provider = undefined;
        },
        PlaylistEntry: function () {
            this.id = undefined;
            this.video = undefined;
        }
    };

    mt.tools = {__uniqueIdCounter: 0};
    mt.tools.findWhere = function (array, attrs) {
        var result = array.filter(function (value) {
            for (var key in attrs) {
                if (attrs[key] !== value[key]) return false;
            }
            return true;
        });
        return result.length > 0 ? result[0] : null;
    };
    mt.tools.uniqueId = function () {
        return 'mt_uid_' + mt.tools.__uniqueIdCounter++;
    };
    mt.tools.TEST_VIDEOS = [
        {"id": "nSrPHC2yoQE", "title": "ROHFF INTERVIEW EXCLUSIVE - 1ER COUPLET DU CLASH SUR BOOBA ET DATE DE SORTIE DU PDRG", "thumbnailUrl": "https://i.ytimg.com/vi/nSrPHC2yoQE/mqdefault.jpg", "duration": 817000, "viewCount": "14215", "provider": "youtube", "publisherName": "Reskype Contenders / Rapandclash"},
        {"id": "XoygscHpDgw", "title": "Booba : tout sur le clash avec Rohff et La Fouine [2013]", "thumbnailUrl": "https://i.ytimg.com/vi/XoygscHpDgw/mqdefault.jpg", "duration": 408000, "viewCount": "485427", "provider": "youtube", "publisherName": "MusiqueMag"},
        {"id": "mzNczfOxDGo", "title": "Booba VS La Fouine et Dixon (Banlieue Sale)", "thumbnailUrl": "https://i.ytimg.com/vi/mzNczfOxDGo/mqdefault.jpg", "duration": 141000, "viewCount": "1987857", "provider": "youtube", "publisherName": "Booba"},
        {"id": "ElxmUn4QZP0", "title": "De Boulbi à Miami, documentaire sur Booba ( Officiel, qualité HD )", "thumbnailUrl": "https://i.ytimg.com/vi/ElxmUn4QZP0/mqdefault.jpg", "duration": 3182000, "viewCount": "161994", "provider": "youtube", "publisherName": "Chaîne de D3moniac38"},
        {"id": "6lQaTSZa_Vc", "title": "Booba vs. La Fouine à Miami [Analyse de la vidéo]", "thumbnailUrl": "https://i.ytimg.com/vi/6lQaTSZa_Vc/mqdefault.jpg", "duration": 237000, "viewCount": "138098", "provider": "youtube", "publisherName": "Jamil Hassan"},
        {"id": "Ww9UGWypR6k", "title": "Booba frappe La Fouine et Dixon à Miami (ralentis et explications)", "thumbnailUrl": "https://i.ytimg.com/vi/Ww9UGWypR6k/mqdefault.jpg", "duration": 241000, "viewCount": "18542", "provider": "youtube", "publisherName": "Sevenair Sentinel"},
        {"id": "2x3A6pBrOgA", "title": "La Fouine dans T.P.A.M.P parle de la bagarre BOOBA vs LA FOUINE et DIXON (banlieue sale)", "thumbnailUrl": "https://i.ytimg.com/vi/2x3A6pBrOgA/mqdefault.jpg", "duration": 840000, "viewCount": "170917", "provider": "youtube", "publisherName": "clourdiciabonnetoi"},
        {"id": "tsk1zuf5g9o", "title": "Les deux versions de Booba Vs. La Fouine & Dixon", "thumbnailUrl": "https://i.ytimg.com/vi/tsk1zuf5g9o/mqdefault.jpg", "duration": 298000, "viewCount": "41176", "provider": "youtube", "publisherName": "AtlasOffishial │ Entertainement channel !"},
        {"id": "AFNEBA8sLJ0", "title": "Booba - Maître Yoda", "thumbnailUrl": "https://i.ytimg.com/vi/AFNEBA8sLJ0/mqdefault.jpg", "duration": 277000, "viewCount": "4314914", "provider": "youtube", "publisherName": "Booba"},
        {"id": "FLFL_qt9gRg", "title": "LIM SOUTIEN BOOBA", "thumbnailUrl": "https://i.ytimg.com/vi/FLFL_qt9gRg/mqdefault.jpg", "duration": 711000, "viewCount": "8555", "provider": "youtube", "publisherName": "BOOBAOFFICIALMUSIC"},
        {"id": "TRjffvEsVA8", "title": "La fouine vs Booba - Vrai histoire [ Vidéo Entière ]", "thumbnailUrl": "https://i.ytimg.com/vi/TRjffvEsVA8/mqdefault.jpg", "duration": 178000, "viewCount": "12192", "provider": "youtube", "publisherName": "Vericsnake : Abonnez vous à la chaine"},
        {"id": "Jt_mfcf0ztg", "title": "Booba - A.C. Milan", "thumbnailUrl": "https://i.ytimg.com/vi/Jt_mfcf0ztg/mqdefault.jpg", "duration": 281000, "viewCount": "11814756", "provider": "youtube", "publisherName": "Booba"},
        {"id": "LMrEEj9_Zaw", "title": "cortex reagit a la baguarre booba vs la fouine !!!", "thumbnailUrl": "https://i.ytimg.com/vi/LMrEEj9_Zaw/mqdefault.jpg", "duration": 106000, "viewCount": "77958", "provider": "youtube", "publisherName": "Chaîne de cortex91officiel"},
        {"id": "3q3vTegg9yc", "title": "Booba - T.L.T", "thumbnailUrl": "https://i.ytimg.com/vi/3q3vTegg9yc/mqdefault.jpg", "duration": 311000, "viewCount": "5505947", "provider": "youtube", "publisherName": "Booba"},
        {"id": "XVuDoruuH5g", "title": "Booba VS La Fouine et Dixon par KAS'PROD", "thumbnailUrl": "https://i.ytimg.com/vi/XVuDoruuH5g/mqdefault.jpg", "duration": 140000, "viewCount": "65236", "provider": "youtube", "publisherName": "KASPROD"},
        {"id": "35FbLhYG86M", "title": "Booba - Tombé pour elle", "thumbnailUrl": "https://i.ytimg.com/vi/35FbLhYG86M/mqdefault.jpg", "duration": 340000, "viewCount": "10199843", "provider": "youtube", "publisherName": "Booba"},
        {"id": "bunATd9KWOc", "title": "Dam16 - Booba est un grand a moi mais je ne suis pas son petit part 1", "thumbnailUrl": "https://i.ytimg.com/vi/bunATd9KWOc/mqdefault.jpg", "duration": 601000, "viewCount": "48027", "provider": "youtube", "publisherName": "N-DA-HOOD.COM"},
        {"id": "alA6RVBi3_0", "title": "Ce que pense VRAIMENT la rue du clash BOOBA , LA FOUINE , ROHFF !!!", "thumbnailUrl": "https://i.ytimg.com/vi/alA6RVBi3_0/mqdefault.jpg", "duration": 1081000, "viewCount": "147849", "provider": "youtube", "publisherName": "VANTARD - CHAINE OFFICIELLE ;)"},
        {"id": "oBbHo8b4FDc", "title": "Booba feat Kaaris - Kalash", "thumbnailUrl": "https://i.ytimg.com/vi/oBbHo8b4FDc/mqdefault.jpg", "duration": 270000, "viewCount": "4113900", "provider": "youtube", "publisherName": "Booba"},
        {"id": "9YwN5ywiF20", "title": "Rohff : 1er Couplet Reponse Du Clash De Booba", "thumbnailUrl": "https://i.ytimg.com/vi/9YwN5ywiF20/mqdefault.jpg", "duration": 78000, "viewCount": "2928", "provider": "youtube", "publisherName": "Swagg TV"}
    ];

// executed when the Youtube player API is ready, it actually instantiate the players pool and notify the application
// that it is ready
    window.onYouTubeIframeAPIReady = function () {
        var playersPool = new mt.player.PlayersPool(function () {
            var playerDiv = document.createElement('div');
            playerDiv.classList.add('mt-player-frame');
            document.getElementById('mt-video-window').appendChild(playerDiv);
            return playerDiv;
        });

        var rootScope = angular.element(document).scope();
        rootScope.$apply(function () {
            rootScope.$broadcast(mt.events.PlayersPoolReady, playersPool);
        });
    };
})(window.mt = window.mt || {});
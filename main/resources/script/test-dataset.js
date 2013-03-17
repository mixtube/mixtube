(function (mt) {
    mt.MixTubeApp.run(function ($rootScope, mtYoutubeClient) {
        // used to generate a static array of videos for test purposes
        var dumpSearch = function () {
            var callCount = 0;
            mtYoutubeClient.searchVideosByQuery('young jeezy', function (videos) {
                if (++callCount === 3) {
                    console.log(JSON.stringify(videos));
                }
            });
        };

//        dumpSearch();
    });

    mt.tools.TEST_VIDEOS = [
        {"id": "EVtuaAGX7iw", "title": "Juicy J - Show Out (Explicit) ft. Big Sean, Young Jeezy", "thumbnailUrl": "https://i.ytimg.com/vi/EVtuaAGX7iw/mqdefault.jpg", "duration": 344000, "viewCount": "3729480", "provider": "youtube", "publisherName": "TheJuicyJVEVO"},
        {"id": "myxojwq22-Q", "title": "Young Jeezy - Get Right (Explicit)", "thumbnailUrl": "https://i.ytimg.com/vi/myxojwq22-Q/mqdefault.jpg", "duration": 226000, "viewCount": "2824706", "provider": "youtube", "publisherName": "Young Jeezy"},
        {"id": "JvXf0NaPZHw", "title": "Trinidad James ft. 2 Chainz, TI, Young Jeezy - All Gold Everything Remix (OFFICIAL MUSIC VIDEO)", "thumbnailUrl": "https://i.ytimg.com/vi/JvXf0NaPZHw/mqdefault.jpg", "duration": 287000, "viewCount": "775965", "provider": "youtube", "publisherName": "Yungpeewee27"},
        {"id": "-3YLvp44xnw", "title": "All Gold Everything LYRICS REMIX (CLEAN) Trinidad James T.I Young Jeezy 2Chainz", "thumbnailUrl": "https://i.ytimg.com/vi/-3YLvp44xnw/mqdefault.jpg", "duration": 280000, "viewCount": "11", "provider": "youtube", "publisherName": "SUSCRIBE AD ME COMMENT ON MA C"},
        {"id": "iAgRUYTyIWA", "title": "Jay-Z Performs During So So Def 20th Anniversary Concert + Young Jeezy Raps \"R.I.P.\"", "thumbnailUrl": "https://i.ytimg.com/vi/iAgRUYTyIWA/mqdefault.jpg", "duration": 378000, "viewCount": "33042", "provider": "youtube", "publisherName": "Straight From The \"A\" TV"},
        {"id": "q-q7VCNzrWM", "title": "Juicy J - Show Out (Explicit) ft. Big Sean, Young Jeezy", "thumbnailUrl": "https://i.ytimg.com/vi/q-q7VCNzrWM/mqdefault.jpg", "duration": 256000, "viewCount": "38", "provider": "youtube", "publisherName": "The Midnight Son (•¿•)"},
        {"id": "n5mq6fRBdl8", "title": "Young Jeezy - How It Feel (Official Video)", "thumbnailUrl": "https://i.ytimg.com/vi/n5mq6fRBdl8/mqdefault.jpg", "duration": 291000, "viewCount": "860071", "provider": "youtube", "publisherName": "Young Jeezy"},
        {"id": "EXbAy11QVzQ", "title": "Young Jeezy - R.I.P. ft. 2 Chainz (It's Tha World)", "thumbnailUrl": "https://i.ytimg.com/vi/EXbAy11QVzQ/mqdefault.jpg", "duration": 205000, "viewCount": "2625619", "provider": "youtube", "publisherName": "mixorb"},
        {"id": "w45azm6HdAA", "title": "T.I. x Young Jeezy x Trinidad James x B.o.B. x Trae LIVE All-Star Houston 2013", "thumbnailUrl": "https://i.ytimg.com/vi/w45azm6HdAA/mqdefault.jpg", "duration": 777000, "viewCount": "1699", "provider": "youtube", "publisherName": "MoBangMedia.com"},
        {"id": "XL7D4vw7ImQ", "title": "(Un Cut) Young Jeezy talks BET Awards fight with Rick Ross and beef with Gucci Mane", "thumbnailUrl": "https://i.ytimg.com/vi/XL7D4vw7ImQ/mqdefault.jpg", "duration": 560000, "viewCount": "16497", "provider": "youtube", "publisherName": "TheTrilllMusic"},
        {"id": "Km3ooOZAm5Q", "title": "Young Jeezy - Who Am I Series: Short Documentary 2013", "thumbnailUrl": "https://i.ytimg.com/vi/Km3ooOZAm5Q/mqdefault.jpg", "duration": 236000, "viewCount": "9132", "provider": "youtube", "publisherName": "Pardeep Dhillon Media"},
        {"id": "gczBgNB-p1w", "title": "Young Jeezy - Soul Survivor ft. Akon", "thumbnailUrl": "https://i.ytimg.com/vi/gczBgNB-p1w/mqdefault.jpg", "duration": 264000, "viewCount": "13867206", "provider": "youtube", "publisherName": "Young Jeezy"},
        {"id": "tkm8qRRoQIM", "title": "MGK - Hold On (Shut Up) ft. Young Jeezy", "thumbnailUrl": "https://i.ytimg.com/vi/tkm8qRRoQIM/mqdefault.jpg", "duration": 252000, "viewCount": "3097285", "provider": "youtube", "publisherName": "MGKVEVO's channel"},
        {"id": "ONhLFzc_kGc", "title": "Freddie Gibbs Disses Young Jeezy! Says He's NOT \"The Return Of The Real\"", "thumbnailUrl": "https://i.ytimg.com/vi/ONhLFzc_kGc/mqdefault.jpg", "duration": 861000, "viewCount": "38646", "provider": "youtube", "publisherName": "MoneyStacksMatt"},
        {"id": "wUjfWwqFcFI", "title": "Young Jeezy - I Luv It", "thumbnailUrl": "https://i.ytimg.com/vi/wUjfWwqFcFI/mqdefault.jpg", "duration": 252000, "viewCount": "9361491", "provider": "youtube", "publisherName": "Young Jeezy"},
        {"id": "0LtxJZuLA2Q", "title": "Trinidad James, Young Jeezy & T.I. - All Gold Everything (Remix) Reign Nightclub", "thumbnailUrl": "https://i.ytimg.com/vi/0LtxJZuLA2Q/mqdefault.jpg", "duration": 162000, "viewCount": "32937", "provider": "youtube", "publisherName": "Intricate Images"},
        {"id": "W6iTvGgtYPE", "title": "Young Jeezy -  El Jefe Intro [video] [Its Tha World]", "thumbnailUrl": "https://i.ytimg.com/vi/W6iTvGgtYPE/mqdefault.jpg", "duration": 233000, "viewCount": "51448", "provider": "youtube", "publisherName": "Dedication 4 - Lil Wayne Mixtape"},
        {"id": "9CiXZ23Unec", "title": "Young Jeezy - F.A.M.E. ft. T.I.", "thumbnailUrl": "https://i.ytimg.com/vi/9CiXZ23Unec/mqdefault.jpg", "duration": 254000, "viewCount": "8172301", "provider": "youtube", "publisherName": "Young Jeezy"},
        {"id": "VB8l4tGv0Wc", "title": "Young Jeezy - Way Too Gone (Explicit) ft. Future", "thumbnailUrl": "https://i.ytimg.com/vi/VB8l4tGv0Wc/mqdefault.jpg", "duration": 301000, "viewCount": "2766814", "provider": "youtube", "publisherName": "Young Jeezy"},
        {"id": "3B3EgW5zvKU", "title": "Young Jeezy - Leave You Alone (Explicit) ft. Ne-Yo", "thumbnailUrl": "https://i.ytimg.com/vi/3B3EgW5zvKU/mqdefault.jpg", "duration": 435000, "viewCount": "7053501", "provider": "youtube", "publisherName": "Young Jeezy"}
    ];
})(window.mt = window.mt || {});
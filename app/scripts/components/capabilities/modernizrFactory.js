function modernizerFactory() {

  // this local object is to fake the window object where "Modernizr" will be added
  var local = {};

  /*!
   * modernizr v3.0.0-alpha.4
   * Build http://modernizr.com/download/#-videoautoplay-dontmin
   *
   * Copyright (c)
   *  Faruk Ates
   *  Paul Irish
   *  Alex Sexton
   *  Ryan Seddon
   *  Alexander Farkas
   *  Patrick Kettner
   *  Stu Cox
   *  Richard Herrera

   * MIT License
   */

  /*
   * Modernizr tests which native CSS3 and HTML5 features are available in the
   * current UA and makes the results available to you in two ways: as properties on
   * a global `Modernizr` object, and as classes on the `<html>` element. This
   * information allows you to progressively enhance your pages with a granular level
   * of control over the experience.
   */

  ;
  (function(window, document, undefined) {
    var classes = [];


    /**
     * is returns a boolean if the typeof an obj is exactly type.
     *
     * @access private
     * @function is
     * @param {*} obj - A thing we want to check the type of
     * @param {string} type - A string to compare the typeof against
     * @returns {boolean}
     */

    function is(obj, type) {
      return typeof obj === type;
    }
    ;

    /**
     * docElement is a convenience wrapper to grab the root element of the document
     *
     * @access private
     * @returns {HTMLElement|SVGElement} The root element of the document
     */

    var docElement = document.documentElement;


    var tests = [];


    /**
     *
     * ModernizrProto is the constructor for Modernizr
     *
     * @class
     * @access public
     */

    var ModernizrProto = {
      // The current version, dummy
      _version: '3.0.0-alpha.4',

      // Any settings that don't work as separate modules
      // can go in here as configuration.
      _config: {
        'classPrefix': '',
        'enableClasses': true,
        'enableJSClass': true,
        'usePrefixes': true
      },

      // Queue of tests
      _q: [],

      // Stub these for people who are listening
      on: function(test, cb) {
        // I don't really think people should do this, but we can
        // safe guard it a bit.
        // -- NOTE:: this gets WAY overridden in src/addTest for actual async tests.
        // This is in case people listen to synchronous tests. I would leave it out,
        // but the code to *disallow* sync tests in the real version of this
        // function is actually larger than this.
        var self = this;
        setTimeout(function() {
          cb(self[test]);
        }, 0);
      },

      addTest: function(name, fn, options) {
        tests.push({name: name, fn: fn, options: options});
      },

      addAsyncTest: function(fn) {
        tests.push({name: null, fn: fn});
      }
    };



    // Fake some of Object.create so we can force non test results to be non "own" properties.
    var Modernizr = function() {
    };
    Modernizr.prototype = ModernizrProto;

    // Leak modernizr globally when you `require` it rather than force it here.
    // Overwrite name so constructor name is nicer :D
    Modernizr = new Modernizr();



    /**
     * Run through all tests and detect their support in the current UA.
     *
     * @access private
     */

    function testRunner() {
      var featureNames;
      var feature;
      var aliasIdx;
      var result;
      var nameIdx;
      var featureName;
      var featureNameSplit;

      for (var featureIdx in tests) {
        featureNames = [];
        feature = tests[featureIdx];
        // run the test, throw the return value into the Modernizr,
        // then based on that boolean, define an appropriate className
        // and push it into an array of classes we'll join later.
        //
        // If there is no name, it's an 'async' test that is run,
        // but not directly added to the object. That should
        // be done with a post-run addTest call.
        if (feature.name) {
          featureNames.push(feature.name.toLowerCase());

          if (feature.options && feature.options.aliases && feature.options.aliases.length) {
            // Add all the aliases into the names list
            for (aliasIdx = 0; aliasIdx < feature.options.aliases.length; aliasIdx++) {
              featureNames.push(feature.options.aliases[aliasIdx].toLowerCase());
            }
          }
        }

        // Run the test, or use the raw value if it's not a function
        result = is(feature.fn, 'function') ? feature.fn() : feature.fn;


        // Set each of the names on the Modernizr object
        for (nameIdx = 0; nameIdx < featureNames.length; nameIdx++) {
          featureName = featureNames[nameIdx];
          // Support dot properties as sub tests. We don't do checking to make sure
          // that the implied parent tests have been added. You must call them in
          // order (either in the test, or make the parent test a dependency).
          //
          // Cap it to TWO to make the logic simple and because who needs that kind of subtesting
          // hashtag famous last words
          featureNameSplit = featureName.split('.');

          if (featureNameSplit.length === 1) {
            Modernizr[featureNameSplit[0]] = result;
          } else {
            // cast to a Boolean, if not one already
            /* jshint -W053 */
            if (Modernizr[featureNameSplit[0]] && !(Modernizr[featureNameSplit[0]] instanceof Boolean)) {
              Modernizr[featureNameSplit[0]] = new Boolean(Modernizr[featureNameSplit[0]]);
            }

            Modernizr[featureNameSplit[0]][featureNameSplit[1]] = result;
          }

          classes.push((result ? '' : 'no-') + featureNameSplit.join('-'));
        }
      }
    }

    ;

    /**
     * hasOwnProp is a shim for hasOwnProperty that is needed for Safari 2.0 support
     *
     * @author kangax
     * @access private
     * @function hasOwnProp
     * @param {object} object - The object to check for a property
     * @param {string} property - The property to check for
     * @returns {boolean}
     */

    // hasOwnProperty shim by kangax needed for Safari 2.0 support
    var hasOwnProp;

    (function() {
      var _hasOwnProperty = ({}).hasOwnProperty;
      /* istanbul ignore else */
      /* we have no way of testing IE 5.5 or safari 2,
       * so just assume the else gets hit */
      if (!is(_hasOwnProperty, 'undefined') && !is(_hasOwnProperty.call, 'undefined')) {
        hasOwnProp = function(object, property) {
          return _hasOwnProperty.call(object, property);
        };
      }
      else {
        hasOwnProp = function(object, property) { /* yes, this can give false positives/negatives, but most of the time we don't care about those */
          return ((property in object) && is(object.constructor.prototype[property], 'undefined'));
        };
      }
    })();



    /**
     * A convenience helper to check if the document we are running in is an SVG document
     *
     * @access private
     * @returns {boolean}
     */

    var isSVG = docElement.nodeName.toLowerCase() === 'svg';


    /**
     * createElement is a convenience wrapper around document.createElement. Since we
     * use createElement all over the place, this allows for (slightly) smaller code
     * as well as abstracting away issues with creating elements in contexts other than
     * HTML documents (e.g. SVG documents).
     *
     * @access private
     * @function createElement
     * @returns {HTMLElement|SVGElement} An HTML or SVG element
     */

    function createElement() {
      if (typeof document.createElement !== 'function') {
        // This is the case in IE7, where the type of createElement is "object".
        // For this reason, we cannot call apply() as Object is not a Function.
        return document.createElement(arguments[0]);
      } else if (isSVG) {
        return document.createElementNS.call(document, 'http://www.w3.org/2000/svg', arguments[0]);
      } else {
        return document.createElement.apply(document, arguments);
      }
    }

    ;
    /*!
     {
     "name": "HTML5 Video",
     "property": "video",
     "caniuse": "video",
     "tags": ["html5"],
     "knownBugs": [
     "Without QuickTime, `Modernizr.video.h264` will be `undefined`; http://github.com/Modernizr/Modernizr/issues/546"
     ],
     "polyfills": [
     "html5media",
     "mediaelementjs",
     "sublimevideo",
     "videojs",
     "leanbackplayer",
     "videoforeverybody"
     ]
     }
     !*/
    /* DOC
     Detects support for the video element, as well as testing what types of content it supports.

     Subproperties are provided to describe support for `ogg`, `h264` and `webm` formats, e.g.:

     ```javascript
     Modernizr.video         // true
     Modernizr.video.ogg     // 'probably'
     ```
     */

    // Codec values from : github.com/NielsLeenheer/html5test/blob/9106a8/index.html#L845
    //                     thx to NielsLeenheer and zcorpan

    // Note: in some older browsers, "no" was a return value instead of empty string.
    //   It was live in FF3.5.0 and 3.5.1, but fixed in 3.5.2
    //   It was also live in Safari 4.0.0 - 4.0.4, but fixed in 4.0.5

    Modernizr.addTest('video', function() {
      /* jshint -W053 */
      var elem = createElement('video');
      var bool = false;

      // IE9 Running on Windows Server SKU can cause an exception to be thrown, bug #224
      try {
        if (bool = !!elem.canPlayType) {
          bool = new Boolean(bool);
          bool.ogg = elem.canPlayType('video/ogg; codecs="theora"').replace(/^no$/, '');

          // Without QuickTime, this value will be `undefined`. github.com/Modernizr/Modernizr/issues/546
          bool.h264 = elem.canPlayType('video/mp4; codecs="avc1.42E01E"').replace(/^no$/, '');

          bool.webm = elem.canPlayType('video/webm; codecs="vp8, vorbis"').replace(/^no$/, '');

          bool.vp9 = elem.canPlayType('video/webm; codecs="vp9"').replace(/^no$/, '');

          bool.hls = elem.canPlayType('application/x-mpegURL; codecs="avc1.42E01E"').replace(/^no$/, '');
        }
      } catch (e) {
      }

      return bool;
    });


    /**
     * setClasses takes an array of class names and adds them to the root element
     *
     * @access private
     * @function setClasses
     * @param {string[]} classes - Array of class names
     */

    // Pass in an and array of class names, e.g.:
    //  ['no-webp', 'borderradius', ...]
    function setClasses(classes) {
      var className = docElement.className;
      var classPrefix = Modernizr._config.classPrefix || '';

      if (isSVG) {
        className = className.baseVal;
      }

      // Change `no-js` to `js` (independently of the `enableClasses` option)
      // Handle classPrefix on this too
      if (Modernizr._config.enableJSClass) {
        var reJS = new RegExp('(^|\\s)' + classPrefix + 'no-js(\\s|$)');
        className = className.replace(reJS, '$1' + classPrefix + 'js$2');
      }

      if (Modernizr._config.enableClasses) {
        // Add the new classes
        className += ' ' + classPrefix + classes.join(' ' + classPrefix);
        isSVG ? docElement.className.baseVal = className : docElement.className = className;
      }

    }

    ;


    // _l tracks listeners for async tests, as well as tests that execute after the initial run
    ModernizrProto._l = {};

    /**
     * Modernizr.on is a way to listen for the completion of async tests. Being
     * asynchronous, they may not finish before your scripts run. As a result you
     * will get a possibly false negative `undefined` value.
     *
     * @memberof Modernizr
     * @name Modernizr.on
     * @access public
     * @function on
     * @param {string} feature - String name of the feature detect
     * @param {function} cb - Callback function returning a Boolean - true if feature is supported, false if not
     * @example
     *
     * ```js
     * Modernizr.on('flash', function( result ) {
   *   if (result) {
   *    // the browser has flash
   *   } else {
   *     // the browser does not have flash
   *   }
   * });
     * ```
     */

    ModernizrProto.on = function(feature, cb) {
      // Create the list of listeners if it doesn't exist
      if (!this._l[feature]) {
        this._l[feature] = [];
      }

      // Push this test on to the listener list
      this._l[feature].push(cb);

      // If it's already been resolved, trigger it on next tick
      if (Modernizr.hasOwnProperty(feature)) {
        // Next Tick
        setTimeout(function() {
          Modernizr._trigger(feature, Modernizr[feature]);
        }, 0);
      }
    };

    /**
     * _trigger is the private function used to signal test completion and run any
     * callbacks registered through [Modernizr.on](#modernizr-on)
     *
     * @memberof Modernizr
     * @name Modernizr._trigger
     * @access private
     * @function _trigger
     * @param {string} feature - string name of the feature detect
     * @param {function|boolean} [res] - A feature detection function, or the boolean =
     * result of a feature detection function
     */

    ModernizrProto._trigger = function(feature, res) {
      if (!this._l[feature]) {
        return;
      }

      var cbs = this._l[feature];

      // Force async
      setTimeout(function() {
        var i, cb;
        for (i = 0; i < cbs.length; i++) {
          cb = cbs[i];
          cb(res);
        }
      }, 0);

      // Don't trigger these again
      delete this._l[feature];
    };

    /**
     * addTest allows you to define your own feature detects that are not currently
     * included in Modernizr (under the covers it's the exact same code Modernizr
     * uses for its own [feature detections](https://github.com/Modernizr/Modernizr/tree/master/feature-detects)). Just like the offical detects, the result
     * will be added onto the Modernizr object, as well as an appropriate className set on
     * the html element when configured to do so
     *
     * @memberof Modernizr
     * @name Modernizr.addTest
     * @optionName Modernizr.addTest()
     * @optionProp addTest
     * @access public
     * @function addTest
     * @param {string|object} feature - The string name of the feature detect, or an
     * object of feature detect names and test
     * @param {function|boolean} test - Function returning true if feature is supported,
     * false if not. Otherwise a boolean representing the results of a feature detection
     * @example
     *
     * The most common way of creating your own feature detects is by calling
     * `Modernizr.addTest` with a string (preferably just lowercase, without any
     * punctuation), and a function you want executed that will return a boolean result
     *
     * ```js
     * Modernizr.addTest('itsTuesday', function() {
   *  var d = new Date();
   *  return d.getDay() === 2;
   * });
     * ```
     *
     * When the above is run, it will set Modernizr.itstuesday to `true` when it is tuesday,
     * and to `false` every other day of the week. One thing to notice is that the names of
     * feature detect functions are always lowercased when added to the Modernizr object. That
     * means that `Modernizr.itsTuesday` will not exist, but `Modernizr.itstuesday` will.
     *
     *
     *  Since we only look at the returned value from any feature detection function,
     *  you do not need to actually use a function. For simple detections, just passing
     *  in a statement that will return a boolean value works just fine.
     *
     * ```js
     * Modernizr.addTest('hasJquery', 'jQuery' in window);
     * ```
     *
     * Just like before, when the above runs `Modernizr.hasjquery` will be true if
     * jQuery has been included on the page. Not using a function saves a small amount
     * of overhead for the browser, as well as making your code much more readable.
     *
     * Finally, you also have the ability to pass in an object of feature names and
     * their tests. This is handy if you want to add multiple detections in one go.
     * The keys should always be a string, and the value can be either a boolean or
     * function that returns a boolean.
     *
     * ```js
     * var detects = {
   *  'hasjquery': 'jQuery' in window,
   *  'itstuesday': function() {
   *    var d = new Date();
   *    return d.getDay() === 2;
   *  }
   * }
     *
     * Modernizr.addTest(detects);
     * ```
     *
     * There is really no difference between the first methods and this one, it is
     * just a convenience to let you write more readable code.
     */

    function addTest(feature, test) {

      if (typeof feature == 'object') {
        for (var key in feature) {
          if (hasOwnProp(feature, key)) {
            addTest(key, feature[key]);
          }
        }
      } else {

        feature = feature.toLowerCase();
        var featureNameSplit = feature.split('.');
        var last = Modernizr[featureNameSplit[0]];

        // Again, we don't check for parent test existence. Get that right, though.
        if (featureNameSplit.length == 2) {
          last = last[featureNameSplit[1]];
        }

        if (typeof last != 'undefined') {
          // we're going to quit if you're trying to overwrite an existing test
          // if we were to allow it, we'd do this:
          //   var re = new RegExp("\\b(no-)?" + feature + "\\b");
          //   docElement.className = docElement.className.replace( re, '' );
          // but, no rly, stuff 'em.
          return Modernizr;
        }

        test = typeof test == 'function' ? test() : test;

        // Set the value (this is the magic, right here).
        if (featureNameSplit.length == 1) {
          Modernizr[featureNameSplit[0]] = test;
        } else {
          // cast to a Boolean, if not one already
          /* jshint -W053 */
          if (Modernizr[featureNameSplit[0]] && !(Modernizr[featureNameSplit[0]] instanceof Boolean)) {
            Modernizr[featureNameSplit[0]] = new Boolean(Modernizr[featureNameSplit[0]]);
          }

          Modernizr[featureNameSplit[0]][featureNameSplit[1]] = test;
        }

        // Set a single class (either `feature` or `no-feature`)
        /* jshint -W041 */
        setClasses([(!!test && test != false ? '' : 'no-') + featureNameSplit.join('-')]);
        /* jshint +W041 */

        // Trigger the event
        Modernizr._trigger(feature, test);
      }

      return Modernizr; // allow chaining.
    }

    // After all the tests are run, add self to the Modernizr prototype
    Modernizr._q.push(function() {
      ModernizrProto.addTest = addTest;
    });



    /*!
     {
     "name": "Video Autoplay",
     "property": "videoautoplay",
     "tags": ["video"],
     "async" : true,
     "warnings": ["This test is very large – only include it if you absolutely need it"],
     "knownBugs": ["crashes with an alert on iOS7 when added to homescreen"]
     }
     !*/
    /* DOC
     Checks for support of the autoplay attribute of the video element.
     */


    Modernizr.addAsyncTest(function() {
      var timeout;
      var waitTime = 300;
      var elem = createElement('video');
      var elemStyle = elem.style;

      function testAutoplay(arg) {
        clearTimeout(timeout);
        elem.removeEventListener('playing', testAutoplay, false);
        addTest('videoautoplay', arg && arg.type === 'playing' || elem.currentTime !== 0);
        elem.parentNode.removeChild(elem);
      }

      //skip the test if video itself, or the autoplay
      //element on it isn't supported
      if (!Modernizr.video || !('autoplay' in elem)) {
        addTest('videoautoplay', false);
        return;
      }

      elemStyle.position = 'absolute';
      elemStyle.height = 0;
      elemStyle.width = 0;

      try {
        if (Modernizr.video.ogg) {
          elem.src = 'data:video/ogg;base64,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';
        }
        else if (Modernizr.video.h264) {
          elem.src = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAz5tb292AAAAbG12aGQAAAAAzaNacc2jWnEAAV+QAAFfkAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAGGlvZHMAAAAAEICAgAcAT////3//AAACQ3RyYWsAAABcdGtoZAAAAAHNo1pxzaNacQAAAAEAAAAAAAFfkAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAEAAAABAAAAAAAd9tZGlhAAAAIG1kaGQAAAAAzaNacc2jWnEAAV+QAAFfkFXEAAAAAAAhaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAAAAAAGWbWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAABVnN0YmwAAACpc3RzZAAAAAAAAAABAAAAmWF2YzEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAEAAQAEgAAABIAAAAAAAAAAEOSlZUL0FWQyBDb2RpbmcAAAAAAAAAAAAAAAAAAAAAAAAY//8AAAAxYXZjQwH0AAr/4QAZZ/QACq609NQYBBkAAAMAAQAAAwAKjxImoAEABWjOAa8gAAAAEmNvbHJuY2xjAAYAAQAGAAAAGHN0dHMAAAAAAAAAAQAAAAUAAEZQAAAAKHN0c3oAAAAAAAAAAAAAAAUAAAIqAAAACAAAAAgAAAAIAAAACAAAAChzdHNjAAAAAAAAAAIAAAABAAAABAAAAAEAAAACAAAAAQAAAAEAAAAYc3RjbwAAAAAAAAACAAADYgAABaQAAAAUc3RzcwAAAAAAAAABAAAAAQAAABFzZHRwAAAAAAREREREAAAAb3VkdGEAAABnbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcgAAAAAAAAAAAAAAAAAAAAA6aWxzdAAAADKpdG9vAAAAKmRhdGEAAAABAAAAAEhhbmRCcmFrZSAwLjkuOCAyMDEyMDcxODAwAAACUm1kYXQAAAHkBgX/4NxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxMjAgLSBILjI2NC9NUEVHLTQgQVZDIGNvZGVjIC0gQ29weWxlZnQgMjAwMy0yMDExIC0gaHR0cDovL3d3dy52aWRlb2xhbi5vcmcveDI2NC5odG1sIC0gb3B0aW9uczogY2FiYWM9MCByZWY9MSBkZWJsb2NrPTE6MDowIGFuYWx5c2U9MHgxOjAgbWU9ZXNhIHN1Ym1lPTkgcHN5PTAgbWl4ZWRfcmVmPTAgbWVfcmFuZ2U9NCBjaHJvbWFfbWU9MSB0cmVsbGlzPTAgOHg4ZGN0PTAgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0wIGNocm9tYV9xcF9vZmZzZXQ9MCB0aHJlYWRzPTYgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MCB3ZWlnaHRwPTAga2V5aW50PTUwIGtleWludF9taW49NSBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmM9Y3FwIG1idHJlZT0wIHFwPTAAgAAAAD5liISscR8A+E4ACAACFoAAITAAAgsAAPgYCoKgoC+L4vi+KAvi+L4YfAEAACMzgABF9AAEUGUgABDJiXnf4AAAAARBmiKUAAAABEGaQpQAAAAEQZpilAAAAARBmoKU';
        }
        else {
          addTest('videoautoplay', false);
          return;
        }
      }

      catch (e) {
        addTest('videoautoplay', false);
        return;
      }

      elem.setAttribute('autoplay', '');
      elem.style.cssText = 'display:none';
      docElement.appendChild(elem);
      // wait for the next tick to add the listener, otherwise the element may
      // not have time to play in high load situations (e.g. the test suite)
      setTimeout(function() {
        elem.addEventListener('playing', testAutoplay, false);
        timeout = setTimeout(testAutoplay, waitTime);
      }, 0);
    });


    // Run each test
    testRunner();

    delete ModernizrProto.addTest;
    delete ModernizrProto.addAsyncTest;

    // Run the things that are supposed to run after the tests
    for (var i = 0; i < Modernizr._q.length; i++) {
      Modernizr._q[i]();
    }

    // Leak Modernizr namespace
    window.Modernizr = Modernizr;


    ;

  })(local, document);

  return local.Modernizr;
}

module.exports = modernizerFactory;
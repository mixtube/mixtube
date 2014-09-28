(function(Popcorn) {

  'use strict';

  Popcorn.prototype.one = function(type, fn) {
    //add the listener twice so that when it is called
    //you can remove the original function and still be
    //able to call instance.off(ev, fn) normally
    var instance = this;

    instance.on(type, function onFn() {
      instance.off(type, fn);
      instance.off(type, onFn);
    });
    instance.on(type, fn);
  };
})(Popcorn);

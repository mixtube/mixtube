'use strict';

var pull = require('lodash/array/pull'),
  has = require('lodash/object/has');

// @ngInject
function pointerManagerFactory($timeout, $document) {

  var MOVE_THRESHOLD = 5;
  var MOVE_DELAY = 200;

  var pointerPosition = {x: 0, y: 0};
  var mouseMoving = false;
  var moveStoppedTO = null;

  var handlers = [];

  activate();

  function bindMove(handler) {
    handlers.push(handler);
    return function unbind() {
      pull(handlers, handler);
    };
  }

  function isPointerInRect(/*ClientRect*/ rect) {
    return pointerPosition.x !== null && pointerPosition.y !== null &&
      rect.left < pointerPosition.x && pointerPosition.x < rect.right &&
      rect.top < pointerPosition.y && pointerPosition.y < rect.bottom;
  }

  function notifyMoveEvent(event) {
    for (var idx = 0; idx < handlers.length; idx++) {
      var handler = handlers[idx];
      if (has(handler, event)) {
        handler[event]();
      }
    }
  }

  function moveStoppedTOCb() {
    mouseMoving = false;
    notifyMoveEvent('stop');
  }

  function mouseMoved() {
    if (!mouseMoving) {
      mouseMoving = true;
      notifyMoveEvent('start');
    }

    // and the end of the timeout trigger mouseEndMove
    $timeout.cancel(moveStoppedTO);
    moveStoppedTO = $timeout(moveStoppedTOCb, MOVE_DELAY, false);
  }

  function activate() {

    $document
      .on('mouseout', function() {
        pointerPosition.x = pointerPosition.y = null;

        mouseMoved();
      })
      .on('mousemove', function(evt) {
        var moved = Math.abs(evt.clientX - pointerPosition.x) > MOVE_THRESHOLD ||
          Math.abs(evt.clientY - pointerPosition.y) > MOVE_THRESHOLD;
        pointerPosition.x = evt.clientX;
        pointerPosition.y = evt.clientY;
        if (moved) {
          mouseMoved();
        }
      });
  }

  /**
   * @name pointerManager
   */
  var pointerManager = {

    isPointerInRect: isPointerInRect,

    bindMove: bindMove
  };

  return pointerManager;
}

module.exports = pointerManagerFactory;
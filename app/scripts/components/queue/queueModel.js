'use strict';

function Video() {
  /** @type {string} */
  this.id = null;
  /** @type {string} */
  this.title = null;
  /** @type {string} */
  this.thumbnailUrl = null;
  /** @type {number} */
  this.duration = null;
  /** @type {number} */
  this.viewCount = null;
  /** @type {string} */
  this.publisherName = null;
  /** @type {string} */
  this.provider = null;
}

function Queue() {
  /** @type {string} */
  this.name = null;
  /** @type {Array.<mt.model.QueueEntry} */
  this.entries = [];
}

function QueueEntry() {
  /** @type {string} */
  this.id = null;
  /** @type {mt.model.Video} */
  this.video = null;
  /** @type {boolean} */
  this.skippedAtRuntime = false;
}

exports.Video = Video;
exports.QueueEntry = QueueEntry;
exports.Queue = Queue;
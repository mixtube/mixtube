(function(mt) {

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

  mt.model = {};
  mt.model.Video = Video;
  mt.model.QueueEntry = QueueEntry;
  mt.model.Queue = Queue;

})(mt);
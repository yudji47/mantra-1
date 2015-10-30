define([

  'underscore'
  ,'lateralus'
  ,'rekapi'

  ,'./model'

  ,'aenima.component.shifty'
  ,'mantra.component.rekapi'
  ,'mantra.component.container'

  ,'aenima.utils'

  ,'./constant'

], function (

  _
  ,Lateralus
  ,Rekapi

  ,MantraModel

  ,ShiftyComponent
  ,RekapiComponent
  ,ContainerComponent

  ,utils

  ,constant

) {
  'use strict';

  /**
   * @param {Element} el
   * @extends {Lateralus}
   * @constructor
   */
  var Mantra = Lateralus.beget(function () {
    Lateralus.apply(this, arguments);
    this.initHacks();
    this.hasInitialized = false;
    this.shiftyComponent = this.addComponent(ShiftyComponent);
    this.rekapiComponent = this.addComponent(RekapiComponent);
    this.rekapi = this.rekapiComponent.rekapi;
    this.containerComponent = this.addComponent(ContainerComponent);
  }, {
    Model: MantraModel
  });

  var fn = Mantra.prototype;

  fn.lateralusEvents = {
    rekapiTimelineInitialized: function () {
      var savedTimelines = this.model.get('savedTimelines');
      var transientTimeline = savedTimelines[constant.TRANSIENT_TIMELINE_NAME];

      if (window.localStorage._export) {
        var _export = window.localStorage._export;
        delete window.localStorage._export;
        this.loadTimeline(JSON.parse(_export));
      } else if (transientTimeline) {
        this.loadTimeline(transientTimeline);
      } else {
        this.emit('setupInitialState');
      }

      this.rekapiComponent.update(0);

      if (!utils.getQueryParam('pause')) {
        this.emit('requestPlay');
      }

      // Necessary for keeping the UI in sync after startup.
      this.saveCurrentTimelineAs(constant.TRANSIENT_TIMELINE_NAME);

      this.emit(
        'savedAnimationListUpdated'
        ,this.getSavedTimelineDisplayList()
      );

      this.hasInitialized = true;
    }

    ,'rekapi:timelineModified': function () {
      if (this.hasInitialized) {
        this.saveCurrentTimelineAs(constant.TRANSIENT_TIMELINE_NAME);
      }
    }

    /**
     * @param {string} timelineName
     */
    ,userRequestSaveCurrentAnimation: function (timelineName) {
      this.saveCurrentTimelineAs(timelineName);
    }

    /**
     * @param {string} timelineName
     */
    ,userRequestLoadAnimation: function (timelineName) {
      var savedTimelines = this.model.get('savedTimelines');
      var timelineData = savedTimelines[timelineName];
      this.loadTimeline(timelineData);
    }

    ,setupInitialState: function () {
      this.setupInitialState();
    }

    ,keyframePropertyDragStart: function () {
      this.emit('requestRecordUndoState');
    }

    ,beforeUserUpdatesKeyframeMillisecondInput: function () {
      this.emit('requestRecordUndoState');
    }

    ,beforeUserUpdatesKeyframeCurveSelector: function () {
      this.emit('requestRecordUndoState');
    }

    ,beforeUserUpdatesKeyframeValueInput: function () {
      this.emit('requestRecordUndoState');
    }

    ,'rekapi:beforeAddKeyframeProperty': function () {
      this.emit('requestRecordUndoState');
    }

    ,'rekapi:beforeRemoveKeyframeProperty': function () {
      this.emit('requestRecordUndoState');
    }
  };

  /**
   * @param {Object} timelineData
   */
  fn.loadTimeline = function (timelineData) {
    this.model.set('isLoadingTimeline', true);
    this.emit('requestClearTimeline');
    this.emit('requestClearUndoStack');

    this.emit('loadBezierCurves', timelineData.curves);
    this.emit('requestDeselectAllKeyframes');
    this.rekapiComponent.importTimeline(timelineData);
    this.model.set('isLoadingTimeline', false);

    // rekapi:timelineModified events are not triggered during or at the end of
    // importTimeline, so trigger the event explicitly here to update
    // the RekapiTimeline UI
    this.collectOne('rekapiTimeline')
      .trigger('rekapi:timelineModified', this.rekapi);
  };

  /**
   * @param {string} timelineName
   */
  fn.saveCurrentTimelineAs = function (timelineName) {
    var savedTimelines = this.model.get('savedTimelines');
    savedTimelines[timelineName] = this.rekapiComponent.toJSON();
    this.model.set('savedTimelines', savedTimelines);

    // Force a change event to persist the saved timelines to localStorage.
    this.model.trigger('change');

    if (timelineName !== constant.TRANSIENT_TIMELINE_NAME) {
      this.emit(
        'savedAnimationListUpdated'
        ,this.getSavedTimelineDisplayList()
        ,timelineName
      );
    }
  };

  /**
   * @return {Array.<string>}
   */
  fn.getSavedTimelineDisplayList = function () {
    var rawList = this.model.get('savedTimelines');
    return Object.keys(_.omit(rawList, constant.TRANSIENT_TIMELINE_NAME));
  };

  fn.setupInitialState = function () {
    this.emit('requestNewCurve');

    this.collectOne('currentActorModel')
      .keyframe(0, {
        translateX: '100px'
        ,translateY: '100px'
        ,rotate: '0deg'
      })
      .keyframe(1000, {
        translateX: '400px'
        ,translateY: '100px'
        ,rotate: '0deg'
      });
  };

  fn.initHacks = function () {
    var hasSafari = navigator.userAgent.match(/safari/i);
    var hasChrome = navigator.userAgent.match(/chrome/i);
    var isFirefox = navigator.userAgent.match(/firefox/i);

    if (hasSafari && !hasChrome) {
      this.$el.addClass('safari');
    } else if (hasChrome) {
      this.$el.addClass('chrome');
    } else if (isFirefox) {
      this.$el.addClass('firefox');
    }
  };

  return Mantra;
});

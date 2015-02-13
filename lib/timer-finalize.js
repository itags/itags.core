module.exports = function (window) {

    "use strict";

    var NAME = '[event-timer-finalize]: ',
        NATIVE_OBJECT_OBSERVE = !!Object.observe,
        ITSA = window.ITSA, // should be available at this point
        createHashMap = ITSA.createHashMap,
        Event = ITSA.Event,
        setTimeoutBKP, setIntervalBKP, setImmediateBKP;

    window._ITSAmodules || Object.protectedProp(global, '_ITSAmodules', createHashMap());

    if (NATIVE_OBJECT_OBSERVE || window._ITSAmodules.EventTimerFinalize) {
        return;
    }

    // we patch the global timer functions in order to run `refreshItags` afterwards:
    setTimeoutBKP = window.setTimeout;
    setIntervalBKP = window.setInterval;

    window.setTimeout = function() {
        var args = arguments;
        args[0] = (function(originalFn) {
            return function() {
                var eventObject = {
                        type: '',
                        emitter: 'global',
                        target: global
                    };
                originalFn();
                console.log(NAME, 'setTimeOut will run Event.runFinalizers');
                Event.runFinalizers(eventObject);
            };
        })(args[0]);
        setTimeoutBKP.apply(this, arguments);
    };

    window.setInterval = function() {
        var args = arguments;
        args[0] = (function(originalFn) {
            return function() {
                var eventObject = {
                        type: '',
                        emitter: 'global',
                        target: global
                    };
                originalFn();
                console.log(NAME, 'setInterval will run Event.runFinalizers');
                Event.runFinalizers(eventObject);
            };
        })(args[0]);
        setIntervalBKP.apply(this, arguments);
    };

    if (typeof window.setImmediate !== 'undefined') {
        setImmediateBKP = window.setInterval;
        window.setImmediate = function() {
            var args = arguments;
            args[0] = (function(originalFn) {
                return function() {
                    var eventObject = {
                            type: '',
                            emitter: 'global',
                            target: global
                        };
                    originalFn();
                    console.log(NAME, 'setImmediate will run Event.runFinalizers');
                    Event.runFinalizers(eventObject);
                };
            })(args[0]);
            setImmediateBKP.apply(this, arguments);
        };
    }

    window._ITSAmodules.EventTimerFinalize = true;

};
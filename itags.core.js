
"use strict";

require('js-ext/lib/object.js');
require('js-ext/lib/string.js');
require('polyfill/polyfill-base.js');

var asyncSilent = require('utils').asyncSilent,
    laterSilent = require('utils').laterSilent,
    CLASS_CE_HIDDEN_BEFORE_RENDER = 'itag-unrendered',
    NODE = 'node',
    REMOVE = 'remove',
    INSERT = 'insert',
    CHANGE = 'change',
    ATTRIBUTE = 'attribute',
    NODE_REMOVED = NODE+REMOVE,
    NODE_INSERTED = NODE+INSERT,
    NODE_CONTENT_CHANGE = NODE+'content'+CHANGE,
    ATTRIBUTE_REMOVED = ATTRIBUTE+REMOVE,
    ATTRIBUTE_CHANGED = ATTRIBUTE+CHANGE,
    ATTRIBUTE_INSERTED = ATTRIBUTE+INSERT,
    DELAYED_FINALIZE_EVENTS = {
        'mousedown': true,
        'mouseup': true,
        'mousemove': true,
        'panmove': true,
        'panstart': true,
        'panleft': true,
        'panright': true,
        'panup': true,
        'pandown': true,
        'pinchmove': true,
        'rotatemove': true,
        'focus': true,
        'blur': true,
        'keydown': true,
        'keyup': true,
        'keypress': true
    },
    DELAYED_EVT_TIME = 1000,
    merge = function (sourceObj, targetObj) {
        var name;
        for (name in sourceObj) {
            if (!(name in targetObj)) {
                if (name==='init') {
console.info('store init function');
/*jshint -W083 */
                    targetObj._init = function() {
/*jshint +W083 */
                        var vnode = targetObj.vnode;
                        if (!vnode.ce_initialized && !vnode.removedFromDOM) {
                            sourceObj.init.call(targetObj);
                            Object.protectedProp(vnode, 'ce_initialized', true);
                        }
                    };
                }
                else if (name==='destroy') {
/*jshint -W083 */
                    targetObj._destroy = function() {
/*jshint +W083 */
                        var vnode = targetObj.vnode;
                        if (!vnode.removedFromDOM && vnode.ce_initialized) {
                            sourceObj.destroy.call(targetObj);
                        }
                    };
                }
                else {
                    targetObj[name] = sourceObj[name];
                }
            }
        }
    },
    NOOP = function() {};

DELAYED_FINALIZE_EVENTS.keys().forEach(function(key) {
    DELAYED_FINALIZE_EVENTS[key+'outside'] = true;
});

module.exports = function (window) {

    var DOCUMENT = window.document,
        itagCore, MUTATION_EVENTS, Event, registerDelay, focusManager;

    require('vdom')(window);
    Event = require('event-dom')(window);

/*jshint boss:true */
    if (itagCore=window._ItagCore) {
/*jshint boss:false */
        return itagCore; // itagCore was already defined
    }

    Object.protectedProp(window, 'ITAGS', {});

    MUTATION_EVENTS = [NODE_REMOVED, NODE_INSERTED, NODE_CONTENT_CHANGE, ATTRIBUTE_REMOVED, ATTRIBUTE_CHANGED, ATTRIBUTE_INSERTED];

    focusManager = function(element) {
        var focusManagerNode = element.getElement('[focusmanager].focussed');
        focusManagerNode && focusManagerNode.focus();
    };

    itagCore = {

        itagFilter: function(e) {
            return !!e.target.renderCE;
        },

        renderDomElements: function(tagName, renderFn, properties, isParcel) {
            var itagElements = DOCUMENT.getAll(tagName),
                len = itagElements.length,
                i, itagElement;
            for (i=0; i<len; i++) {
                itagElement = itagElements[i];
                this._upgradeElement(itagElement, renderFn, properties, isParcel);
            }
        },

        defineParcel: function(parcelName, renderFn, properties) {
            if (parcelName.contains('-')) {
                console.warn(parcelName+' should not consist of a minus token');
                return;
            }
            this._defineElement('i-parcel-'+parcelName, renderFn, properties, true);
        },


        defineElement: function(itagName, renderFn, properties) {
            if (!itagName.contains('-')) {
                console.warn('defineElement: '+itagName+' should consist of a minus token');
                return;
            }
            this._defineElement(itagName, renderFn, properties);
        },

        _defineElement: function(itagName, renderFn, properties, isParcel) {
            itagName = itagName.toLowerCase();
/*jshint boss:true */
            if (window.ITAGS[itagName]) {
/*jshint boss:false */
                console.warn(itagName+' already exists and cannot be redefined');
                return;
            }
            (typeof renderFn === 'function') || (renderFn=NOOP);
            this.renderDomElements(itagName, renderFn, properties, isParcel);
            window.ITAGS[itagName] = this._createElement(itagName, renderFn, properties, isParcel);
        },

        _createElement: function(itagName, renderFn, properties, isParcel) {
            var instance = this;
            return function() {
                var element = DOCUMENT._createElement(itagName);
                instance._upgradeElement(element, renderFn, properties, isParcel);
                return element;
            };
        },

        _upgradeElement: function(element, renderFn, properties, isParcel) {
            merge(properties, element);
            if (isParcel) {
                merge({renderCE: function() {
console.info('look if parcel can be rendered');
                    var vnode = element.vnode;
                    if (vnode._data) {
                        if (!vnode.ce_initialized) {
                            if (typeof element._init==='function') {
                                element._init();
                            }
                            else {
                                Object.protectedProp(vnode, 'ce_initialized', true);
                            }
                            element.removeClass(CLASS_CE_HIDDEN_BEFORE_RENDER);
                        }
console.info('going to render parcel');
                        renderFn.call(element);
                    }
                }}, element);
            }
            else {
                merge({renderCE: renderFn}, element);
            }
            merge(Event.Listener, element);
            // render, but do this after the element is created:
            // in the next eventcycle:
            asyncSilent(function() {
                (typeof element._init==='function') && element._init();
                element.renderCE();
                isParcel || element.removeClass(CLASS_CE_HIDDEN_BEFORE_RENDER);
                element.hasClass('focussed') && focusManager(element);
            });
        }

    };

    DOCUMENT._createElement = DOCUMENT.createElement;
    DOCUMENT.createElement = function(tag) {
        var ItagClass = window.ITAGS[tag.toLowerCase()];
        if (ItagClass) {
            return new ItagClass();
        }
        return this._createElement(tag);
    };

    DOCUMENT.refreshParcels = function() {
console.info('refreshParcels');
        var list = this.getParcels(),
            len = list.length,
            i, parcel;
        for (i=0; i<len; i++) {
            parcel = list[i];
            parcel.renderCE();
            parcel.hasClass('focussed') && focusManager(parcel);
        }
    };

    Event.after(
        [ATTRIBUTE_CHANGED, ATTRIBUTE_INSERTED, ATTRIBUTE_REMOVED],
        function(e) {
console.info('itag changed attributes '+e.type);
console.info(e.changed);
            var element = e.target;
            element.renderCE();
            element.hasClass('focussed') && focusManager(element);
        },
        itagCore.itagFilter
    );

    Event.after(
        NODE_REMOVED,
        function(e) {
console.info('itag removed');
            var node = e.target;
            (typeof node._destroy==='function') && node._destroy();
            node.detachAll();
        },
        itagCore.itagFilter
    );

    Event.finalize(function(e) {
        if (DELAYED_FINALIZE_EVENTS[e.type]) {
            registerDelay || (registerDelay = laterSilent(function() {
console.info('Event finalize multi');
                DOCUMENT.refreshParcels();
                registerDelay = null;
            }, DELAYED_EVT_TIME));
        }
        else {
console.info('Event finalize '+e.type);
            DOCUMENT.refreshParcels();
        }
    });

    // we patch the window timer functions in order to run `refreshParcels` afterwards:
    window._setTimeout = window.setTimeout;
    window._setInterval = window.setInterval;

    window.setTimeout = function() {
        var args = arguments;
        args[0] = (function(originalFn) {
            return function() {
                console.info('setTimeout');
                originalFn();
                DOCUMENT.refreshParcels();
            };
        })(args[0]);
        window._setTimeout.apply(this, arguments);
    };

    window.setInterval = function() {
        var args = arguments;
        args[0] = (function(originalFn) {
            return function() {
                originalFn();
                DOCUMENT.refreshParcels();
            };
        })(args[0]);
        window._setInterval.apply(this, arguments);
    };

    if (typeof window.setImmediate !== 'undefined') {
        window._setImmediate = window.setImmediate;
        window.setImmediate = function() {
            var args = arguments;
            args[0] = (function(originalFn) {
                return function() {
                    originalFn();
                    DOCUMENT.refreshParcels();
                };
            })(args[0]);
            window._setImmediate.apply(this, arguments);
        };
    }

    Object.protectedProp(window, '_ItagCore', itagCore);

    return itagCore;

};
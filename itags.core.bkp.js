
"use strict";

require('js-ext');
require('polyfill/polyfill-base.js');
require('./css/itags-core.css');

var asyncSilent = require('utils').asyncSilent,
    laterSilent = require('utils').laterSilent,
    CLASS_ITAG_RENDERED = 'itag-rendered',
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
    },
    NOOP = function() {};

DELAYED_FINALIZE_EVENTS.keys().forEach(function(key) {
    DELAYED_FINALIZE_EVENTS[key+'outside'] = true;
});

module.exports = function (window) {

    var DOCUMENT = window.document,
        RUNNING_ON_NODE = (typeof global !== 'undefined') && (global.window!==window),
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
            return !!e.target._updateUI;
        },

        renderDomElements: function(tagName, updateFn, properties, isParcel) {
            var itagElements = DOCUMENT.getAll(tagName),
                len = itagElements.length,
                i, itagElement;
            for (i=0; i<len; i++) {
                itagElement = itagElements[i];
                this._upgradeElement(itagElement, updateFn, properties, isParcel);
            }
        },

        defineParcel: function(parcelName, updateFn, properties) {
            if (parcelName.contains('-')) {
                console.warn(parcelName+' should not consist of a minus token');
                return;
            }
            this._defineElement('i-parcel-'+parcelName, updateFn, properties, true);
        },


        defineElement: function(itagName) {
            if (!itagName.contains('-')) {
                console.warn('defineElement: '+itagName+' should consist of a minus token');
                return;
            }
            window.ITAGS[itagName] = function() {
                return DOCUMENT._createElement(itagName);
            };
        },

        defineItag: function(itagName, updateFn, properties) {
            if (!itagName.contains('-')) {
                console.warn('defineItag: '+itagName+' should consist of a minus token');
                return;
            }
            this._defineElement(itagName, updateFn, properties);
        },

        _defineElement: function(itagName, updateFn, properties, isParcel) {
            itagName = itagName.toLowerCase();
/*jshint boss:true */
            if (window.ITAGS[itagName]) {
/*jshint boss:false */
                console.warn(itagName+' already exists and cannot be redefined');
                return;
            }
            (typeof updateFn === 'function') || (updateFn=NOOP);
            this.renderDomElements(itagName, updateFn, properties, isParcel);
            window.ITAGS[itagName] = this._createElement(itagName, updateFn, properties, isParcel);
        },

        _createElement: function(itagName, updateFn, properties, isParcel) {
            var instance = this;
            return function() {
                var element = DOCUMENT._createElement(itagName);
                instance._upgradeElement(element, updateFn, properties, isParcel);
                return element;
            };
        },

        _upgradeElement: function(element, updateFn, properties, isParcel) {
            merge(properties, element);
            merge({
                _updateUI: isParcel ? function() {
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
                                element._setRendered();
                            }
    console.info('going to render parcel');
                            updateFn.call(element);
                        }
                    } : updateFn,
                _injectModel: function(model) {
                    var instance = this,
                        stringifiedData;
                    instance.model = model;
                    instance._updateUI();
                    if (RUNNING_ON_NODE) {
                        // store the modeldata inside an inner div-node
                        try {
                            stringifiedData = JSON.stringify(model);
                            instance.prepend('<span class="itag-data">'+stringifiedData+'</span>');
                        }
                        catch(e) {
                            console.warn(e);
                        }
                    }
                },
                _retrieveModel: function() {
                    // try to load the model from a stored inner div-node
                    var instance = this,
                        dataNode = instance.getElement('span.itag-data'),
                        stringifiedData;
                    if (dataNode) {
                        try {
                            stringifiedData = dataNode.getHTML();
                            instance.model = JSON.parseWithDate(stringifiedData);
                            dataNode.remove(true);
                        }
                        catch(e) {
                            console.warn(e);
                        }
                    }
                    return instance.model;
                },
                _setRendered: function() {
                    var instance = this;
                    if (instance.hasClass(CLASS_ITAG_RENDERED)) {
                        // already rendered on the server:
                        // bin the sored json-data on the property `model`:
                        instance.retrieveModel();
                    }
                    else {
                        instance.setClass(CLASS_ITAG_RENDERED, null, null, true);
                    }
                    instance._itagReady || (instance._itagReady=window.Promise.manage());
                    instance._itagReady.fulfill();
                },
                model: {}
            }, element);
            merge(Event.Listener, element);
            // render, but do this after the element is created:
            // in the next eventcycle:
            asyncSilent(function() {
                (typeof element._init==='function') && element._init();
                element._updateUI();
                isParcel || element._setRendered();
                element.hasClass('focussed') && focusManager(element);
            });
        }

    };

    (function(HTMLElementPrototype) {
        HTMLElementPrototype.itagReady = function() {
            var instance = this;
            instance._itagReady || (instance._itagReady=window.Promise.manage());
            return instance._itagReady;
        };
    }(window.HTMLElement.prototype));

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
            parcel._updateUI();
            parcel.hasClass('focussed') && focusManager(parcel);
        }
    };

    Event.after(
        [ATTRIBUTE_CHANGED, ATTRIBUTE_INSERTED, ATTRIBUTE_REMOVED],
        function(e) {
console.info('itag changed attributes '+e.type);
console.info(e.changed);
            var element = e.target;
            element._updateUI();
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
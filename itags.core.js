
/*jshint proto:true */

"use strict";

require('js-ext');
require('polyfill/polyfill-base.js');
require('./css/itags.core.css');

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
    destroyItag = function(destroyFn, context) {
        destroyFn.call(context);
        context.$super.destroyUI && destroyItag(context.$super.destroyUI, context);
    },
    merge = function (sourceObj, targetObj) {
        var name;
        for (name in sourceObj) {
            if (name==='init') {
/*jshint -W083 */
                targetObj.initUI = function() {
/*jshint +W083 */
                    var vnode = this.vnode;
                    if (!vnode.ce_initialized && !vnode.removedFromDOM) {
                        // sourceObj.init.call(targetObj);
                        Object.protectedProp(vnode, 'ce_initialized', true);
                        sourceObj.init.call(targetObj);
                    }
                };
            }
            else if (name==='destroy') {
console.info('store destroy');

/*jshint -W083 */
                targetObj.destroyUI = function() {
/*jshint +W083 */
console.info('running destroyUI');
                    var vnode = this.vnode;
                    if (!vnode.removedFromDOM && vnode.ce_initialized) {
console.info('REALYY running destroyUI');
                        destroyItag(sourceObj.destroy, targetObj);
                    }
                };
            }
            else if (name==='render') {
/*jshint -W083 */
                targetObj.renderUI = sourceObj.render;
            }
            else {
                targetObj[name] = sourceObj[name];
            }
        }
    },
    NOOP = function() {},
    // Define configurable, writable and non-enumerable props
    // if they don't exist.
    defineUnErasableProperty = function (object, name, method) {
        Object.defineProperty(object, name, {
            configurable: true,
            enumerable: false,
            writable: true,
            value: method
        });
    },
    DEFAULT_METHODS = {};

DELAYED_FINALIZE_EVENTS.keys().forEach(function(key) {
    DELAYED_FINALIZE_EVENTS[key+'outside'] = true;
});

module.exports = function (window) {

    var DOCUMENT = window.document,
        PROTOTYPE_CHAIN_CAN_BE_SET = arguments[1], // hidden feature, used by unit-test
        RUNNING_ON_NODE = (typeof global !== 'undefined') && (global.window!==window),
        PROTO_SUPPORTED = !!Object.__proto__,
        dummyTag = DOCUMENT.createElement('div'),
        itagCore, MUTATION_EVENTS, Event, registerDelay, focusManager;

    require('vdom')(window);
    Event = require('event-dom')(window);

/*jshint boss:true */
    if (itagCore=window._ItagCore) {
/*jshint boss:false */
        return itagCore; // itagCore was already defined
    }

    Object.protectedProp(window, 'ITAGS', {});

    DEFAULT_METHODS = Object.create(dummyTag.__proto__);
    Object.protectedProp(DEFAULT_METHODS, '_isItag', true);
    defineUnErasableProperty(DEFAULT_METHODS, 'initUI', NOOP);
    defineUnErasableProperty(DEFAULT_METHODS, 'renderUI', NOOP);
    defineUnErasableProperty(DEFAULT_METHODS, 'destroyUI', NOOP);

    MUTATION_EVENTS = [NODE_REMOVED, NODE_INSERTED, NODE_CONTENT_CHANGE, ATTRIBUTE_REMOVED, ATTRIBUTE_CHANGED, ATTRIBUTE_INSERTED];

    focusManager = function(element) {
        var focusManagerNode = element.getElement('[focusmanager].focussed');
        focusManagerNode && focusManagerNode.focus();
    };

    itagCore = {

        itagFilter: function(e) {
            return !!e.target._updateUI;
        },

        _renderDomElements: function(tagName, updateFn, properties, isParcel) {
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
            if (window.ITAGS[itagName]) {
                console.warn(itagName+' already exists and cannot be redefined');
                return;
            }
            (typeof updateFn === 'function') || (updateFn=NOOP);
            this._renderDomElements(itagName, updateFn, properties, isParcel);
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

    DOCUMENT._createElement = DOCUMENT.createElement;
    DOCUMENT.createElement = function(tag) {
        var ItagClass = window.ITAGS[tag.toLowerCase()];
        if (ItagClass) {
console.warn('return custom element '+tag);
            return new ItagClass();
        }
console.warn('return native element '+tag);
        return this._createElement(tag);
    };

    Object.protectedProp(Function.prototype, 'subItag', function(itagName, itagPrototypes) {
    console.info('subItag '+arguments.length);
        var instance = this,
            baseProt, constructor, proto, rp, domElementConstructor;
        itagName = itagName.toLowerCase();
        if (window.ITAGS[itagName]) {
            console.warn(itagName+' already exists and cannot be redefined');
            return;
        }
/*
        constructor = {};

        baseProt = instance.prototype || DEFAULT_METHODS;
        rp = Object.create(baseProt);
        constructor.prototype = rp;

        rp.constructor = constructor;
        constructor.$super = baseProt;
        constructor.$orig = {};
*/
        baseProt = DEFAULT_METHODS;
        proto = Object.create(baseProt);


        proto.$super = baseProt;
        proto.$orig = {};
        merge(itagPrototypes, proto);

        // merge some system function in case they don't exists
        domElementConstructor = function() {
            var domElement = DOCUMENT._createElement('i-tabpane'),
                nativeProto;
            if (PROTO_SUPPORTED) {
    console.warn('Object.__proto__ is available --> redefine prototypechain');
                nativeProto = domElement.__proto__;
                domElement.__proto__ = proto;
            }
            else {
                merge(proto, domElement);
            }
            domElement.initUI();
            return domElement;
        };

        window.ITAGS[itagName] = domElementConstructor;
        return domElementConstructor;
    });

    Object.protectedProp(DOCUMENT, 'createItag', function () {
        return Function.prototype.subItag.apply({}, arguments);
    });

    (function(HTMLElementPrototype) {
        HTMLElementPrototype.isItag = function() {
            return !!this._isItag;
        };
        HTMLElementPrototype.itagReady = function() {
            var instance = this;
            if (!instance.isItag()) {
                console.warn('itagReady() invoked on a non-itag element');
                return window.Promise.reject('Element is no itag');
            }
            instance._itagReady || (instance._itagReady=window.Promise.manage());
            return instance._itagReady;
        };
    }(window.HTMLElement.prototype));

    DOCUMENT.refreshParcels = function() {
        var list = this.getParcels(),
            len = list.length,
            i, parcel;
        for (i=0; i<len; i++) {
            parcel = list[i];
            parcel.renderUI();
            parcel.hasClass('focussed') && focusManager(parcel);
        }
    };

    Event.after(
        [ATTRIBUTE_CHANGED, ATTRIBUTE_INSERTED, ATTRIBUTE_REMOVED],
        function(e) {
            var element = e.target;
            element.renderUI();
            element.hasClass('focussed') && focusManager(element);
        },
        itagCore.itagFilter
    );

    Event.after(
        NODE_REMOVED,
        function(e) {
            var node = e.target;
            (typeof node.destroyUI==='function') && node.destroyUI();
            node.detachAll();
        },
        itagCore.itagFilter
    );

    Event.finalize(function(e) {
        if (DELAYED_FINALIZE_EVENTS[e.type]) {
            registerDelay || (registerDelay = laterSilent(function() {
                DOCUMENT.refreshParcels();
                registerDelay = null;
            }, DELAYED_EVT_TIME));
        }
        else {
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

    if (PROTOTYPE_CHAIN_CAN_BE_SET) {
        itagCore.setPrototypeChain = function(activate) {
            PROTO_SUPPORTED = activate ? !!Object.__proto__ : false;
        };
    }

    return itagCore;

};
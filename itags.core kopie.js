
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
    ITAG_METHODS = {
        init: '_initUI',
        render: 'renderUI', // only one without leading underscore
        destroy: '_destroyUI'
    },
    merge = function (sourceObj, targetObj) {
        var name;
        for (name in sourceObj) {
            targetObj[ITAG_METHODS[name] || name] = sourceObj[name];
        }
    },
    NOOP = function() {},
    // Define configurable, writable and non-enumerable props
    // if they don't exist.
    defineUnNumerableProperty = function (object, name, method) {
        Object.defineProperty(object, name, {
            configurable: true,
            enumerable: true,
            writable: true,
            value: method
        });
    },
    PROTECTED_CLASS_METHODS = {
        initUI: function() {
            var instance = this,
                vnode = instance.vnode,
                superInit;
            if (!vnode.ce_initialized && !vnode.removedFromDOM && !vnode.ce_destroyed) {
                superInit = function(obj) {
                    if (obj.$proto) {
                        superInit(obj.$proto);
                    }
                    // don't call `hasOwnProperty` directly on obj --> it might have been overruled
                    Object.prototype.hasOwnProperty.call(obj, '_initUI') && obj._initUI.call(instance);
                };
                superInit(instance);
                Object.protectedProp(vnode, 'ce_initialized', true);
            }
        },
        _initUI: NOOP,
        _destroyUI: NOOP,
        renderUI: NOOP,
        _isItag: true,
        destroyUI: function() {

            var instance = this,
                vnode = instance.vnode,
                superDestroy;
            if (vnode.removedFromDOM && vnode.ce_initialized && !vnode.ce_destroyed) {
                superDestroy = function(obj) {
                    // don't call `hasOwnProperty` directly on obj --> it might have been overruled
console.info(obj);
                    Object.prototype.hasOwnProperty.call(obj, '_destroyUI') && obj._destroyUI.call(instance);
                    if (obj.$proto) {
                        superDestroy(obj.$proto);
                    }
                };
                instance.detachAll();
console.info('destroying');
                superDestroy(instance);
                Object.protectedProp(vnode, 'ce_destroyed', true);
            }
        }
    };

DELAYED_FINALIZE_EVENTS.keys().forEach(function(key) {
    DELAYED_FINALIZE_EVENTS[key+'outside'] = true;
});

module.exports = function (window) {

    var DOCUMENT = window.document,
        PROTOTYPE_CHAIN_CAN_BE_SET = arguments[1], // hidden feature, used by unit-test
        RUNNING_ON_NODE = (typeof global !== 'undefined') && (global.window!==window),
        PROTO_SUPPORTED = !!Object.__proto__,
        itagCore, MUTATION_EVENTS, Event, registerDelay, focusManager, mergeFlat;

    require('vdom')(window);
    Event = require('event-dom')(window);

/*jshint boss:true */
    if (itagCore=window._ItagCore) {
/*jshint boss:false */
        return itagCore; // itagCore was already defined
    }

    Object.protectedProp(window, 'ITAGS', {}); // for the ProtoConstructors
    PROTECTED_CLASS_METHODS.merge(Event.Listener);

    MUTATION_EVENTS = [NODE_REMOVED, NODE_INSERTED, NODE_CONTENT_CHANGE, ATTRIBUTE_REMOVED, ATTRIBUTE_CHANGED, ATTRIBUTE_INSERTED];

    mergeFlat = function(proto, domElement) {
        if (proto !== window.HTMLElement.prototype) {
            domElement.merge(proto.constructor);
            mergeFlat(proto.constructor.$$super.constructor, domElement);
        }
    };

    focusManager = function(element) {
        var focusManagerNode = element.getElement('[focusmanager].focussed');
        focusManagerNode && focusManagerNode.focus();
    };

    itagCore = {

        itagFilter: function(e) {
            return !!e.target._isItag;
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
            return new ItagClass();
        }
        return this._createElement(tag);
    };





    (function(FunctionPrototype) {
        var originalSubClass = FunctionPrototype.subClass;

        FunctionPrototype._mergePrototypes = FunctionPrototype.mergePrototypes;
        FunctionPrototype.mergePrototypes = function(map, force) {
            var instance = this;
            if (!instance.isItag) {
                // default mergePrototypes
                instance._mergePrototypes(map, force);
            }
            else {
                instance._mergePrototypes(map, force, ITAG_METHODS, PROTECTED_CLASS_METHODS);
                Event.emit(instance, 'itag:prototypechanged', {map: map, force: force});
            }
            return instance;
        };

        FunctionPrototype.subClass = function(constructor, prototypes) {
            var instance = this,
                baseProt, proto, domElementConstructor, itagName;
console.warn('subClass');
            if (typeof constructor === 'string') {
console.warn('fase 1 '+constructor);
                // Itag subclassing

                itagName = constructor.toLowerCase();
                if (window.ITAGS[itagName]) {
                    console.warn(itagName+' already exists: it will be redefined');
                }

                if (instance.isItag) {
                    // subclassing an existing i-tag
                    baseProt = instance.prototype;
                }
                else {
                    baseProt = Object.create(window.HTMLElement.prototype);
                    baseProt.merge(PROTECTED_CLASS_METHODS, {descriptors: true});
                }
                proto = Object.create(baseProt);

                // merge some system function in case they don't exists
                domElementConstructor = function() {
                    var domElement = DOCUMENT._createElement(itagName);
                    if (!PROTO_SUPPORTED) {
                        mergeFlat(proto, domElement);
                    }
                    else {
                        domElement.__proto__ = proto;
                    }
                    domElement.initUI();
                    return domElement;
                };

                proto.constructor = domElementConstructor;
                domElementConstructor.prototype = proto;
                domElementConstructor.$$super = baseProt;
                domElementConstructor.$$orig = {};
                Object.protectedProp(domElementConstructor, 'isItag', true); // so that `mergePrototype` can identify

                PROTO_SUPPORTED && domElementConstructor.mergePrototypes(prototypes, true);

                window.ITAGS[itagName] = domElementConstructor;
                return domElementConstructor;
            }
            else {
console.warn('fase 2 ');
                // Function subclassing
                return originalSubClass.apply(instance, arguments);
            }
        };

    }(Function.prototype));










    Object.protectedProp(DOCUMENT, 'createItag', function (tagName, prototypes) {
console.warn('createItag');
console.warn(Function.prototype.subClass);
        return Function.prototype.subClass.apply(null, arguments);
    });

    (function(HTMLElementPrototype) {
        HTMLElementPrototype.isItag = function() {
            return !!this.vnode.tag.startsWith('I-');
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
console.info('NODE IS REMOVED');
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
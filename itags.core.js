
/*jshint proto:true */

"use strict";

require('polyfill/polyfill-base.js');
require('./css/itags.core.css');

var jsExt = require('js-ext/js-ext.js'), // want the full version: include it at the top, so that object.merge is available
    createHashMap = require('js-ext/extra/hashmap.js').createMap,
    asyncSilent = require('utils').asyncSilent,
    laterSilent = require('utils').laterSilent,
    CLASS_ITAG_RENDERED = 'itag-rendered',
    DEFAULT_CHAIN_INIT = true,
    DEFAULT_CHAIN_DESTROY = true,
    Classes = jsExt.Classes,
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
    DELAYED_EVT_TIME = 1000,
    NATIVE_OBJECT_OBSERVE = !!Object.observe,
    ITAG_METHODS = createHashMap({
        init: '_initUI',
        sync: '_syncUI',
        destroy: '_destroyUI',
        args: '_args'
    }),
    // ITAG_METHOD_VALUES must match previous ITAG_METHODS's values!
    ITAG_METHOD_VALUES = createHashMap({
        _initUI: true,
        _syncUI: true,
        _destroyUI: true,
        _args: true
    }),
    NOOP = function() {};

module.exports = function (window) {
NATIVE_OBJECT_OBSERVE=false;

    var DOCUMENT = window.document,
        PROTOTYPE_CHAIN_CAN_BE_SET = arguments[1], // hidden feature, used by unit-test
        RUNNING_ON_NODE = (typeof global !== 'undefined') && (global.window!==window),
        PROTO_SUPPORTED = !!Object.__proto__,
        itagCore, MUTATION_EVENTS, PROTECTED_MEMBERS, EXTRA_BASE_MEMBERS, Event, IO,
        ATTRIBUTE_EVENTS, registerDelay, focusManager, mergeFlat;

    require('vdom')(window);
    Event = require('event-dom')(window);
    IO = require('io')(window);

/*jshint boss:true */
    if (itagCore=window._ItagCore) {
/*jshint boss:false */
        return itagCore; // itagCore was already defined
    }

    Object.protectedProp(window, 'ITAGS', {}); // for the ProtoConstructors

    EXTRA_BASE_MEMBERS = {
        initUI: function(constructor, reInitialize) {
            var instance = this,
                vnode = instance.vnode,
                superInit;
            if ((reInitialize || !vnode.ce_initialized) && !vnode.removedFromDOM && !vnode.ce_destroyed) {
                superInit = function(constructor) {
                    var classCarierBKP = instance.__classCarier__;
                    if (constructor.$$chainInited) {
                        instance.__classCarier__ = constructor.$$super.constructor;
                        superInit(constructor.$$super.constructor);
                    }
                    classCarierBKP = instance.__classCarier__;
                    // don't call `hasOwnProperty` directly on obj --> it might have been overruled
                    Object.prototype.hasOwnProperty.call(constructor.prototype, '_initUI') && constructor.prototype._initUI.call(instance);
                };
                if (reInitialize) {
                    instance.setHTML(vnode.ce_initContent);
                }
                else {
                    // already synced on the server:
                    // bind the stored json-data on the property `model`:
                    itagCore.retrieveModel(instance);
                    Object.protectedProp(vnode, 'ce_initContent', instance.getHTML());
                }
                superInit(constructor || instance.constructor);
                Object.protectedProp(vnode, 'ce_initialized', true);
            }
            return instance;
        },
        destroyUI: function(constructor, reInitialize) {
            var instance = this,
                vnode = instance.vnode,
                superDestroy, observer;
            if (vnode.ce_initialized && (reInitialize || vnode.removedFromDOM) && !vnode.ce_destroyed) {
                if (!reInitialize && NATIVE_OBJECT_OBSERVE) {
                    observer = instance.getData('_observer');
                    observer && Object.unobserve(instance.model, observer);
                }
                superDestroy = function(constructor) {
                    var classCarierBKP = instance.__classCarier__;
                    // don't call `hasOwnProperty` directly on obj --> it might have been overruled
                    Object.prototype.hasOwnProperty.call(constructor.prototype, '_destroyUI') && constructor.prototype._destroyUI.call(instance);
                    if (constructor.$$chainDestroyed) {
                        instance.__classCarier__ = constructor.$$super.constructor;
                        superDestroy(constructor.$$super.constructor);
                    }
                    classCarierBKP = instance.__classCarier__;
                };
                superDestroy(constructor || instance.constructor);
                instance.detachAll();
                reInitialize || Object.protectedProp(vnode, 'ce_destroyed', true);
            }
            return instance;
        },
        syncUI: function() {
            var instance = this,
                args = instance.args,
                vnode = instance.vnode;
            if (vnode.ce_initialized && !vnode.removedFromDOM && !vnode.ce_destroyed) {
                vnode._setUnchangableAttrs(args);
                instance._syncUI.apply(instance, arguments);
                vnode._setUnchangableAttrs(null);
            }
            return instance;
        },
        reInitializeUI: function(constructor) {
            var instance = this,
                vnode = instance.vnode;
            if (vnode.ce_initialized && !vnode.removedFromDOM && !vnode.ce_destroyed) {
                instance.destroyUI(constructor, true)
                        .initUI(constructor, true)
                        .syncUI();
            }
            return instance;
        },
        bindModel: function(model) {
            var instance = this,
                stringifiedData, prevContent, observer;
            if (NATIVE_OBJECT_OBSERVE) {
                observer = instance.getData('_observer');
                observer && Object.unobserve(instance.model, observer);
            }
            instance.model = model;
            if (NATIVE_OBJECT_OBSERVE) {
                observer = function() {
                    instance.syncUI();
                };
                Object.observe(instance.model, observer);
                instance.setData('_observer', observer);
            }
            instance.syncUI();
            if (RUNNING_ON_NODE) {
                // store the modeldata inside an inner div-node
                try {
                    stringifiedData = JSON.stringify(model);
                    prevContent = instance.getElement('span.itag-data');
                    prevContent && prevContent.remove();
                    instance.prepend('<span class="itag-data">'+stringifiedData+'</span>');
                }
                catch(e) {
                    console.warn(e);
                }
            }
        },
        isRendered: function() {
            return !!this.getData('itagRendered');
        },
        _initUI: NOOP,
        _destroyUI: NOOP,
        _syncUI: NOOP,
        _args: {},
        _modelToAttrs: function() {
            var instance = this,
                args = instance._args,
                model = instance.model,
                newAttrs = [];
            args.each(function(value, key) {
                newAttrs[newAttrs.length] = {name: key, value: model[key]};
            });
            (newAttrs.length>0) && instance.setAttrs(newAttrs, true);
            return instance;
        },
        _attrsToModel: function() {
            var instance = this,
                args = instance._args,
                model = instance.model,
                attrValue;
            args.each(function(value, key) {
                attrValue = instance.getAttr(key);
                switch (value) {
                    case 'boolean':
                        attrValue = (attrValue==='true');
                        break;
                    case 'number':
                        attrValue = parseFloat(attrValue);
                        break;
                    case 'date':
                        attrValue = attrValue.toDate();
                        break;
                }
                model[key] = attrValue;
            });
            return instance;
        },
    };

    EXTRA_BASE_MEMBERS.merge(Event.Listener)
                      .merge(Event._CE_listener);

    PROTECTED_MEMBERS = createHashMap();
    EXTRA_BASE_MEMBERS.each(function(value, key) {
        ITAG_METHOD_VALUES[key] || (PROTECTED_MEMBERS[key] = true);
    });

    MUTATION_EVENTS = [NODE_REMOVED, NODE_INSERTED, NODE_CONTENT_CHANGE, ATTRIBUTE_REMOVED, ATTRIBUTE_CHANGED, ATTRIBUTE_INSERTED];
    ATTRIBUTE_EVENTS = [ATTRIBUTE_REMOVED, ATTRIBUTE_CHANGED, ATTRIBUTE_INSERTED];

    mergeFlat = function(constructor, domElement) {
        var prototype = constructor.prototype,
            keys, i, name, propDescriptor;
        if (domElement.__addedProps__) {
            // set before: erase previous properties
            domElement.__addedProps__.each(function(value, key) {
                delete domElement[key];
            });
        }
        domElement.__addedProps__ = {};
        while (prototype !== window.HTMLElement.prototype) {
            keys = Object.getOwnPropertyNames(prototype);
/*jshint boss:true */
            for (i=0; name=keys[i]; i++) {
/*jshint boss:false */
                if (!domElement.__addedProps__[name]) {
                    propDescriptor = Object.getOwnPropertyDescriptor(prototype, name);
                    propDescriptor.configurable = true;
                    // needs configurable, otherwise we cannot delete it when refreshing
                    Object.defineProperty(domElement, name, propDescriptor);
                    domElement.__addedProps__[name] = true;
                }
            }
            constructor = constructor.$$super.constructor;
            prototype = constructor.prototype;
        }
    };

    focusManager = function(element) {
        var focusManagerNode = element.getElement('[focusmanager].focussed');
        focusManagerNode && focusManagerNode.focus();
    };

    itagCore = {

        DELAYED_FINALIZE_EVENTS: {
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
            // 'focus': true, // focus needs immediate response !
            'manualfocus': true,
            // 'keydown': true, // keydown needs immediate response !
            'keyup': true
            //'keypress': true, // keypress needs immediate response !
            //'blur': true, // blur needs immediate response !
        },

        itagFilter: function(e) {
            return e.target.vnode.isItag;
        },

        renderDomElements: function(itagName, domElementConstructor) {
            var itagElements = DOCUMENT.getAll(itagName),
                len = itagElements.length,
                i, itagElement;
            for (i=0; i<len; i++) {
                itagElement = itagElements[i];
                this.upgradeElement(itagElement, domElementConstructor);
            }
        },

        upgradeElement: function(domElement, domElementConstructor) {
            var instance = this,
                proto = domElementConstructor.prototype,
                observer;
            domElement.model = {};
            if (NATIVE_OBJECT_OBSERVE) {
                observer = function() {
                    instance.syncUI();
                };
                Object.observe(domElement.model, observer);
                domElement.setData('_observer', observer);
            }
            if (!PROTO_SUPPORTED) {
                mergeFlat(domElementConstructor, domElement);
                domElement.__proto__ = proto;
                domElement.__classCarier__ = domElementConstructor;
                domElement.after('itag:prototypechanged', function(e) {
                    var prototypes = e.prototypes;
                    mergeFlat(domElementConstructor, domElement);
                    if ('init' in prototypes) {
                        domElement.reInitializeUI(domElement.__proto__.constructor);
                    }
                    else if ('sync' in prototypes) {
                        domElement.syncUI();
                    }
                });
                domElement.after('itag:prototyperemoved', function(e) {
                    var properties = e.properties;
                    mergeFlat(domElementConstructor, domElement);
                    if (properties.contains('init')) {
                        domElement.reInitializeUI(domElement.__proto__.constructor);
                    }
                    else if (properties.contains('sync')) {
                        domElement.syncUI();
                    }
                });
            }
            else {
                domElement.__proto__ = proto;
                domElement.__classCarier__ = domElementConstructor;
            }
            // sync, but do this after the element is created:
            // in the next eventcycle:
            asyncSilent(function(){
                domElement._attrsToModel();
                domElement.initUI(PROTO_SUPPORTED ? null : domElementConstructor);
                domElement.syncUI();
                instance.setRendered(domElement);
            });
        },

        retrieveModel: function(domElement) {
            // try to load the model from a stored inner div-node
            var dataNode = domElement.getElement('span.itag-data'),
                stringifiedData;
            if (dataNode) {
                try {
                    stringifiedData = dataNode.getHTML();
                    domElement.model = JSON.parseWithDate(stringifiedData);
                    dataNode.remove(true);
                }
                catch(e) {
                    console.warn(e);
                }
            }
            return domElement.model;
        },

        setRendered: function(domElement) {
            domElement.setClass(CLASS_ITAG_RENDERED, null, null, true);
            domElement.setData('itagRendered', true);
            domElement._itagReady || (domElement._itagReady=window.Promise.manage());
            domElement._itagReady.fulfill();
        },

        setupWatchers: function() {
            Event.after(
                NODE_REMOVED,
                function(e) {
                    var node = e.target;
                    node.destroyUI(PROTO_SUPPORTED ? null : node.__proto__.constructor);
                },
                itagCore.itagFilter
            );

            // Always watch for attibute change-events:
            // this way, we make the itags responsive for manual domchanges.
            Event.after(
                ATTRIBUTE_EVENTS,
                function(e) {
                    var element = e.target;
                    element._attrsToModel();
                    NATIVE_OBJECT_OBSERVE || DOCUMENT.refreshItags();
                    // this affect modeldata, the event.finalizer will sync the UI
                    // AFTER synced, we might need to refocus --> that's why refocussing
                    // is done async.
                    if (element.hasClass('focussed')) {
                        asyncSilent(function() {
                            focusManager(element);
                        });
                    }
                },
                itagCore.itagFilter
            );

            if (!NATIVE_OBJECT_OBSERVE) {
                Event.finalize(function(e) {
                    var type = e.type;
                    if (!MUTATION_EVENTS[type] && !type.endsWith('outside')) {
                        if (itagCore.DELAYED_FINALIZE_EVENTS[type]) {
                            registerDelay || (registerDelay = laterSilent(function() {
                                DOCUMENT.refreshItags();
                                registerDelay = null;
                            }, DELAYED_EVT_TIME));
                        }
                        else {
                            DOCUMENT.refreshItags();
                        }
                    }
                });

                IO.finalize(function() {
                    DOCUMENT.refreshItags();
                });

                // we patch the window timer functions in order to run `refreshItags` afterwards:
                window._setTimeout = window.setTimeout;
                window._setInterval = window.setInterval;

                window.setTimeout = function() {
                    var args = arguments;
                    args[0] = (function(originalFn) {
                        return function() {
                            originalFn();
                            DOCUMENT.refreshItags();
                        };
                    })(args[0]);
                    window._setTimeout.apply(this, arguments);
                };

                window.setInterval = function() {
                    var args = arguments;
                    args[0] = (function(originalFn) {
                        return function() {
                            originalFn();
                            DOCUMENT.refreshItags();
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
                                DOCUMENT.refreshItags();
                            };
                        })(args[0]);
                        window._setImmediate.apply(this, arguments);
                    };
                }
            }
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
        FunctionPrototype.mergePrototypes = function(prototypes, force) {
            var instance = this,
                silent;
            if (!instance.$$itag) {
                // default mergePrototypes
                instance._mergePrototypes.apply(instance, arguments);
            }
            else {
                instance._mergePrototypes(prototypes, force, ITAG_METHODS, PROTECTED_MEMBERS);
                silent = arguments[2];
                silent || Event.emit(instance, 'itag:prototypechanged', {prototypes: prototypes, force: force});
            }
            return instance;
        };

        FunctionPrototype._removePrototypes = FunctionPrototype.removePrototypes;
        FunctionPrototype.removePrototypes = function(properties) {
            var instance = this;
            if (!instance.$$itag) {
                // default mergePrototypes
                instance._removePrototypes.apply(instance, arguments);
            }
            else {
                instance._removePrototypes(properties, ITAG_METHODS);
                Event.emit(instance, 'itag:prototyperemoved', {properties: properties});
            }
            return instance;
        };

        FunctionPrototype.subClass = function(constructor, prototypes, chainInit, chainDestroy) {
            var instance = this,
                baseProt, proto, domElementConstructor, itagName;
            if (typeof constructor === 'string') {
                // Itag subclassing
                if (typeof prototypes === 'boolean') {
                    chainDestroy = chainInit;
                    chainInit = prototypes;
                    prototypes = null;
                }
                (typeof chainInit === 'boolean') || (chainInit=DEFAULT_CHAIN_INIT);
                (typeof chainDestroy === 'boolean') || (chainDestroy=DEFAULT_CHAIN_DESTROY);

                itagName = constructor.toLowerCase();
                if (window.ITAGS[itagName]) {
                    console.warn(itagName+' already exists: it will be redefined');
                }

                // if instance.isItag, then we subclass an existing i-tag
                baseProt = instance.prototype;
                proto = Object.create(baseProt);

                // merge some system function in case they don't exists
                domElementConstructor = function() {
                    var domElement = DOCUMENT._createElement(itagName);
                    itagCore.upgradeElement(domElement, domElementConstructor);
                    return domElement;
                };

                domElementConstructor.prototype = proto;

                proto.constructor = domElementConstructor;
                domElementConstructor.$$itag = itagName;
                domElementConstructor.$$chainInited = chainInit ? true : false;
                domElementConstructor.$$chainDestroyed = chainDestroy ? true : false;
                domElementConstructor.$$super = baseProt;
                domElementConstructor.$$orig = {};

                prototypes && domElementConstructor.mergePrototypes(prototypes, true, true);
                window.ITAGS[itagName] = domElementConstructor;

                itagCore.renderDomElements(itagName, domElementConstructor);

                return domElementConstructor;
            }
            else {
                // Function subclassing
                return originalSubClass.apply(instance, arguments);
            }
        };

    }(Function.prototype));



    var createItagBaseClass = function () {
        return Function.prototype.subClass.apply(window.HTMLElement);
    };

    /**
     * Returns a base class with the given constructor and prototype methods
     *
     * @for Object
     * @method createClass
     * @param [constructor] {Function} constructor for the class
     * @param [prototype] {Object} Hash map of prototype members of the new class
     * @static
     * @return {Function} the new class
    */
    Object.protectedProp(Classes, 'ItagBaseClass', createItagBaseClass().mergePrototypes(EXTRA_BASE_MEMBERS, true, {}, {}));

    // because `mergePrototypes` cannot merge object-getters, we will add the getter `$super` manually:
    Object.defineProperties(Classes.ItagBaseClass.prototype, Classes.coreMethods);

    Object.defineProperty(Classes.ItagBaseClass.prototype, '$superProp', {
        value: function(/* func, *args */) {
            var instance = this,
                classCarierReturn = instance.__$superCarierStart__ || instance.__classCarier__ || instance.__methodClassCarier__,
                currentClassCarier = instance.__classCarier__ || instance.__methodClassCarier__,
                args = arguments,
                superClass, superPrototype, firstArg, returnValue;

            instance.__$superCarierStart__ = null;
            if (args.length === 0) {
                instance.__classCarier__ = classCarierReturn;
                return;
            }

            superClass = currentClassCarier.$$super.constructor,
            superPrototype = superClass.prototype,
            firstArg = Array.prototype.shift.apply(args); // will decrease the length of args with one
            firstArg = ITAG_METHODS[firstArg] || firstArg;
            (firstArg === '_initUI') && (firstArg='initUI'); // to re-initiate chaining
            (firstArg === '_destroyUI') && (firstArg='destroyUI'); // to re-initiate chaining
            if ((firstArg==='initUI') && currentClassCarier.$$chainInited) {
                console.warn('init cannot be invoked manually, because the Class is `chainInited`');
                return currentClassCarier;
            }

            if ((firstArg==='destroyUI') && currentClassCarier.$$chainDestroyed) {
                console.warn('destroy cannot be invoked manually, because the Class is `chainDestroyed`');
                return currentClassCarier;
            }

            if (typeof superPrototype[firstArg] === 'function') {
                instance.__classCarier__ = superClass;
                if ((firstArg==='initUI') || (firstArg==='destroyUI')) {
                    returnValue = superPrototype[firstArg].call(instance, instance.__classCarier__);
                }
                else {
                    returnValue = superPrototype[firstArg].apply(instance, args);
                }
            }
            instance.__classCarier__ = classCarierReturn;
            return returnValue || superPrototype[firstArg];
        }
    });

    /**
     * Returns a base class with the given constructor and prototype methods
     *
     * @for Object
     * @method createClass
     * @param [constructor] {Function} constructor for the class
     * @param [prototype] {Object} Hash map of prototype members of the new class
     * @static
     * @return {Function} the new class
    */
    Object.protectedProp(DOCUMENT, 'createItag', Classes.ItagBaseClass.subClass.bind(Classes.ItagBaseClass));




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

    (function(ElementPrototype) {
        var setAttributeBKP = ElementPrototype.setAttribute;
        var removeAttributeBKP = ElementPrototype.removeAttribute;

        ElementPrototype.removeAttribute = function(attributeName) {
            var instance = this;
            if (!instance.isItag()) {
                removeAttributeBKP.apply(instance, arguments);
            }
            else {
                if (instance._args[attributeName]) {
                    delete instance.model[attributeName];
                }
                else {
                    removeAttributeBKP.apply(instance, arguments);
                }
            }
        };
        ElementPrototype.setAttribute = function(attributeName, value, silent) {
            var instance = this,
                valueType;
            if (silent || !instance.isItag()) {
                setAttributeBKP.apply(instance, arguments);
            }
            else {
/*jshint boss:true */
                if (valueType=instance._args[attributeName]) {
/*jshint boss:false */
                    switch (valueType) {
                        case 'boolean':
                            value = (value==='true');
                            break;
                        case 'number':
                            value = parseFloat(value);
                            break;
                        case 'date':
                            value = value.toDate();
                            break;
                    }
                    instance.model[attributeName] = value;
                }
                else {
                    setAttributeBKP.apply(instance, arguments);
                }
            }
        };
    }(window.Element.prototype));

    DOCUMENT.refreshItags = function() {
        var list = this.getItags(),
            len = list.length,
            i, itagElement;
        for (i=0; i<len; i++) {
            itagElement = list[i];
            if (itagElement.isRendered && itagElement.isRendered()) {

// console.info('refreshItags before: '+JSON.stringify(itagElement.model));

                itagElement._modelToAttrs();
                itagElement.syncUI();

// console.info('refreshItags after: '+JSON.stringify(itagElement.model));
                itagElement.hasClass('focussed') && focusManager(itagElement);
            }
        }
    };


    if (PROTO_SUPPORTED) {
        Event.after(
            'itag:prototypechanged',
            function(e) {
                var prototypes = e.prototypes,
                    ItagClass = e.target,
                    nodeList, node, i, length;
                if ('init' in prototypes) {
                    nodeList = DOCUMENT.getAll(ItagClass.$$itag+'.'+CLASS_ITAG_RENDERED);
                    length = nodeList.length;
                    for (i=0; i<length; i++) {
                        node = nodeList[i];
                        node.reInitializeUI();
                    }
                }
                else if ('sync' in prototypes) {
                    nodeList = DOCUMENT.getAll(ItagClass.$$itag+'.'+CLASS_ITAG_RENDERED);
                    length = nodeList.length;
                    for (i=0; i<length; i++) {
                        node = nodeList[i];
                        node.syncUI();
                    }
                }
            }
        );
        Event.after(
            'itag:prototyperemoved',
            function(e) {
                var properties = e.properties,
                    ItagClass = e.target,
                    nodeList, node, i, length;
                if (properties.contains('init')) {
                    nodeList = DOCUMENT.getAll(ItagClass.$$itag+'.'+CLASS_ITAG_RENDERED);
                    length = nodeList.length;
                    for (i=0; i<length; i++) {
                        node = nodeList[i];
                        node.reInitializeUI();
                    }
                }
                else if (properties.contains('sync')) {
                    nodeList = DOCUMENT.getAll(ItagClass.$$itag+'.'+CLASS_ITAG_RENDERED);
                    length = nodeList.length;
                    for (i=0; i<length; i++) {
                        node = nodeList[i];
                        node.syncUI();
                    }
                }
            }
        );
    }

    itagCore.setupWatchers();

    Object.protectedProp(window, '_ItagCore', itagCore);

    if (PROTOTYPE_CHAIN_CAN_BE_SET) {
        itagCore.setPrototypeChain = function(activate) {
            PROTO_SUPPORTED = activate ? !!Object.__proto__ : false;
        };
    }

    return itagCore;

};
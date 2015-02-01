/*jshint proto:true */

/**
 * Provides several methods that override native Element-methods to work with the vdom.
 *
 *
 * <i>Copyright (c) 2015 ITSA - https://github.com/itags</i>
 * <br>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @module itags.core
 * @class itagCore
 * @since 0.0.1
*/


"use strict";

require('polyfill/polyfill-base.js');
require('./css/itags.core.css');

var NAME = '[itags.core]: ',
    jsExt = require('js-ext/js-ext.js'), // want the full version: include it at the top, so that object.merge is available
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
    NODE_REMOVE = NODE+REMOVE,
    NODE_INSERT = NODE+INSERT,
    NODE_CONTENT_CHANGE = NODE+'content'+CHANGE,
    ATTRIBUTE_REMOVE = ATTRIBUTE+REMOVE,
    ATTRIBUTE_CHANGE = ATTRIBUTE+CHANGE,
    ATTRIBUTE_INSERT = ATTRIBUTE+INSERT,
    DELAYED_EVT_TIME = 500,
    NATIVE_OBJECT_OBSERVE = !!Object.observe,
    /**
     * Internal hash containing the names of members which names should be transformed
     *
     * @property ITAG_METHODS
     * @default {init: '_initUI', sync: '_syncUI', destroy: '_destroyUI', attrs: '_attrs'}
     * @type Object
     * @protected
     * @since 0.0.1
    */
    ITAG_METHODS = createHashMap({
        init: '_initUI',
        sync: '_syncUI',
        destroy: '_destroyUI',
        attrs: '_attrs'
    }),
    // ITAG_METHOD_VALUES must match previous ITAG_METHODS's values!
    ITAG_METHOD_VALUES = createHashMap({
        _initUI: true,
        _syncUI: true,
        _destroyUI: true,
        _attrs: true
    }),
    NOOP = function() {};

module.exports = function (window) {

    var DOCUMENT = window.document,
        PROTOTYPE_CHAIN_CAN_BE_SET = arguments[1], // hidden feature, used by unit-test
        RUNNING_ON_NODE = (typeof global !== 'undefined') && (global.window!==window),
        PROTO_SUPPORTED = !!Object.__proto__,
        allowedToRefreshItags = true,
        itagsThatNeedsEvent = {},
        BINDING_LIST = {},
        itagCore, MUTATION_EVENTS, PROTECTED_MEMBERS, EXTRA_BASE_MEMBERS, Event, IO,
        setTimeoutBKP, setIntervalBKP, setImmediateBKP, DEFAULT_DELAYED_FINALIZE_EVENTS,
        ATTRIBUTE_EVENTS, registerDelay, manageFocus, mergeFlat,  DELAYED_FINALIZE_EVENTS;

    require('vdom')(window);
    Event = require('event-dom')(window);
    IO = require('io')(window);

/*jshint boss:true */
    if (itagCore=window._ItagCore) {
/*jshint boss:false */
        return itagCore; // itagCore was already defined
    }

    /**
     * Internal hash containing all ITAG-Class definitions.
     *
     * @property ITAGS
     * @type Object
     * @for window
     * @since 0.0.1
    */
    Object.protectedProp(window, 'ITAGS', {}); // for the ProtoConstructors

    /**
     * Base properties for every Itag-class
     *
     *
     * @property EXTRA_BASE_MEMBERS
     * @type Object
     * @protected
     * @for ItagBaseClass
     * @since 0.0.1
    */
    EXTRA_BASE_MEMBERS = {
       /**
        * Calls `_destroyUI` on through the class-chain on every level (bottom-up).
        * _destroyUI gets defined when the itag defines `destroy` --> transformation under the hood.
        *
        * Syncs the new vnode's childNodes with the dom.
        *
        * @method destroyUI
        * @param constructor {Class} the Class which belongs with the itag
        * @param [reInitialize=false] {Boolean} whether the destruction comes from a `re-initialize`-call. For internal usage.
        * @chainable
        * @since 0.0.1
        */
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
                instance.model = null;
            }
            reInitialize || Object.protectedProp(vnode, 'ce_destroyed', true);
            return instance;
        },

       /**
        * Unitializer for itags. Calls the `_init`-method through the whole chain (top-bottom).
        * _initUI() is set for each `init`-member --> transformed under the hood.
        *
        * @method initUI
        * @param constructor {Class} the Class which belongs with the itag
        * @param [reInitialize=false] {Boolean} whether the destruction comes from a `re-initialize`-call. For internal usage.
        * @chainable
        * @since 0.0.1
        */
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

       /**
        * Flag that tells wether the itag is rendered. If you need to wait for rendering (to continue processing),
        * then use `itagReady()`
        *
        * Syncs the new vnode's childNodes with the dom.
        *
        * @method isRendered
        * @return {Boolean} whether the itag is rendered.
        * @since 0.0.1
        */
        isRendered: function() {
            return !!this.getData('itagRendered');
        },

       /**
        * Promise that gets fulfilled as soon as the itag is rendered.
        *
        * @method itagReady
        * @return {Promise} fulfilled when rendered for the first time.
        * @since 0.0.1
        */
        itagReady: function() {
            var instance = this;
            if (!instance.isItag()) {
                console.warn('itagReady() invoked on a non-itag element');
                return window.Promise.reject('Element is no itag');
            }
            instance._itagReady || (instance._itagReady=window.Promise.manage());
            return instance._itagReady;
        },

       /**
        * Destroys and reinitialises the itag-element.
        * No need to use directly, only internal.
        *
        * @method reInitializeUI
        * @param constructor {Class} the Class which belongs with the itag
        * @chainable
        * @since 0.0.1
        */
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

       /**
        * Syncs the itag, by calling `_syncUI`: the transformed `sync()`-method.
        *
        * Syncs the new vnode's childNodes with the dom.
        *
        * @method syncUI
        * @chainable
        * @since 0.0.1
        */
        syncUI: function() {
            var instance = this,
                attrs = instance._attrs,
                vnode = instance.vnode;
            if (vnode.ce_initialized && !vnode.removedFromDOM && !vnode.ce_destroyed) {
                vnode._setUnchangableAttrs(attrs);
                instance._syncUI.apply(instance, arguments);
                vnode._setUnchangableAttrs(null);
            }
            return instance;
        },

        /**
         * Internal hash containing the `attrs`-definition which can be set by the itag-declaration.
         * This hash is used to determine which properties of `model` need to sync as an attribute.
         *
         * @property _attrs
         * @default {}
         * @type Object
         * @private
         * @since 0.0.1
        */
        _attrs: {},

       /**
        * Transformed from `destroy` --> when `destroy` gets invoked, the instance will invoke `_destroyUI` through the whole chain.
        * Defaults to `NOOP`, so that it can be always be invoked.
        *
        * @method _destroyUI
        * @private
        * @chainable
        * @since 0.0.1
        */
        _destroyUI: NOOP,

       /**
        * Transformed from `init` --> when the instance gets created, the instance will invoke `_initUI` through the whole chain.
        * Defaults to `NOOP`, so that it can be always be invoked.
        *
        * Syncs the new vnode's childNodes with the dom.
        *
        * @method NOOP
        * @private
        * @since 0.0.1
        */
        _initUI: NOOP,

       /**
        * Transformed from `sync` --> when `sync` gets invoked, the instance will invoke `_syncUI`.
        * Defaults to `NOOP`, so that it can be always be invoked.
        *
        * @method _syncUI
        * @private
        * @since 0.0.1
        */
        _syncUI: NOOP
    };

    EXTRA_BASE_MEMBERS.merge(Event.Listener)
                      .merge(Event._CE_listener);

    /**
     * Internal hash holding all attribute-mutation events
     *
     * @property ATTRIBUTE_EVENTS
     * @default ['attributeremove', 'attributechange', 'attributeinsert']
     * @type Array
     * @protected
     * @since 0.0.1
    */
    ATTRIBUTE_EVENTS = [ATTRIBUTE_REMOVE, ATTRIBUTE_CHANGE, ATTRIBUTE_INSERT];

    /**
     * Internal hash holding all mutation events
     *
     * @property MUTATION_EVENTS
     * @default ['noderemove', 'nodeinsert', 'nodecontentchange', 'attributeremove', 'attributechange', 'attributeinsert']
     * @type Array
     * @protected
     * @since 0.0.1
    */
    MUTATION_EVENTS = [NODE_REMOVE, NODE_INSERT, NODE_CONTENT_CHANGE, ATTRIBUTE_REMOVE, ATTRIBUTE_CHANGE, ATTRIBUTE_INSERT];

    /**
     * Internal hash containing all `protected members` --> the properties that CANNOT be set at the prototype of ItagClasses.
     *
     * @property PROTECTED_MEMBERS
     * @default {
     *    bindModel: true,
     *    destroyUI: true,
     *    initUI: true,
     *    isRendered: true,
     *    reInitializeUI: true,
     *    syncUI: true
     * }
     * @type Object
     * @private
     * @since 0.0.1
    */
    PROTECTED_MEMBERS = createHashMap();
    EXTRA_BASE_MEMBERS.each(function(value, key) {
        ITAG_METHOD_VALUES[key] || (PROTECTED_MEMBERS[key] = true);
    });

    /**
     * Default internal hash containing all DOM-events that will not directly call `event-finalize`
     * but after a delay of 1 second
     *
     * @property DEFAULT_DELAYED_FINALIZE_EVENTS
     * @default {
     *    mousedown: true,
     *    mouseup: true,
     *    mousemove: true,
     *    panmove: true,
     *    panstart: true,
     *    panleft: true,
     *    panright: true,
     *    panup: true,
     *    pandown: true,
     *    pinchmove: true,
     *    rotatemove: true,
     *    focus: true,
     *    manualfocus: true,
     *    keydown: true,
     *    keyup: true,
     *    keypress: true,
     *    blur: true,
     *    resize: true,
     *    scroll: true
     * }
     * @type Object
     * @private
     * @since 0.0.1
    */
    DEFAULT_DELAYED_FINALIZE_EVENTS = {
        mousedown: true,
        mouseup: true,
        mousemove: true,
        panmove: true,
        panstart: true,
        panleft: true,
        panright: true,
        panup: true,
        pandown: true,
        pinchmove: true,
        rotatemove: true,
        focus: true,
        manualfocus: true,
        keydown: true,
        keyup: true,
        keypress: true,
        blur: true,
        resize: true,
        scroll: true
    };

    /**
     * Internal hash containing all DOM-events that will not directly call `event-finalize`
     * but after a delay of 1 second
     *
     * @property DELAYED_FINALIZE_EVENTS
     * @default {
     *    mousedown: true,
     *    mouseup: true,
     *    mousemove: true,
     *    panmove: true,
     *    panstart: true,
     *    panleft: true,
     *    panright: true,
     *    panup: true,
     *    pandown: true,
     *    pinchmove: true,
     *    rotatemove: true,
     *    focus: true,
     *    manualfocus: true,
     *    keydown: true,
     *    keyup: true,
     *    keypress: true,
     *    blur: true,
     *    resize: true,
     *    scroll: true
     * }
     * @type Object
     * @private
     * @since 0.0.1
    */
    DELAYED_FINALIZE_EVENTS = DEFAULT_DELAYED_FINALIZE_EVENTS.shallowClone();

   /**
    * Merges all prototype-members of every level in the chain directly on the domElement.
    * This needs to be done for browsers which don't support changing __proto__ (like <IE11)
    *
    * @method mergeFlat
    * @param constructor {Class} the Class which belongs with the itag, holding all the members
    * @param domElement {HTMLElement} the Element that recieves the members
    * @private
    * @since 0.0.1
    */
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

    itagCore = {
       /**
        * Copies the attibute-values into element.model.
        * Only processes the attributes that are defined through the Itag-class its `attrs`-property.
        *
        * @method attrsToModel
        * @param domElement {HTMLElement} the itag that should be processed.
        * @for itagCore
        * @since 0.0.1
        */
        attrsToModel: function(domElement) {
            var attrs = domElement._attrs,
                model = domElement.model,
                attrValue;
            attrs.each(function(value, key) {
                attrValue = domElement.getAttr(key);
                switch (value.toLowerCase()) {
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
        },

       /**
        * Default function for binds a model to the itag-element, making element.model equals the bound model.
        * Gets invoked on itagelement's `bindmodel`-event.
        *
        * Immediately syncs the itag with the new model-data.
        *
        * Syncs the new vnode's childNodes with the dom.
        *
        * @method bindModelDefFn
        * @param e {Object} eventobject
        * @param e.target {HTMLElement} the HTMLElement where the model was bound to
        * @param e.model {Object} model that was bind to the element
        * @since 0.0.1
        */
       bindModelDefFn: function(e) {
            var element = e.target,
                model = e.model,
                stringifiedData, prevContent, observer;
            if (element.isItag()) {
                if (NATIVE_OBJECT_OBSERVE) {
                    observer = element.getData('_observer');
                    observer && Object.unobserve(element.model, observer);
                }
                element.model = model;
                if (NATIVE_OBJECT_OBSERVE) {
                    observer = function() {
                        itagCore.modelToAttrs(element);
                        element.syncUI();
                    };
                    Object.observe(element.model, observer);
                    element.setData('_observer', observer);
                }
                if (!element.vnode.ce_initialized) {
                    element.initUI(PROTO_SUPPORTED ? null : element.__proto__.constructor);
                }
                element.syncUI();
                element.itagRendered || itagCore.setRendered(element);
                if (RUNNING_ON_NODE) {
                    // store the modeldata inside an inner div-node
                    try {
                        stringifiedData = JSON.stringify(model);
                        prevContent = element.getElement('span.itag-data');
                        prevContent && prevContent.remove();
                        element.prepend('<span class="itag-data">'+stringifiedData+'</span>');
                    }
                    catch(e) {
                        console.warn(e);
                    }
                }
            }
        },

       /**
        * Function that can be used ad the `filterFn` of event-listeners.
        * Returns true for any HTML-element that is a rendered itag.
        *
        * @method itagFilter
        * @param e {Object} the event-object passed by Event
        * @return {Boolean} whether the HTML-element that is a rendered itag
        * @since 0.0.1
        */
        itagFilter: function(e) {
            var node = e.target;
            return node.vnode.isItag && node.getData('itagRendered');
        },

       /**
        * Copies elemtn.model values into the attibute-values of the element.
        * Only processes the attributes that are defined through the Itag-class its `attrs`-property.
        *
        * @method modelToAttrs
        * @param domElement {HTMLElement} the itag that should be processed.
        * @since 0.0.1
        */
        modelToAttrs: function(domElement) {
            var attrs = domElement._attrs,
                model = domElement.model,
                newAttrs = [];
            attrs.each(function(value, key) {
                newAttrs[newAttrs.length] = {name: key, value: model[key]};
            });
            (newAttrs.length>0) && domElement.setAttrs(newAttrs, true);
        },

       /**
        * Searches through the dom for the specified itags and upgrades its HTMLElement.
        *
        * @method renderDomElements
        * @param domElementConstructor {Class} the Class which belongs with the itag
        * @since 0.0.1
        */
        renderDomElements: function(domElementConstructor) {
            var itagName = domElementConstructor.$$itag,
                pseudo = domElementConstructor.$$pseudo,
                itagElements = pseudo ? DOCUMENT.getAll(itagName+'[is="'+pseudo+'"]') : DOCUMENT.getAll(itagName+':not([is])'),
                len = itagElements.length,
                i, itagElement;
            for (i=0; i<len; i++) {
                itagElement = itagElements[i];
                this.upgradeElement(itagElement, domElementConstructor);
            }
        },

       /**
        * Retrieves modeldata set by the server inside the itag-element and binds this data into element.model
        *
        * @method retrieveModel
        * @param domElement {HTMLElement} the itag that should be processed.
        * @return {Object}
        * @since 0.0.1
        */
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

       /**
        * Defines the itag-element as being rendered.
        *
        * @method setRendered
        * @param domElement {HTMLElement} the itag that should be processed.
        * @since 0.0.1
        */
        setRendered: function(domElement) {
            domElement.setClass(CLASS_ITAG_RENDERED, null, null, true);
            domElement.setData('itagRendered', true);
            domElement._itagReady || (domElement._itagReady=window.Promise.manage());
            domElement._itagReady.fulfill();
        },

       /**
        * Sets up all general itag-emitters.
        *
        * @method setupEmitters
        * @since 0.0.1
        */
        setupEmitters: function() {
            Event.after('*:'+NODE_CONTENT_CHANGE, function(e) {
                var element = e.target;
                /**
                * Emitted when an itag changed its content
                *
                * @event *:change
                * @param e {Object} eventobject including:
                * @param e.target {HtmlElement} the dropzone
                * @since 0.1
                */
                element.emit('change', {model: element.model});
            }, this.itagFilter);
        },

       /**
        * Sets up all itag-watchers, giving itags its life behaviour.
        *
        * @method setupWatchers
        * @since 0.0.1
        */
        setupWatchers: function() {
            var instance = this;

            Event.after(
                NODE_REMOVE,
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
                    instance.attrsToModel(element);
                    if (!NATIVE_OBJECT_OBSERVE) {
                        console.info('Attribute mutation-event will refresh itags because of event '+e.type);
                        DOCUMENT.refreshItags();
                    }
                    // this affect modeldata, the event.finalizer will sync the UI
                    // AFTER synced, we might need to refocus --> that's why refocussing
                    // is done async.
                    if (element.hasClass('focussed')) {
                        asyncSilent(function() {
                            manageFocus(element);
                        });
                    }
                },
                itagCore.itagFilter
            );

            if (!NATIVE_OBJECT_OBSERVE) {
                Event.finalize(function(e) {
                    var type = e.type;
                    if (allowedToRefreshItags) {
                        if (!MUTATION_EVENTS[type] && !type.endsWith('outside')) {
                            if (DELAYED_FINALIZE_EVENTS[type]) {
                                registerDelay || (registerDelay = laterSilent(function() {
                                    console.info('Event-finalizer will refresh itags because of event: '+e.type);
                                    DOCUMENT.refreshItags();
                                    registerDelay = null;
                                }, DELAYED_EVT_TIME));
                            }
                            else {
                                console.info('Event-finalizer will refresh itags because of event: '+e.type);
                                DOCUMENT.refreshItags();
                            }
                        }
                    }
                });

                IO.finalize(function() {
                    console.info('IO-finalizer will refresh itags');
                    allowedToRefreshItags && DOCUMENT.refreshItags();
                });

                // we patch the window timer functions in order to run `refreshItags` afterwards:
                setTimeoutBKP = window.setTimeout;
                setIntervalBKP = window.setInterval;

                window.setTimeout = function() {
                    var args = arguments;
                    if (allowedToRefreshItags) {
                        args[0] = (function(originalFn) {
                            return function() {
                                originalFn();
                                console.info('setTimeOut will refresh itags');
                                DOCUMENT.refreshItags();
                            };
                        })(args[0]);
                    }
                    setTimeoutBKP.apply(this, arguments);
                };

                window.setInterval = function() {
                    var args = arguments;
                    if (allowedToRefreshItags) {
                        args[0] = (function(originalFn) {
                            return function() {
                                originalFn();
                                console.info('setInterval will refresh itags');
                                DOCUMENT.refreshItags();
                            };
                        })(args[0]);
                    }
                    setIntervalBKP.apply(this, arguments);
                };

                if (typeof window.setImmediate !== 'undefined') {
                    setImmediateBKP = window.setInterval;
                    window.setImmediate = function() {
                        var args = arguments;
                        if (allowedToRefreshItags) {
                            args[0] = (function(originalFn) {
                                return function() {
                                    originalFn();
                                    console.info('setImmediate will refresh itags');
                                    DOCUMENT.refreshItags();
                                };
                            })(args[0]);
                        }
                        setImmediateBKP.apply(this, arguments);
                    };
                }
            }

            if (PROTO_SUPPORTED) {
                Event.after(
                    '*:prototypechange',
                    function(e) {
                        var prototypes = e.prototypes,
                            ItagClass = e.target,
                            nodeList, node, i, length;
                        if ('init' in prototypes) {
                            nodeList = DOCUMENT.getAll(ItagClass.$$itag+'.'+CLASS_ITAG_RENDERED, true);
                            length = nodeList.length;
                            for (i=0; i<length; i++) {
                                node = nodeList[i];
                                node.reInitializeUI();
                            }
                        }
                        else if ('sync' in prototypes) {
                            nodeList = DOCUMENT.getAll(ItagClass.$$itag+'.'+CLASS_ITAG_RENDERED, true);
                            length = nodeList.length;
                            for (i=0; i<length; i++) {
                                node = nodeList[i];
                                node.syncUI();
                            }
                        }
                    },
                    instance.itagFilter
                );
                Event.after(
                    '*:prototyperemove',
                    function(e) {
                        var properties = e.properties,
                            ItagClass = e.target,
                            nodeList, node, i, length;
                        if (properties.contains('init')) {
                            nodeList = DOCUMENT.getAll(ItagClass.$$itag+'.'+CLASS_ITAG_RENDERED, true);
                            length = nodeList.length;
                            for (i=0; i<length; i++) {
                                node = nodeList[i];
                                node.reInitializeUI();
                            }
                        }
                        else if (properties.contains('sync')) {
                            nodeList = DOCUMENT.getAll(ItagClass.$$itag+'.'+CLASS_ITAG_RENDERED, true);
                            length = nodeList.length;
                            for (i=0; i<length; i++) {
                                node = nodeList[i];
                                node.syncUI();
                            }
                        }
                    },
                    instance.itagFilter
                );
            }
        },

       /**
        * Upgrades the HTMLElement into an itag defined by domElementConstructor.
        *
        * @method upgradeElement
        * @param domElement {HTMLElement} the itag that should be processed.
        * @param domElementConstructor {Class} the Class which belongs with the itag
        * @since 0.0.1
        */
        upgradeElement: function(domElement, domElementConstructor) {
            var instance = this,
                proto = domElementConstructor.prototype,
                observer;
            domElement.model || (domElement.model={});
            if (!PROTO_SUPPORTED) {
                mergeFlat(domElementConstructor, domElement);
                domElement.__proto__ = proto;
                domElement.__classCarier__ = domElementConstructor;
                domElement.after(
                    '*:prototypechange',
                    function(e) {
                        var prototypes = e.prototypes;
                        mergeFlat(domElementConstructor, domElement);
                        if ('init' in prototypes) {
                            domElement.reInitializeUI(domElement.__proto__.constructor);
                        }
                        else if ('sync' in prototypes) {
                            domElement.syncUI();
                        }
                    },
                    instance.itagFilter
                );
                domElement.after(
                    '*:prototyperemove',
                    function(e) {
                        var properties = e.properties;
                        mergeFlat(domElementConstructor, domElement);
                        if (properties.contains('init')) {
                            domElement.reInitializeUI(domElement.__proto__.constructor);
                        }
                        else if (properties.contains('sync')) {
                            domElement.syncUI();
                        }
                    },
                    instance.itagFilter
                );
            }
            else {
                domElement.__proto__ = proto;
                domElement.__classCarier__ = domElementConstructor;
            }
            // sync, but do this after the element is created:
            // in the next eventcycle:
            asyncSilent(function(){
                var needsToBind = false;
                // only if no modelbinding is needed, we can directly init, sync and make ready,
                // otherwise we need to make this done by  `bindModel`
                BINDING_LIST.some(function(value, selector) {
                    domElement.matches(selector) && (needsToBind=true);
                    return needsToBind;
                });
                if (!needsToBind) {
                    instance.attrsToModel(domElement);
                    domElement.initUI(PROTO_SUPPORTED ? null : domElementConstructor);
                    domElement.syncUI();
                    instance.setRendered(domElement);
                }
                if (NATIVE_OBJECT_OBSERVE) {
                    observer = function() {
                        instance.modelToAttrs(domElement);
                        domElement.syncUI();
                    };
                    Object.observe(domElement.model, observer);
                    domElement.setData('_observer', observer);
                }
            });
        }
    };

   /**
    * Resets the focus on the right element inside an itag-instance after syncing.
    * Only when a focusmanager is active and has focus.
    *
    * @method manageFocus
    * @param domElement {Element} The itag to be inspected
    * @private
    * @since 0.0.1
    */
    manageFocus = function(domElement) {
        var focusManagerNode = domElement.getElement('[focusmanager].focussed');
        focusManagerNode && focusManagerNode.focus();
    };

   /**
    * Reference to the original document.createElement.
    *
    * @method _createElement
    * @param tag {String} tagname to be created
    * @private
    * @return {HTMLElement}
    * @for document
    * @since 0.0.1
    */
    DOCUMENT._createElement = DOCUMENT.createElement;

   /**
    * Binds a model to the itag-element, making element.model equals the bound model.
    * Immediately syncs the itag with the new model-data.
    *
    * Syncs the new vnode's childNodes with the dom.
    *
    * @method bindModel
    * @param model {Object} the model to bind to the itag-element
    * @chainable
    * @since 0.0.1
    */
    DOCUMENT.bindModel = function(model, selector, fineGrain) {
        return DOCUMENT.documentElement.bindModel(model, selector, fineGrain);
    };

   /**
    * Redefinition of document.createElement, enabling creation of itags.
    *
    * @method createElement
    * @param tag {String} tagname to be created
    * @return {HTMLElement}
    * @since 0.0.1
    */
    DOCUMENT.createElement = function(tag) {
        var ItagClass = window.ITAGS[tag.toLowerCase()];
        if (ItagClass) {
            return new ItagClass();
        }
        return this._createElement(tag);
    };

    /**
     * Internal hash containing all DOM-events that are listened for (at `document`).
     *
     *
     * @property createItag
     * @param itagName {String} The name of the itag-element, starting with `i-`
     * @param [prototypes] {Object} Hash map of properties to be added to the prototype of the new class.
     * @param [subClassable=true] {Boolean} whether the Class is subclassable. Can only be set to false on ItagClasses
     * @type Class
     * @for document
     * @since 0.0.1
    */
    Object.protectedProp(DOCUMENT, 'createItag', function(itagName, prototypes, subClassable) {
        return Classes.ItagBaseClass.subClass.call(Classes.ItagBaseClass, itagName, prototypes, null, null, subClassable);
    });

   /**
    * Refreshes all Itag-elements in the dom by syncing their element.model onto the attributes and calling their `sync`-method.
    *
    * @method refreshItags
    * @chainable
    * @since 0.0.1
    */
    DOCUMENT.refreshItags = function() {
        console.info('refreshing Itags');
        var list = this.getItags(),
            len = list.length,
            i, itagElement;
        allowedToRefreshItags = false; // prevent setTimeout to fall into loop
        (len===0) || console.info('refreshing Itags');
        for (i=0; i<len; i++) {
            itagElement = list[i];
            // because itagElement could be removed intermediste, we need to check if it's there
            if (itagElement && itagElement.isRendered && itagElement.isRendered()) {
                itagCore.modelToAttrs(itagElement);
                itagElement.syncUI();
                itagElement.hasClass('focussed') && manageFocus(itagElement);
            }
        }
        allowedToRefreshItags = true;
        return this;
    };


    //===============================================================================
    //== patching native prototypes =================================================
    (function(FunctionPrototype) {
        var originalSubClass = FunctionPrototype.subClass;

       /**
        * Defines which domevents should lead to a direct sync by the Event-finalizer.
        * Only needed for events that are in the list set by DEFAULT_DELAYED_FINALIZE_EVENTS:
        *
        * <ul>
        *     <li>mousedown</li>
        *     <li>mouseup</li>
        *     <li>mousemove</li>
        *     <li>panmove</li>
        *     <li>panstart</li>
        *     <li>panleft</li>
        *     <li>panright</li>
        *     <li>panup</li>
        *     <li>pandown</li>
        *     <li>pinchmove</li>
        *     <li>rotatemove</li>
        *     <li>focus</li>
        *     <li>manualfocus</li>
        *     <li>keydown</li>
        *     <li>keyup</li>
        *     <li>keypress</li>
        *     <li>blur</li>
        *     <li>resize</li>
        *     <li>scroll</li>
        * </ul>
        *
        * Events that are not in this list don't need to be set: they always go through the finalizer immediatly.
        *
        * You need to set this if the itag-definition its `sync`-method should be updated after one of the events in the list.
        *
        * @method setItagDirectEventResponse
        * @param domEvents {Array|String} the domevents that should directly make the itag sync
        * @chainable
        * @for Function
        * @since 0.0.1
        */
        FunctionPrototype.setItagDirectEventResponse = function(domEvents) {
            var instance = this,
                itag = instance.$$itag;
            if (!NATIVE_OBJECT_OBSERVE && itag) {
                Array.isArray(domEvents) || (domEvents=[domEvents]);
                domEvents.forEach(function(domEvent) {
                    domEvent.endsWith('outside') && (domEvent=domEvent.substr(0, domEvent.length-7));
                    domEvent = domEvent.toLowerCase();
                    if (domEvent==='blur') {
                        console.warn('the event "blur" cannot be delayed, for it would lead to extremely many syncing before anything changes which you don\'t need (fe when i-tabpane switches panes)');
                    }
                    else {
                        if (DEFAULT_DELAYED_FINALIZE_EVENTS[domEvent]) {
                            itagsThatNeedsEvent[domEvent] || (itagsThatNeedsEvent[domEvent]=[]);
                            itagsThatNeedsEvent[domEvent].push(itag);
                            // remove from list in case at least one itag is in the dom:
                            if (DOCUMENT.getElement(itag, true)) {
                                delete DELAYED_FINALIZE_EVENTS[domEvent];
                            }
                            // add to the list whenever elements are removed and no itag is in the dom anymore:
                            Event.after(NODE_REMOVE, function() {
                                var elementThatNeedsEvent;
                                itagsThatNeedsEvent[domEvent].some(function(oneItag) {
                                    DOCUMENT.getElement(oneItag, true) && (elementThatNeedsEvent=true);
                                    return elementThatNeedsEvent;
                                });
                                elementThatNeedsEvent || (DELAYED_FINALIZE_EVENTS[domEvent]=true);
                            }, itag);

                            // remove from the list whenever itag is added in the dom:
                            Event.after(NODE_INSERT, function() {
                                delete DELAYED_FINALIZE_EVENTS[domEvent];
                            }, itag);
                        }
                    }
                });
            }
            return instance;
        };

       /**
         * Backup of the original `mergePrototypes`-method.
         *
         * @method mergePrototypes
         * @param prototypes {Object} Hash prototypes of properties to add to the prototype of this object
         * @param force {Boolean}  If true, existing members will be overwritten
         * @private
         * @chainable
         * @since 0.0.1
        */
        FunctionPrototype._mergePrototypes = FunctionPrototype.mergePrototypes;

       /**
         * Merges the given prototypes of properties into the `prototype` of the Class.
         *
         * **Note1 ** to be used on instances --> ONLY on Classes
         * **Note2 ** properties with getters and/or unwritable will NOT be merged
         *
         * The members in the hash prototypes will become members with
         * instances of the merged class.
         *
         * By default, this method will not override existing prototype members,
         * unless the second argument `force` is true.
         *
         * In case of merging properties into an itag, a `*:prototypechange`-event gets emitted
         *
         * @method mergePrototypes
         * @param prototypes {Object} Hash prototypes of properties to add to the prototype of this object
         * @param [force=false] {Boolean}  If true, existing members will be overwritten
         * @param [silent=false] {Boolean}  If true, no `*:prototypechange` event will get emitted
         * @chainable
         * @since 0.0.1
        */
        FunctionPrototype.mergePrototypes = function(prototypes, force, silent) {
            var instance = this;
            if (!instance.$$itag) {
                // default mergePrototypes
                instance._mergePrototypes.apply(instance, arguments);
            }
            else {
                instance._mergePrototypes(prototypes, force, ITAG_METHODS, PROTECTED_MEMBERS);
                /**
                * Emitted when prototypes are set on an existing Itag-Class.
                *
                * @event *:prototypechange
                * @param e {Object} eventobject including:
                * @param e.prototypes {Object} Hash prototypes of properties to add to the prototype of this object
                * @param e.force {Boolean} whether existing members are overwritten
                * @since 0.1
                */
                silent || instance.emit('prototypechange', {prototypes: prototypes, force: !!force});
            }
            return instance;
        };

       /**
        * Subclasses in Itag-Class into a pseudo-class: retaining its tagname, yet still subclassing.
        * The pseudoclass gets identified by `i-parentclass#pseudo` and once rendered it has the signature of:
        * &lt;i-parentclass&gt; is="pseudo" &lt;/i-parentclass&gt;
        *
        * Syncs the new vnode's childNodes with the dom.
        *
        * @method pseudoClass
        * @param pseudo {String} The pseudoname (without a minustoken), leading into the definition of `i-parent:pseudo`
        * @param [prototypes] {Object} Hash map of properties to be added to the prototype of the new class.
        * @param [chainInit=true] {Boolean} Whether -during instance creation- to automaticly construct in the complete hierarchy with the given constructor arguments.
        * @param [chainDestroy=true] {Boolean} Whether -when the Element gets out if the DOM- to automaticly destroy in the complete hierarchy.
        * @param [subClassable=true] {Boolean} whether the Class is subclassable. Can only be set to false on ItagClasses
        * @return {Class}
        * @since 0.0.1
        */
        FunctionPrototype.pseudoClass = function(pseudo, prototypes, chainInit, chainDestroy, subClassable) {
            var instance = this;
            if (!instance.$$itag) {
                console.warn(NAME, 'cannot pseudoClass '+pseudo+' for its Parent is no Itag-Class');
                return instance;
            }
            if (typeof pseudo !== 'string') {
                console.warn(NAME, 'cannot pseudoClass --> first argument needs to be s String');
                return instance;
            }
            if (pseudo.contains('-')) {
                console.warn(NAME, 'cannot pseudoClass '+pseudo+' --> name cannot consist a minus-token');
                return instance;
            }
            return instance.subClass(instance.$$itag+'#'+pseudo , prototypes, chainInit, chainDestroy, subClassable);
        };

       /**
        * Backup of the original `removePrototypes`-method.
        *
        * @method _removePrototypes
        * @param properties
        * @private
        * @chainable
        * @since 0.0.1
        */
        FunctionPrototype._removePrototypes = FunctionPrototype.removePrototypes;

       /**
        * Redefines the childNodes of both the vnode as well as its related dom-node. The new
        * definition replaces any previous nodes. (without touching unmodified nodes).
        *
        * Syncs the new vnode's childNodes with the dom.
        *
        * @method removePrototypes
        * @param properties
        * @chainable
        * @since 0.0.1
        */
        FunctionPrototype.removePrototypes = function(properties) {
            var instance = this;
            if (!instance.$$itag) {
                // default mergePrototypes
                instance._removePrototypes.apply(instance, arguments);
            }
            else {
                instance._removePrototypes(properties, ITAG_METHODS);
                /**
                * Emitted when prototypes are removed off an existing Itag-Class.
                *
                * @event *:prototyperemove
                * @param e {Object} eventobject including:
                * @param e.prototypes {Object} Hash prototypes of properties to add to the prototype of this object
                * @since 0.1
                */
                instance.emit('prototyperemove', {properties: properties});
            }
            return instance;
        };


       /**
        * Backup of the original `setConstructor`-method.
        *
        * @method _setConstructor
        * @param [constructorFn] {Function} The function that will serve as the new constructor for the class.
        *        If `undefined` defaults to `NOOP`
        * @param [prototypes] {Object} Hash map of properties to be added to the prototype of the new class.
        * @param [chainConstruct=true] {Boolean} Whether -during instance creation- to automaticly construct in the complete hierarchy with the given constructor arguments.
        * @chainable
        * @since 0.0.1
        */
        FunctionPrototype._setConstructor = FunctionPrototype.setConstructor;

        /**
         * Redefines the constructor fo the Class
         *
         * @method setConstructor
         * @param [constructorFn] {Function} The function that will serve as the new constructor for the class.
         *        If `undefined` defaults to `NOOP`
         * @param [prototypes] {Object} Hash map of properties to be added to the prototype of the new class.
         * @param [chainConstruct=true] {Boolean} Whether -during instance creation- to automaticly construct in the complete hierarchy with the given constructor arguments.
         * @chainable
         */
        FunctionPrototype.setConstructor = function(/* constructorFn, chainConstruct */) {
            var instance = this;
            if (instance.$$itag) {
                console.warn(NAME, 'Itags don\t have a constructor --> you need to redefine "init()" by using mergePrototypes()');
                return instance;
            }
            return instance._setConstructor.apply(instance, arguments);
        };

       /**
        * Redefines the childNodes of both the vnode as well as its related dom-node. The new
        * definition replaces any previous nodes. (without touching unmodified nodes).
        *
        * Syncs the new vnode's childNodes with the dom.
        *
        * @method subClass
        * @param [constructorOrItagname] {Function|String} The function that will serve as constructor for the new class.
        *        If `undefined` defaults to `NOOP`
        *        When subClassing an ItagClass, a String should be passed as first argument
        * @param [prototypes] {Object} Hash map of properties to be added to the prototype of the new class.
        * @param [chainInit=true] {Boolean} Whether -during instance creation- to automaticly construct in the complete hierarchy with the given constructor arguments.
        * @param [chainDestroy=true] {Boolean} Whether -when the Element gets out if the DOM- to automaticly destroy in the complete hierarchy.
        * @param [subClassable=true] {Boolean} whether the Class is subclassable. Can only be set to false on ItagClasses
        * @return {Class}
        * @since 0.0.1
        */
        FunctionPrototype.subClass = function(constructorOrItagname, prototypes, chainInit, chainDestroy, subClassable) {
            var instance = this,
                baseProt, proto, domElementConstructor, itagName, pseudo, registerName, itagNameSplit, itagEmitterName;
            if (typeof constructorOrItagname === 'string') {
                // Itag subclassing
                if (typeof prototypes === 'boolean') {
                    subClassable = chainDestroy;
                    chainDestroy = chainInit;
                    chainInit = prototypes;
                    prototypes = null;
                }
                (typeof chainInit === 'boolean') || (chainInit=DEFAULT_CHAIN_INIT);
                (typeof chainDestroy === 'boolean') || (chainDestroy=DEFAULT_CHAIN_DESTROY);
                (typeof subClassable === 'boolean') || (subClassable=true);

                itagName = constructorOrItagname.toLowerCase();
                if (!itagName.startsWith('i-')) {
                    console.warn(NAME, 'invalid itagname '+itagName+' --> name should start with i-');
                    return instance;
                }
                if (window.ITAGS[itagName]) {
                    console.warn(itagName+' already exists: it will be redefined');
                }
                registerName = itagName;
                itagNameSplit = itagName.split('#');
                itagName = itagNameSplit[0];
                pseudo = itagNameSplit[1]; // may be undefined

                if (instance.$$itag && !instance.$$subClassable && !pseudo) {
                    console.warn(NAME, instance.$$itag+' cannot be sub-classed');
                    return instance;
                }

                // if instance.isItag, then we subclass an existing i-tag
                baseProt = instance.prototype;
                proto = Object.create(baseProt);

                // merge some system function in case they don't exists
                domElementConstructor = function() {
                    var domElement = DOCUMENT._createElement(itagName);
                    pseudo && domElement.vnode._setAttr('is', pseudo, true);
                    itagCore.upgradeElement(domElement, domElementConstructor);
                    return domElement;
                };

                domElementConstructor.prototype = proto;

                // webkit doesn't let all objects to have their constructor redefined
                // when directly assigned. Using `defineProperty will work:
                Object.defineProperty(proto, 'constructor', {value: domElementConstructor});

                domElementConstructor.$$itag = itagName;
                domElementConstructor.$$pseudo = pseudo;
                domElementConstructor.$$chainInited = chainInit ? true : false;
                domElementConstructor.$$chainDestroyed = chainDestroy ? true : false;
                domElementConstructor.$$super = baseProt;
                domElementConstructor.$$orig = {};
                domElementConstructor.$$subClassable = subClassable;

                itagEmitterName = itagName + (pseudo ? '#'+pseudo : '');
                domElementConstructor.mergePrototypes(Event.Emitter(itagEmitterName), true, true);
                prototypes && domElementConstructor.mergePrototypes(prototypes, true, true);
                // make emitting change-events unpreventable and unrenderable:
                Event.defineEvent(itagEmitterName+':change')
                     .unPreventable()
                     .noRender();
                Event.defineEvent(itagEmitterName+':prototypechange')
                     .unPreventable()
                     .noRender();
                Event.defineEvent(itagEmitterName+':prototyperemove')
                     .unPreventable()
                     .noRender();
                Event.defineEvent(itagEmitterName+':bindmodel')
                     .defaultFn(itagCore.bindModelDefFn)
                     .noRender();

                window.ITAGS[registerName] = domElementConstructor;

                itagCore.renderDomElements(domElementConstructor);

                return domElementConstructor;
            }
            else {
                // Function subclassing
                if (instance.$$itag) {
                    console.warn(NAME, 'subClassing '+instance.$$itag+' needs a "String" as first argument');
                    return instance;
                }
                return originalSubClass.apply(instance, arguments);
            }
        };

    }(Function.prototype));

    (function(ElementPrototype) {
        var setAttributeBKP = ElementPrototype.setAttribute,
            removeAttributeBKP = ElementPrototype.removeAttribute;

       /**
        * Binds a model to the itag-element, making element.model equals the bound model.
        * Immediately syncs the itag with the new model-data.
        *
        * Syncs the new vnode's childNodes with the dom.
        *
        * @method bindModel
        * @param model {Object} the model to bind to the itag-element
        * @chainable
        * @since 0.0.1
        */
        ElementPrototype.bindModel = function(model, selector, fineGrain) {
            var instance = this,
                listener, elements;
            if ((typeof selector === 'string') && (selector.length>0) && !BINDING_LIST[selector]) {
                BINDING_LIST[selector] = true;
                elements = instance.getAll(selector);
                elements.forEach(function(element) {
                    element.emit('bindmodel', {model: (typeof fineGrain==='function') ? fineGrain(element, model) : model});
                });
                listener = Event.after(NODE_INSERT, function(e) {
                    var element = e.target;
                    element.emit('bindmodel', {model: (typeof fineGrain==='function') ? fineGrain(element, model) : model});
                    // element.selfOnceAfter is not available yet: listen through Event:
                    Event.onceAfter(
                        NODE_REMOVE,
                        function() {
                            listener.detach();
                        },
                        function(e) {
                            return (e.target===element);
                        }
                    );
                }, selector);
                return {
                    detach: function() {
                        listener.detach();
                        delete BINDING_LIST[selector];
                    }
                };
            }
            // else
            return {
                detach: function() {
                    if (typeof selector === 'string') {
                        delete BINDING_LIST[selector];
                    }
                }
            };
        };

       /**
        * Removes the attribute from the Element.
        * In case of an Itag --> will remove the property of element.model
        *
        * Use removeAttr() to be able to chain.
        *
        * @method removeAttr
        * @param attributeName {String}
        * @param [silent=false] {Boolean} prevent node-mutation events by the Event-module to emit
        * @since 0.0.1
        */
        ElementPrototype.removeAttribute = function(attributeName, silent) {
            var instance = this;
            if (!instance.isItag() || silent) {
                removeAttributeBKP.apply(instance, arguments);
            }
            else {
                if (instance._attrs[attributeName]) {
                    delete instance.model[attributeName];
                }
                else {
                    removeAttributeBKP.apply(instance, arguments);
                }
            }
        };

       /**
         * Sets the attribute on the Element with the specified value.
        * In case of an Itag --> will remove the property of element.model
         *
         * Alias for setAttr(), BUT differs in a way that setAttr is chainable, setAttribute is not.
         *
         * @method setAttribute
         * @param attributeName {String}
         * @param value {String} the value for the attributeName
         * @param [silent=false] {Boolean} prevent node-mutation events by the Event-module to emit
         * @since 0.0.1
        */
        ElementPrototype.setAttribute = function(attributeName, value, silent) {
            var instance = this,
                valueType;
            if (!instance.isItag() || silent) {
                setAttributeBKP.apply(instance, arguments);
            }
            else {
/*jshint boss:true */
                if (valueType=instance._attrs[attributeName]) {
/*jshint boss:false */
                    switch (valueType.toLowerCase()) {
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

    (function(HTMLElementPrototype) {
       /**
        * Flag that tells whether the HTMLElement is an Itag
        *
        * @method isItag
        * @return {Boolean}
        * @for HTMLElement
        * @since 0.0.1
        */
        HTMLElementPrototype.isItag = function() {
            return this.vnode.isItag;
        };

    }(window.HTMLElement.prototype));

    //===============================================================================

   /**
    * Creates the base ItagClass: the highest Class in the hierarchy of all ItagClasses.
    * Will get extra properties merge into its prototype, which leads into the formation of `ItagBaseClass`.
    *
    * @method createItagBaseClass
    * @protected
    * @return {Class}
    * @for itagCore
    * @since 0.0.1
    */
    var createItagBaseClass = function () {
        return Function.prototype.subClass.apply(window.HTMLElement);
    };

    /**
     * The base ItagClass: the highest Class in the hierarchy of all ItagClasses.
     *
     * @property ItagBaseClass
     * @type Class
     * @for Classes
     * @since 0.0.1
    */
    Object.protectedProp(Classes, 'ItagBaseClass', createItagBaseClass().mergePrototypes(EXTRA_BASE_MEMBERS, true, {}, {}));

    // because `mergePrototypes` cannot merge object-getters, we will add the getter `$super` manually:
    Object.defineProperties(Classes.ItagBaseClass.prototype, Classes.coreMethods);

    /**
     * Calculated value of the specified member at the parent-Class.
     *
     * @method $superProp
     * @return {Any}
     * @for ItagBaseClass
     * @since 0.0.1
    */
    Object.defineProperty(Classes.ItagBaseClass.prototype, '$superProp', {
        value: function(/* member, *args */) {
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

    itagCore.setupWatchers();
    itagCore.setupEmitters();

    Object.protectedProp(window, '_ItagCore', itagCore);

    if (PROTOTYPE_CHAIN_CAN_BE_SET) {
       /*
        * Only for usage during testing --> can deactivate the usage of __proto__ making the itags
        * upgraded my merging all ItagClass-members to the domElement-instance.
        *
        * @method setPrototypeChain
        * @param activate
        * @for itagCore
        * @since 0.0.1
        */
        itagCore.setPrototypeChain = function(activate) {
            PROTO_SUPPORTED = activate ? !!Object.__proto__ : false;
        };
    }

    return itagCore;
};
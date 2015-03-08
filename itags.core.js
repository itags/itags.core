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

require('./css/itags.core.css');

var NAME = '[itags.core]: ',
    ITSA = require('itsa'),
    createHashMap = ITSA.createHashMap,
    async = ITSA.async,
    Event = ITSA.Event,
    Classes = ITSA.Classes,
    CLASS_ITAG_RENDERED = 'itag-rendered',
    DEFAULT_CHAIN_INIT = true,
    DEFAULT_CHAIN_DESTROY = true,
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
        render: '_renderUI',
        sync: '_syncUI',
        destroy: '_destroyUI',
        attrs: '_attrs'
    }),
    // ITAG_METHOD_VALUES must match previous ITAG_METHODS's values!
    ITAG_METHOD_VALUES = createHashMap({
        _initUI: true,
        _renderUI: true,
        _syncUI: true,
        _destroyUI: true,
        _attrs: true
    }),
    NOOP = function() {};

module.exports = function (window) {
    // make ITSA available as global, so we can use it in all other itag-modules:
    window.ITSA = ITSA;

    var DOCUMENT = window.document,
        PROTOTYPE_CHAIN_CAN_BE_SET = arguments[1], // hidden feature, used by unit-test
        RUNNING_ON_NODE = (typeof global !== 'undefined') && (global.window!==window),
        PROTO_SUPPORTED = !!Object.__proto__,
        BINDING_LIST = {},
        itagCore, PROTECTED_MEMBERS, EXTRA_BASE_MEMBERS,
        ATTRIBUTE_EVENTS, manageFocus, mergeFlat;


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
                if (!reInitialize) {
                    observer = instance.getData('_observer');
                    instance.model.unobserve(observer);
                    instance.removeData('_observer');
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
                itagCore.destroyPlugins(instance);
                instance.detachAll();
                // DO NOT set model to null --> it might be refered to asynchronously
                // We don't need to bother: the node gets out of the dom and will really be destroyed after
                // 1 minute: because no-one needs it, the GC should clean up model when no longer needed
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
        * @param [reInitialize=false] {Boolean} whether the initialization comes from a `re-initialize`-call. For internal usage.
        * @chainable
        * @since 0.0.1
        */
        initUI: function(constructor, reInitialize) {
            var instance = this,
                vnode = instance.vnode,
                superInit, serverModel;
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
                if (!reInitialize) {
                    // First time init.
                    // If already rendered on the server:
                    // bind the stored json-data on the property `model`:
                    if (instance.hasClass(CLASS_ITAG_RENDERED)) {
                        // already rendered on the server
                        if (!RUNNING_ON_NODE) {
                            serverModel = itagCore.extractModel(instance);
                            if (serverModel && !vnode.ce_boundModel) {
                                instance.model = serverModel;
                            }
                        }
                        Object.protectedProp(vnode, 'ce_designNode', itagCore.extractContent(instance));
                    }
                    else {
                        Object.protectedProp(vnode, 'ce_designNode', itagCore.extractContent(instance, true));
                    }
                }
                superInit(constructor || instance.constructor);
            }
            return instance;
        },

       /**
        * Does the one-time initial rendering: is succeeded with syncUI
        *
        * @method renderUI
        * @param [reInitialize=false] {Boolean} whether the renderUI comes from a `re-initialize`-call. For internal usage.
        * @chainable
        * @since 0.0.1
        */
        renderUI: function(reInitialize) {
            var instance = this,
                vnode = instance.vnode;
            if ((reInitialize || !vnode.ce_initialized) && !vnode.removedFromDOM && !vnode.ce_destroyed) {
                instance._renderUI();
                itagCore.initPlugins(instance);
                Object.protectedProp(vnode, 'ce_initialized', true);
            }
            return instance;
        },

        getItagContainer: function() {
            return this.vnode.ce_designNode;
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
        * Flag that tells wether the itag is destoyed.
        *
        * @method isDestroyed
        * @return {Boolean} whether the itag is destroyed.
        * @since 0.0.1
        */
        isDestroyed: function() {
            return !!this.vnode.ce_destroyed;
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
                        .renderUI(true)
                        .syncUI();
            }
            return instance;
        },

       /**
        * Defines the `key`-property on element.model, but only when is hasn't been defined before.
        *
        * @method defineWhenUndefined
        * @chainable
        * @since 0.0.1
        */
        defineWhenUndefined: function(key, value) {
            var model = this.model;
            model[key] || (model[key]=value);
            return this;
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
                vnode = instance.vnode,
                stringifiedData, vChildNodes, lastVChild;
            if (vnode.ce_initialized && !vnode.removedFromDOM && !vnode.ce_destroyed) {
                vnode._setUnchangableAttrs(attrs);
                instance._syncUI.apply(instance, arguments);
                vnode._setUnchangableAttrs(null);
                if (RUNNING_ON_NODE) {
                    // store the modeldata inside a commentNode at the end of innerHTML:
                    try {
                        stringifiedData = JSON.stringify(instance.model);
                        // we need to patch directly on the vnode --> modification of commentNodes
                        // have no customized methods on the Element, but they are patchable through Element.vnode:
                        vChildNodes = vnode.vChildNodes;
                        lastVChild = vChildNodes[vChildNodes.length-1];
                        if (lastVChild && (lastVChild.nodeType===8) && (lastVChild.text.startsWith('i-model:{'))) {
                            // modeldata was already set --> overwrite it
                            lastVChild.text = 'i-model:'+stringifiedData;
                            // lastVChild.domNode.nodeValue = unescapeEntities(lastVChild.text);
                            lastVChild.domNode.nodeValue = lastVChild.text;
                        }
                        else {
                            // insert modeldata
                            instance.prepend('<!--i-model:'+stringifiedData+'-->');
                        }
                    }
                    catch(e) {
                        console.warn(e);
                    }
                }
            }
            return instance;
        },

        contentHidden: true,

       /**
        * Invoked after a model is bound. Can be used for further action.
        * Not always need to: after this method, `sync` will get invoked.
        *
        * @method _afterBindModel
        * @private
        * @chainable
        * @since 0.0.1
        */
        _afterBindModel: NOOP,

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
        * @method _initUI
        * @private
        * @since 0.0.1
        */
        _initUI: NOOP,

       /**
        * Transformed from `render` --> when the instance gets created, the instance will invoke `_renderUI` through the whole chain.
        * Defaults to `NOOP`, so that it can be always be invoked.
        *
        * Syncs the new vnode's childNodes with the dom.
        *
        * @method _renderUI
        * @private
        * @since 0.0.1
        */
        _renderUI: NOOP,

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
        ITAG_METHOD_VALUES[key] || (key==='_afterBindModel') || (PROTECTED_MEMBERS[key] = true);
    });

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

        initPlugins: function(domElement) {
            var processVChildNodes = function(vnode) {
                var vChildren = vnode.vChildren,
                    len = vChildren.length,
                    i, vChild, attrs, ns, j, len2, keys, attribute;
                for (i=0; i<len; i++) {
                    vChild = vChildren[i];
/*jshint boss:true */
                    if (attrs=vChild.attrs) {
/*jshint boss:false */
                        keys = attrs.keys();
                        len2 = keys.length;
                        for (j=0; j<len2; j++) {
                            attribute = keys[j];
                            if ((attribute.substr(0, 7)==='plugin-') && (attrs[attribute]==='true')) {
                                ns = attribute.substr(7);
                                vChild.domNode.plug(ns);
                            }
                        }
                    }
                    processVChildNodes(vChild);
                }
            };
            processVChildNodes(domElement.vnode);
        },

        destroyPlugins: function(domElement) {
            var processVChildNodes = function(vnode) {
                var vChildren = vnode.vChildren,
                    len = vChildren.length,
                    i, vChild, j, len2, ns, keys, plugin;
                for (i=0; i<len; i++) {
                    vChild = vChildren[i];
/*jshint boss:true */
                    if (plugin=vChild.domNode.plugin) {
/*jshint boss:false */
                        keys = plugin.keys();
                        len2 = keys.length;
                        for (j=0; j<len2; j++) {
                            ns = keys[j];
                            vChild.domNode.unplug(ns);
                        }
                    }
                    processVChildNodes(vChild);
                }
            };
            processVChildNodes(domElement.vnode);
        },

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
            console.log(NAME+'attrsToModel');
            var attrs = domElement._attrs,
                attrValue, validValue;
            attrs.each(function(value, key) {
                attrValue = domElement.getAttr(key);
                if (attrValue) {
                    switch (value.toLowerCase()) {
                        case 'boolean':
                            validValue = attrValue.validateBoolean();
                            attrValue = (attrValue==='true');
                            break;
                        case 'number':
                            validValue = attrValue.validateFloat();
                            attrValue = parseFloat(attrValue);
                            break;
                        case 'date':
                            validValue = attrValue.validateDate();
                            attrValue = attrValue.toDate();
                            break;
                        case 'string':
                            validValue = true;
                            break;
                        default:
                            validValue = false;
                    }
                }
                else if (value.toLowerCase()==='boolean') {
                    // undefined `boolean` attributes need to be stored as `false`
                    validValue = true;
                    attrValue = false;
                }
                else {
                    validValue = false;
                }
                validValue && domElement.defineWhenUndefined(key, attrValue);
            });
        },

       /**
        * Binds a model to the itag-element, making element.model equals the bound model.
        * Immediately syncs the itag with the new model-data.
        *
        * Syncs the new vnode's childNodes with the dom.
        *
        * @method bindModel
        * @param element {HTMLElement} element, which should be an Itag
        * @param model {Object} the model to bind to the itag-element
        * @param [mergeCurrent=false] {Boolean} when set true, current properties on the iTag's model that aren't defined
        *        in the new model, get merged into the new model.
        * @since 0.0.1
        */
        bindModel: function(element, model, mergeCurrent) {
            console.log(NAME+'bindModel');
            var instance = this,
                observer;
            if (element.isItag() && (element.model!==model) && !element.inside('.ce-design-node')) {
                element.removeAttr('bound-model');
                Object.protectedProp(element.vnode, 'ce_boundModel', true);
                observer = element.getData('_observer');
                element.model.unobserve(observer);
                mergeCurrent && (model.merge(element.model, {full: true}));
                element.model = model;
                observer = function() {
                    itagCore.modelToAttrs(element);
                    element.syncUI();
                };
                element.model.observe(observer);
                element.setData('_observer', observer);
                if (!element.vnode.ce_initialized) {
                    instance.attrsToModel(element);
                    element.initUI(PROTO_SUPPORTED ? null : element.__proto__.constructor)
                           .renderUI();
                }
                element._afterBindModel();
                element.syncUI();
                element.itagRendered || instance.setRendered(element);
            }
        },

       /**
        * Retrieves modeldata set by the server inside the itag-element and binds this data into element.model
        *
        * @method extractModel
        * @param domElement {HTMLElement} the itag that should be processed.
        * @return {Object|null} the modeldata or null when not supplied
        * @since 0.0.1
        */
        extractModel: function(domElement) {
            console.log(NAME+'extractModel');
            var vnode = domElement.vnode,
                vChildNodes = vnode.vChildNodes,
                lastPos = vChildNodes.length - 1,
                i = -1,
                modelData, vChildNode, content;
            // walk through the vChilds and handle the model-data:
            while ((++i<lastPos) && (modelData===undefined)) {
                vChildNode = vChildNodes[i];
                if ((vChildNode.nodeType===8) && (vChildNode.text.startsWith('i-model:{'))) {
                    // modeldata was set
                    try {
                        content = vChildNode.text.replaceAll('&lt;', '<').replaceAll('&gt;', '>');
                        modelData = JSON.parseWithDate(content.substr(8));
                    }
                    catch(e) {
                        modelData = null;
                        console.warn(e);
                    }
                    vnode._removeChild(vChildNode);
                }
            }
            return modelData || null;
        },

       /**
        * Retrieves content set by the definition of the iTag. The content should be inside a comment-node
        * inside the itag. The returnvalue is a container-node (DIV) where the content
        * -as is specified by the comment-node- lies within as true HTML.
        *
        * @method extractContent
        * @param domElement {HTMLElement} the itag that should be processed.
        * @return {HTMLElement} a DIV-container with HTML inside
        * @since 0.0.1
        */
        extractContent: function(domElement, empty) {
            console.log(NAME+'extractContent');
            var vnode = domElement.vnode,
                vChildNodes = vnode.vChildNodes,
                lastPos = vChildNodes.length,
                i = -1,
                container = DOCUMENT.createElement('div'),
                content, vChildNode;
            // mark the container with a class -->
            // so we know we don't need to render the itags anything inside:
            container.setClass('ce-design-node');
            // walk through the vChilds and handle the model-data:
            while ((++i<lastPos) && !content) {
                vChildNode = vChildNodes[i];
                if ((vChildNode.nodeType===8) && (!vChildNode.text.startsWith('i-model:{'))) {
                    content = vChildNode.text.trim().replaceAll('&lt;', '<').replaceAll('&gt;', '>');
                    // to support nested comments (in case of nested iTags),
                    // we transform any text looking like --!> into -->
                    content = content.replaceAll('<!==', '<!--').replaceAll('==>', '-->');
                    container.vnode.setHTML(content, true);
                    empty || vnode._removeChild(vChildNode);
                }
            }
            empty && domElement.empty();
            return container;
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
            console.log(NAME+'itagFilter');
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
            console.log(NAME+'modelToAttrs');
            var attrs = domElement._attrs,
                model = domElement.model,
                newAttrs = [];
            attrs.each(function(value, key) {
                model[key] && (newAttrs[newAttrs.length] = {name: key, value: model[key]});
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
            console.log(NAME+'renderDomElements');
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
        * Defines the itag-element as being rendered.
        *
        * @method setRendered
        * @param domElement {HTMLElement} the itag that should be processed.
        * @since 0.0.1
        */
        setRendered: function(domElement) {
            console.log(NAME+'setRendered');
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
            console.log(NAME+'setupEmitters');
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

        setContentVisibility: function(ItagClass, value) {
            console.log(NAME+'setContentVisibility');
            (typeof value === 'boolean') && ItagClass.mergePrototypes({contentHidden: !value}, true, false, true);
        },

       /**
        * Sets up all itag-watchers, giving itags its life behaviour.
        *
        * @method setupWatchers
        * @since 0.0.1
        */
        setupWatchers: function() {
            console.log(NAME+'setupWatchers');

            Event.after(
                'UI:'+NODE_REMOVE,
                function(e) {
                    var node = e.target;
                    node.destroyUI(PROTO_SUPPORTED ? null : node.__proto__.constructor);
                },
                itagCore.itagFilter
            );

            Event.before(
                '*:manualfocus',
                function(e) {
                    var node = e.target;
                    if (!node.isRendered()) {
                        e.halt();
                        node.itagReady().then(
                            function() {
                                // re-emit the focus
                                node.focus();
                            }
                        );
                    }
                },
                function(e) {
                    return e.target.vnode.isItag;
                }
            );

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
                    function(e) {
                        return !!e.target.$$itag;
                    }
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
                    function(e) {
                        return !!e.target.$$itag;
                    }
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
            console.log(NAME+'upgradeElement');
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
                    function(e) {
                        return !!e.target.$$itag;
                    }
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
                    function(e) {
                        return !!e.target.$$itag;
                    }
                );
            }
            else {
                domElement.__proto__ = proto;
                domElement.__classCarier__ = domElementConstructor;
            }
            // sync, but do this after the element is created:
            // in the next eventcycle:
            async(function(){
                var needsToBind = (domElement.getAttr('bound-model')==='true');
                // only if no modelbinding is needed, we can directly init, sync and make ready,
                // otherwise we need to make this done by  `bindModel`
                BINDING_LIST.some(function(value, selector) {
                    domElement.matches(selector) && (needsToBind=true);
                    return needsToBind;
                });
                if (!needsToBind) {
                    instance.attrsToModel(domElement);
                    domElement.initUI(PROTO_SUPPORTED ? null : domElementConstructor)
                              .renderUI()
                              .syncUI();
                    instance.setRendered(domElement);
                }
                observer = function() {
                    instance.modelToAttrs(domElement);
                    domElement.syncUI();
                };
                domElement.model.observe(observer);
                domElement.setData('_observer', observer);
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
        console.log(NAME+'manageFocus');
        var focusManagerNode = domElement.getElement('.focussed[fm-manage]');
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
    * @param selector {String|HTMLElement} a css-selector or an HTMLElement where the data should be bound
    * @param [mergeCurrent=false] {Boolean} when set true, current properties on the iTag that aren't defined
    *                                       in the new model, get merged into the new model.
    * @param [fineGrain] {Function} A function that recieves `model` as argument and should return a
    *                               manipulated (subset) of model as new model to be bound
    * @return {Object} handler with a `detach()`-method which can be used to detach the binder
    * @since 0.0.1
    */
    DOCUMENT.bindModel = function(model, selector, mergeCurrent, fineGrain) {
        console.log(NAME+'bindModel');
        var documentElement = DOCUMENT.documentElement,
            listener, elements, observer;
        if ((typeof selector === 'string') && (selector.length>0) && !BINDING_LIST[selector]) {
            BINDING_LIST[selector] = true;
            elements = documentElement.getAll(selector);
            elements.forEach(function(element) {
                itagCore.bindModel(element, (typeof fineGrain==='function') ? fineGrain(element, model) : model, mergeCurrent);
            });
            listener = Event.after('UI:'+NODE_INSERT, function(e) {
                var element = e.target;
                itagCore.bindModel(element, (typeof fineGrain==='function') ? fineGrain(element, model) : model, mergeCurrent);
            }, function(e) {
                return e.target.matches(selector);
            });
            return {
                detach: function() {
                    listener.detach();
                    elements = documentElement.getAll(selector);
                    elements.forEach(function(element) {
                        observer = element.getData('_observer');
                        element.model.unobserve(observer);
                    });
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
    * Redefinition of document.createElement, enabling creation of itags.
    *
    * @method createElement
    * @param tag {String} tagname to be created
    * @param [suppressItagRender] {Boolean} to suppress Itags from rendering
    * @return {HTMLElement}
    * @since 0.0.1
    */
    DOCUMENT.createElement = function(tag, suppressItagRender) {
        console.log(NAME+'createElement '+tag);
        var ItagClass = window.ITAGS[tag.toLowerCase()],
            pos;
        if (!suppressItagRender && ItagClass) {
            return new ItagClass();
        }
        // we could run into a situation where we have an itag that is a pseudoclass
        // yet suppressItagRender is `true`. This would lead into tagnames like: I-BUTTON#reset
        // because native createElement cannot create these, we need to strip as from the #
        else if (ItagClass && ((pos=tag.indexOf('#'))!==-1)) {
            tag = tag.substr(0, pos);
        }
        return DOCUMENT._createElement(tag);
    };

    /**
     * Internal hash containing all DOM-events that are listened for (at `document`).
     *
     *
     * @property defineItag
     * @param itagName {String} The name of the itag-element, starting with `i-`
     * @param [prototypes] {Object} Hash map of properties to be added to the prototype of the new class.
     * @param [subClassable=true] {Boolean} whether the Class is subclassable. Can only be set to false on ItagClasses
     * @type Class
     * @for document
     * @since 0.0.1
    */
    Object.protectedProp(DOCUMENT, 'defineItag', function(itagName, prototypes, subClassable) {
        return Classes.ItagBaseClass.subClass.call(Classes.ItagBaseClass, itagName, prototypes, null, null, subClassable);
    });

    //===============================================================================
    //== patching native prototypes =================================================
    (function(FunctionPrototype) {
        var originalSubClass = FunctionPrototype.subClass;
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
            var instance = this,
                overwriteProtected = arguments[3], // hidden private feature
                itagEmitterName;
            if (!instance.$$itag) {
                // default mergePrototypes
                instance._mergePrototypes(prototypes, force);
            }
            else {
                instance._mergePrototypes(prototypes, force, ITAG_METHODS, overwriteProtected ? null : PROTECTED_MEMBERS);
                /**
                * Emitted when prototypes are set on an existing Itag-Class.
                *
                * @event *:prototypechange
                * @param e {Object} eventobject including:
                * @param e.prototypes {Object} Hash prototypes of properties to add to the prototype of this object
                * @param e.force {Boolean} whether existing members are overwritten
                * @since 0.1
                */
                if (!silent) {
                    // cannot emit on the instance
                    itagEmitterName = instance.$$itag + (instance.$$pseudo ? '#'+instance.$$pseudo : '');
                    Event.emit(instance, itagEmitterName+':prototypechange', {prototypes: prototypes, force: !!force});
                }
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
        FunctionPrototype.removePrototypes = function(properties, silent) {
            var instance = this,
                itagEmitterName;
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

                if (!silent) {
                    // cannot emit on the instance
                    itagEmitterName = instance.$$itag + (instance.$$pseudo ? '#'+instance.$$pseudo : '');
                    Event.emit(instance, itagEmitterName+':prototyperemove', {properties: properties});
                }
                instance.prototype.emit('prototyperemove', {properties: properties});
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
                Event.defineEvent(itagEmitterName+':change').unPreventable();
                Event.defineEvent(itagEmitterName+':prototypechange').unPreventable();
                Event.defineEvent(itagEmitterName+':prototyperemove').unPreventable();

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
        * @param [mergeCurrent=false] {Boolean} when set true, current properties on the iTag that aren't defined
        *                                       in the new model, get merged into the new model.
        * @param [fineGrain] {Function} A function that recieves `model` as argument and should return a
        *                               manipulated (subset) of model as new model to be bound
        * @return {Object} handler with a `detach()`-method which can be used to detach the binder
        * @since 0.0.1
        */
        ElementPrototype.bindModel = function(model, mergeCurrent, fineGrain) {
            var instance = this,
                observer;
            if (instance._syncUI) {
                itagCore.bindModel(instance, (typeof fineGrain==='function') ? fineGrain(instance, model) : model, mergeCurrent);
                return {
                    detach: function() {
                        observer = instance.getData('_observer');
                        instance.model.unobserve(observer);
                    }
                };
            }
            // else for compatabilaty, return a detachFn
            return {
                detach: function() {}
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
                if (instance._attrs && (valueType=instance._attrs[attributeName])) {
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
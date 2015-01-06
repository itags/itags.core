
"use strict";

require('js-ext/lib/object.js');
require('js-ext/lib/function.js');
require('polyfill/polyfill-base.js');

var async = require('utils').async,
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
    NOOP = function() {};

module.exports = function (window) {

    var DOCUMENT = window.document,
        ItagBase, MUTATION_EVENTS, itagFilter, Event, renderDomElements,
        defineProperty, defineProperties, fullMerge;

    require('vdom')(window);
    Event = require('event-dom')(window);

    window.ITAGS || Object.protectedProp(window, 'ITAGS', {});

/*jshint boss:true */
    if (ItagBase=window.ITAGS.ItagBase) {
/*jshint boss:false */
        return ItagBase; // ItagBase was already defined
    }

    MUTATION_EVENTS = [NODE_REMOVED, NODE_INSERTED, NODE_CONTENT_CHANGE, ATTRIBUTE_REMOVED, ATTRIBUTE_CHANGED, ATTRIBUTE_INSERTED];

    itagFilter = function(e) {
        return !!e.target.renderCE;
    };

    Event.after(
        [NODE_INSERTED, ATTRIBUTE_CHANGED, ATTRIBUTE_INSERTED, ATTRIBUTE_REMOVED],
        function(e) {
            e.target.renderCE();
        },
        itagFilter
    );

    renderDomElements = function(tagName) {
console.warn('renderDomElements '+tagName);
        var itagElements = DOCUMENT.getAll(tagName),
            len = itagElements.length,
            i, itagElement;
console.warn('found: '+len);
        for (i=0; i<len; i++) {
            itagElement = itagElements[i];
console.warn(itagElement.getOuterHTML());
console.warn(itagElement.renderCE);
            itagElement.renderCE && itagElement.renderCE();
        }
    };


// Define configurable, writable and non-enumerable props
// if they don't exist.
defineProperty = function (object, name, method, force) {
  if (!force && (name in object)) {
    return;
  }
  Object.defineProperty(object, name, {
    configurable: true,
    enumerable: false,
    writable: true,
    value: method
  });
};

defineProperties = function (object, map, force) {
  var names = Object.keys(map),
    l = names.length,
    i = -1,
    name;
  while (++i < l) {
    name = names[i];
    defineProperty(object, name, map[name], force);
  }
};

fullMerge = function (sourceObj, targetObj) {
console.info('merging...');
    var name;
    for (name in sourceObj) {
console.info(name);
        if (!(name in targetObj)) {
console.info(name+' will be set');
            targetObj[name] = sourceObj[name];
        }
    }
};

/**
 * Pollyfils for often used functionality for Function
 * @class Function
*/
ItagBase = {};

defineProperties(ItagBase, {

  /**
   * Merges the given map of properties into the `prototype` of the Class.
   * **Not** to be used on instances.
   *
   * The members in the hash map will become members with
   * instances of the merged class.
   *
   * By default, this method will not override existing prototype members,
   * unless the second argument `force` is true.
   *
   * @method mergePrototypes
   * @param map {Object} Hash map of properties to add to the prototype of this object
   * @param force {Boolean}  If true, existing members will be overwritten
   * @chainable
   */
  mergePrototypes: function (map, force) {
console.warn('START');
    var instance = this,
        proto = instance.prototype,
        names = Object.keys(map || {}),
      l = names.length,
      i = -1,
      name, nameInProto;
    while (++i < l) {
      name = names[i];
console.warn('TRY '+name);
      nameInProto = (name in proto);
      if (!nameInProto || force) {
console.warn('HANDLING '+name);
        // if nameInProto: set the property, but also backup for chaining using $orig
        if (typeof map[name] === 'function') {
          proto[name] = (function (original, methodName) {
            return function () {
              instance.$orig[methodName] = original;
              return map[methodName].apply(this, arguments);
            };
          })(proto[name] || NOOP, name);
        }
        else {
console.warn('setting '+name+' --> '+map[name]);
            proto[name] = map[name];
        }
      }
    }
    return instance;
  },

  /**
   * Returns a newly created class inheriting from this class
   * using the given `constructor` with the
   * prototypes listed in `prototypes` merged in.
   *
   *
   * The newly created class has the `$super` static property
   * available to access all of is ancestor's instance methods.
   *
   * Further methods can be added via the [mergePrototypes](#method_mergePrototypes).
   *
   * @example
   *
   *  var Circle = Shape.subClass(
   *    function (x, y, r) {
   *      this.r = r;
   *      Circle.$super.constructor.call(this, x, y);
   *    },
   *    {
   *      area: function () {
   *        return this.r * this.r * Math.PI;
   *      }
   *    }
   *  );
   *
   * @method subClass
   * @param [constructor] {Function} The function that will serve as constructor for the new class.
   *        If `undefined` defaults to `Object.constructor`
   * @param [prototypes] {Object} Hash map of properties to be added to the prototype of the new class.
   * @return the new class.
   */
    subClass: function (itagName, constructor, prototypes) {
  console.warn('subclassing htmlelement');
        var instance = this,
            baseProt = instance.prototype || {},
            previousDefinition = window.ITAGS[itagName],
            rp, customElement;

        if (previousDefinition) {
            console.warn(itagName+' already exists and cannot be redefined');
            return previousDefinition;
        }

        if ((arguments.length === 2) && (typeof constructor !== 'function')) {
            prototypes = constructor;
            constructor = null;
        }

        constructor = constructor || function (ancestor) {
            return function () {
              ancestor.apply(this, arguments);
            };
        }(instance);

        rp = Object.create(baseProt);

        constructor.prototype = rp;

        rp.constructor = constructor;
        constructor.$super = baseProt;
        constructor.$orig = {};

        Object.protectedProp(constructor, 'itagName', itagName);

        constructor.mergePrototypes(prototypes, true);

        customElement = function() {
            var element = DOCUMENT._createElement(itagName);
            // merge all properties of the constructor:
            fullMerge(constructor, element);
            // render, but do this after the element is created:
            // in the next eventcycle:
            async(function() {
                constructor.call(element);
            });
            return element;
        };
        window.ITAGS[itagName.toUpperCase()] = customElement;
        renderDomElements(itagName);
        return constructor;
    }

});



    DOCUMENT._createElement = DOCUMENT.createElement;
    DOCUMENT.createElement = function(tag) {
console.warn('createElement '+tag);
        var ItagClass = window.ITAGS[tag];
        if (ItagClass) {
console.warn('create itag!');
            return new ItagClass();
        }
console.warn('create native');
        return this._createElement(tag);
    };

    window.ITAGS.ItagBase = ItagBase;

    return ItagBase;

};
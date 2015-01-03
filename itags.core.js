/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
// @version 0.5.1
module.exports = function (window) {

    "use strict";

    require('vdom')(window);

    if (typeof window.WeakMap === "undefined") {
      (function() {
        var defineProperty = Object.defineProperty;
        var counter = Date.now() % 1e9;
        var WeakMap = function() {
          this.name = "__st" + (Math.random() * 1e9 >>> 0) + (counter++ + "__");
        };
        WeakMap.prototype = {
          set: function(key, value) {
            var entry = key[this.name];
            if (entry && entry[0] === key) entry[1] = value; else defineProperty(key, this.name, {
              value: [ key, value ],
              writable: true
            });
            return this;
          },
          get: function(key) {
            var entry;
            return (entry = key[this.name]) && entry[0] === key ? entry[1] : undefined;
          },
          "delete": function(key) {
            var entry = key[this.name];
            if (!entry || entry[0] !== key) return false;
            entry[0] = entry[1] = undefined;
            return true;
          },
          has: function(key) {
            var entry = key[this.name];
            if (!entry) return false;
            return entry[0] === key;
          }
        };
        window.WeakMap = WeakMap;
      })();
    }

    (function(global) {
      var registrationsTable = new window.WeakMap();
      var setImmediate;
      if (/Trident/.test(window.navigator.userAgent)) {
        setImmediate = setTimeout;
      } else if (window.setImmediate) {
        setImmediate = window.setImmediate;
      } else {
        var setImmediateQueue = [];
        var sentinel = String(Math.random());
        window.addEventListener("message", function(e) {
          if (e.data === sentinel) {
            var queue = setImmediateQueue;
            setImmediateQueue = [];
            queue.forEach(function(func) {
              func();
            });
          }
        });
        setImmediate = function(func) {
          setImmediateQueue.push(func);
          window.postMessage(sentinel, "*");
        };
      }
      var isScheduled = false;
      var scheduledObservers = [];
      function scheduleCallback(observer) {
        scheduledObservers.push(observer);
        if (!isScheduled) {
          isScheduled = true;
          setImmediate(dispatchCallbacks);
        }
      }
      function wrapIfNeeded(node) {
        return window.ShadowDOMPolyfill && window.ShadowDOMPolyfill.wrapIfNeeded(node) || node;
      }
      function dispatchCallbacks() {
        isScheduled = false;
        var observers = scheduledObservers;
        scheduledObservers = [];
        observers.sort(function(o1, o2) {
          return o1.uid_ - o2.uid_;
        });
        var anyNonEmpty = false;
        observers.forEach(function(observer) {
          var queue = observer.takeRecords();
          removeTransientObserversFor(observer);
          if (queue.length) {
            observer.callback_(queue, observer);
            anyNonEmpty = true;
          }
        });
        if (anyNonEmpty) dispatchCallbacks();
      }
      function removeTransientObserversFor(observer) {
        observer.nodes_.forEach(function(node) {
          var registrations = registrationsTable.get(node);
          if (!registrations) return;
          registrations.forEach(function(registration) {
            if (registration.observer === observer) registration.removeTransientObservers();
          });
        });
      }
      function forEachAncestorAndObserverEnqueueRecord(target, callback) {
        for (var node = target; node; node = node.parentNode) {
          var registrations = registrationsTable.get(node);
          if (registrations) {
            for (var j = 0; j < registrations.length; j++) {
              var registration = registrations[j];
              var options = registration.options;
              if (node !== target && !options.subtree) continue;
              var record = callback(options);
              if (record) registration.enqueue(record);
            }
          }
        }
      }
      var uidCounter = 0;
      function JsMutationObserver(callback) {
        this.callback_ = callback;
        this.nodes_ = [];
        this.records_ = [];
        this.uid_ = ++uidCounter;
      }
      JsMutationObserver.prototype = {
        observe: function(target, options) {
          target = wrapIfNeeded(target);
          if (!options.childList && !options.attributes && !options.characterData || options.attributeOldValue && !options.attributes || options.attributeFilter && options.attributeFilter.length && !options.attributes || options.characterDataOldValue && !options.characterData) {
            throw new SyntaxError();
          }
          var registrations = registrationsTable.get(target);
          if (!registrations) registrationsTable.set(target, registrations = []);
          var registration;
          for (var i = 0; i < registrations.length; i++) {
            if (registrations[i].observer === this) {
              registration = registrations[i];
              registration.removeListeners();
              registration.options = options;
              break;
            }
          }
          if (!registration) {
            registration = new Registration(this, target, options);
            registrations.push(registration);
            this.nodes_.push(target);
          }
          registration.addListeners();
        },
        disconnect: function() {
          this.nodes_.forEach(function(node) {
            var registrations = registrationsTable.get(node);
            for (var i = 0; i < registrations.length; i++) {
              var registration = registrations[i];
              if (registration.observer === this) {
                registration.removeListeners();
                registrations.splice(i, 1);
                break;
              }
            }
          }, this);
          this.records_ = [];
        },
        takeRecords: function() {
          var copyOfRecords = this.records_;
          this.records_ = [];
          return copyOfRecords;
        }
      };
      function MutationRecord(type, target) {
        this.type = type;
        this.target = target;
        this.addedNodes = [];
        this.removedNodes = [];
        this.previousSibling = null;
        this.nextSibling = null;
        this.attributeName = null;
        this.attributeNamespace = null;
        this.oldValue = null;
      }
      function copyMutationRecord(original) {
        var record = new MutationRecord(original.type, original.target);
        record.addedNodes = original.addedNodes.slice();
        record.removedNodes = original.removedNodes.slice();
        record.previousSibling = original.previousSibling;
        record.nextSibling = original.nextSibling;
        record.attributeName = original.attributeName;
        record.attributeNamespace = original.attributeNamespace;
        record.oldValue = original.oldValue;
        return record;
      }
      var currentRecord, recordWithOldValue;
      function getRecord(type, target) {
        currentRecord = new MutationRecord(type, target);
        return currentRecord;
      }
      function getRecordWithOldValue(oldValue) {
        if (recordWithOldValue) return recordWithOldValue;
        recordWithOldValue = copyMutationRecord(currentRecord);
        recordWithOldValue.oldValue = oldValue;
        return recordWithOldValue;
      }
      function clearRecords() {
        currentRecord = recordWithOldValue = undefined;
      }
      function recordRepresentsCurrentMutation(record) {
        return record === recordWithOldValue || record === currentRecord;
      }
      function selectRecord(lastRecord, newRecord) {
        if (lastRecord === newRecord) return lastRecord;
        if (recordWithOldValue && recordRepresentsCurrentMutation(lastRecord)) return recordWithOldValue;
        return null;
      }
      function Registration(observer, target, options) {
        this.observer = observer;
        this.target = target;
        this.options = options;
        this.transientObservedNodes = [];
      }
      Registration.prototype = {
        enqueue: function(record) {
          var records = this.observer.records_;
          var length = records.length;
          if (records.length > 0) {
            var lastRecord = records[length - 1];
            var recordToReplaceLast = selectRecord(lastRecord, record);
            if (recordToReplaceLast) {
              records[length - 1] = recordToReplaceLast;
              return;
            }
          } else {
            scheduleCallback(this.observer);
          }
          records[length] = record;
        },
        addListeners: function() {
          this.addListeners_(this.target);
        },
        addListeners_: function(node) {
          var options = this.options;
          if (options.attributes) node.addEventListener("DOMAttrModified", this, true);
          if (options.characterData) node.addEventListener("DOMCharacterDataModified", this, true);
          if (options.childList) node.addEventListener("DOMNodeInserted", this, true);
          if (options.childList || options.subtree) node.addEventListener("DOMNodeRemoved", this, true);
        },
        removeListeners: function() {
          this.removeListeners_(this.target);
        },
        removeListeners_: function(node) {
          var options = this.options;
          if (options.attributes) node.removeEventListener("DOMAttrModified", this, true);
          if (options.characterData) node.removeEventListener("DOMCharacterDataModified", this, true);
          if (options.childList) node.removeEventListener("DOMNodeInserted", this, true);
          if (options.childList || options.subtree) node.removeEventListener("DOMNodeRemoved", this, true);
        },
        addTransientObserver: function(node) {
          if (node === this.target) return;
          this.addListeners_(node);
          this.transientObservedNodes.push(node);
          var registrations = registrationsTable.get(node);
          if (!registrations) registrationsTable.set(node, registrations = []);
          registrations.push(this);
        },
        removeTransientObservers: function() {
          var transientObservedNodes = this.transientObservedNodes;
          this.transientObservedNodes = [];
          transientObservedNodes.forEach(function(node) {
            this.removeListeners_(node);
            var registrations = registrationsTable.get(node);
            for (var i = 0; i < registrations.length; i++) {
              if (registrations[i] === this) {
                registrations.splice(i, 1);
                break;
              }
            }
          }, this);
        },
        handleEvent: function(e) {
          var record, target, oldValue;
          e.stopImmediatePropagation();
          switch (e.type) {
           case "DOMAttrModified":
            var name = e.attrName;
            var namespace = e.relatedNode.namespaceURI;
            target = e.target;
            record = new getRecord("attributes", target);
            record.attributeName = name;
            record.attributeNamespace = namespace;
            oldValue = e.attrChange === window.MutationEvent.ADDITION ? null : e.prevValue;
            forEachAncestorAndObserverEnqueueRecord(target, function(options) {
              if (!options.attributes) return;
              if (options.attributeFilter && options.attributeFilter.length && options.attributeFilter.indexOf(name) === -1 && options.attributeFilter.indexOf(namespace) === -1) {
                return;
              }
              if (options.attributeOldValue) return getRecordWithOldValue(oldValue);
              return record;
            });
            break;

           case "DOMCharacterDataModified":
            target = e.target;
            record = getRecord("characterData", target);
            oldValue = e.prevValue;
            forEachAncestorAndObserverEnqueueRecord(target, function(options) {
              if (!options.characterData) return;
              if (options.characterDataOldValue) return getRecordWithOldValue(oldValue);
              return record;
            });
            break;

           case "DOMNodeRemoved":
            this.addTransientObserver(e.target);

           case "DOMNodeInserted":
            target = e.relatedNode;
            var changedNode = e.target;
            var addedNodes, removedNodes;
            if (e.type === "DOMNodeInserted") {
              addedNodes = [ changedNode ];
              removedNodes = [];
            } else {
              addedNodes = [];
              removedNodes = [ changedNode ];
            }
            var previousSibling = changedNode.previousSibling;
            var nextSibling = changedNode.nextSibling;
            record = getRecord("childList", target);
            record.addedNodes = addedNodes;
            record.removedNodes = removedNodes;
            record.previousSibling = previousSibling;
            record.nextSibling = nextSibling;
            forEachAncestorAndObserverEnqueueRecord(target, function(options) {
              if (!options.childList) return;
              return record;
            });
          }
          clearRecords();
        }
      };
      global.JsMutationObserver = JsMutationObserver;
      if (!global.MutationObserver) global.MutationObserver = JsMutationObserver;
    })(window);

    window.CustomElements = window.CustomElements || {
      flags: {}
    };

    (function(scope) {
      var flags = scope.flags;
      var modules = [];
      var addModule = function(module) {
        modules.push(module);
      };
      var initializeModules = function() {
        modules.forEach(function(module) {
          module(scope);
        });
      };
      scope.addModule = addModule;
      scope.initializeModules = initializeModules;
      scope.hasNative = Boolean(window.document.registerElement);
      scope.useNative = !flags.register && scope.hasNative && !window.ShadowDOMPolyfill && (!window.HTMLImports || window.HTMLImports.useNative);
    })(window.CustomElements);

    window.CustomElements.addModule(function(scope) {
      var IMPORT_LINK_TYPE = window.HTMLImports ? window.HTMLImports.IMPORT_LINK_TYPE : "none";
      function forSubtree(node, cb) {
        findAllElements(node, function(e) {
          if (cb(e)) {
            return true;
          }
          forRoots(e, cb);
        });
        forRoots(node, cb);
      }
      function findAllElements(node, find, data) {
        var e = node.firstElementChild;
        if (!e) {
          e = node.firstChild;
          while (e && e.nodeType !== window.Node.ELEMENT_NODE) {
            e = e.nextSibling;
          }
        }
        while (e) {
          if (find(e, data) !== true) {
            findAllElements(e, find, data);
          }
          e = e.nextElementSibling;
        }
        return null;
      }
      function forRoots(node, cb) {
        var root = node.shadowRoot;
        while (root) {
          forSubtree(root, cb);
          root = root.olderShadowRoot;
        }
      }
      var processingDocuments;
      function forDocumentTree(doc, cb) {
        processingDocuments = [];
        _forDocumentTree(doc, cb);
        processingDocuments = null;
      }
      function _forDocumentTree(doc, cb) {
        doc = window.wrap(doc);
        if (processingDocuments.indexOf(doc) >= 0) {
          return;
        }
        processingDocuments.push(doc);
        var imports = doc.querySelectorAll("link[rel=" + IMPORT_LINK_TYPE + "]");
        for (var i = 0, l = imports.length, n; i < l && (n = imports[i]); i++) {
          if (n.import) {
            _forDocumentTree(n.import, cb);
          }
        }
        cb(doc);
      }
      scope.forDocumentTree = forDocumentTree;
      scope.forSubtree = forSubtree;
    });

    window.CustomElements.addModule(function(scope) {
      var flags = scope.flags;
      var forSubtree = scope.forSubtree;
      var forDocumentTree = scope.forDocumentTree;
      function addedNode(node) {
        return added(node) || addedSubtree(node);
      }
      function added(node) {
        if (scope.upgrade(node)) {
          return true;
        }
        attached(node);
      }
      function addedSubtree(node) {
        forSubtree(node, function(e) {
          if (added(e)) {
            return true;
          }
        });
      }
      function attachedNode(node) {
        attached(node);
        if (inDocument(node)) {
          forSubtree(node, function(e) {
            attached(e);
          });
        }
      }
      var hasPolyfillMutations = !window.MutationObserver || window.MutationObserver === window.JsMutationObserver;
      scope.hasPolyfillMutations = hasPolyfillMutations;
      var isPendingMutations = false;
      var pendingMutations = [];
      function deferMutation(fn) {
        pendingMutations.push(fn);
        if (!isPendingMutations) {
          isPendingMutations = true;
          setTimeout(takeMutations);
        }
      }
      function takeMutations() {
        isPendingMutations = false;
        var $p = pendingMutations;
        for (var i = 0, l = $p.length, p; i < l && (p = $p[i]); i++) {
          p();
        }
        pendingMutations = [];
      }
      function attached(element) {
        if (hasPolyfillMutations) {
          deferMutation(function() {
            _attached(element);
          });
        } else {
          _attached(element);
        }
      }
      function _attached(element) {
        if (element.__upgraded__ && (element.attachedCallback || element.detachedCallback)) {
          if (!element.__attached && inDocument(element)) {
            element.__attached = true;
            if (element.attachedCallback) {
              element.attachedCallback();
            }
          }
        }
      }
      function detachedNode(node) {
        detached(node);
        forSubtree(node, function(e) {
          detached(e);
        });
      }
      function detached(element) {
        if (hasPolyfillMutations) {
          deferMutation(function() {
            _detached(element);
          });
        } else {
          _detached(element);
        }
      }
      function _detached(element) {
        if (element.__upgraded__ && (element.attachedCallback || element.detachedCallback)) {
          if (element.__attached && !inDocument(element)) {
            element.__attached = false;
            if (element.detachedCallback) {
              element.detachedCallback();
            }
          }
        }
      }
      function inDocument(element) {
        var p = element;
        var doc = window.wrap(window.document);
        while (p) {
          if (p == doc) {
            return true;
          }
          p = p.parentNode || p.host;
        }
      }
      function watchShadow(node) {
        if (node.shadowRoot && !node.shadowRoot.__watched) {
          flags.dom && console.log("watching shadow-root for: ", node.localName);
          var root = node.shadowRoot;
          while (root) {
            observe(root);
            root = root.olderShadowRoot;
          }
        }
      }
      function handler(mutations) {
        var u;
        if (flags.dom) {
          var mx = mutations[0];
          if (mx && mx.type === "childList" && mx.addedNodes) {
            if (mx.addedNodes) {
              var d = mx.addedNodes[0];
              while (d && d !== window.document && !d.host) {
                d = d.parentNode;
              }
              u = d && (d.URL || d._URL || d.host && d.host.localName) || "";
              u = u.split("/?").shift().split("/").pop();
            }
          }
          console.group("mutations (%d) [%s]", mutations.length, u || "");
        }
        mutations.forEach(function(mx) {
          if (mx.type === "childList") {
            forEach(mx.addedNodes, function(n) {
              if (!n.localName) {
                return;
              }
              addedNode(n);
            });
            forEach(mx.removedNodes, function(n) {
              if (!n.localName) {
                return;
              }
              detachedNode(n);
            });
          }
        });
        flags.dom && console.groupEnd();
      }
      function takeRecords(node) {
        node = window.wrap(node);
        if (!node) {
          node = window.wrap(window.document);
        }
        while (node.parentNode) {
          node = node.parentNode;
        }
        var observer = node.__observer;
        if (observer) {
          handler(observer.takeRecords());
          takeMutations();
        }
      }
      var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
      function observe(inRoot) {
        if (inRoot.__observer) {
          return;
        }
        var observer = new window.MutationObserver(handler);
        observer.observe(inRoot, {
          childList: true,
          subtree: true
        });
        inRoot.__observer = observer;
      }
      function upgradeDocument(doc) {
        doc = window.wrap(doc);
        flags.dom && console.group("upgradeDocument: ", doc.baseURI.split("/").pop());
        addedNode(doc);
        observe(doc);
        flags.dom && console.groupEnd();
      }
      function upgradeDocumentTree(doc) {
        forDocumentTree(doc, upgradeDocument);
      }
      var originalCreateShadowRoot = window.Element.prototype.createShadowRoot;
      window.Element.prototype.createShadowRoot = function() {
        var root = originalCreateShadowRoot.call(this);
        window.CustomElements.watchShadow(this);
        return root;
      };
      scope.watchShadow = watchShadow;
      scope.upgradeDocumentTree = upgradeDocumentTree;
      scope.upgradeSubtree = addedSubtree;
      scope.upgradeAll = addedNode;
      scope.attachedNode = attachedNode;
      scope.takeRecords = takeRecords;
    });

    window.CustomElements.addModule(function(scope) {
      var flags = scope.flags;
      function upgrade(node) {
        if (!node.__upgraded__ && node.nodeType === window.Node.ELEMENT_NODE) {
          var is = node.getAttribute("is");
          var definition = scope.getRegisteredDefinition(is || node.localName);
          if (definition) {
            if (is && definition.tag == node.localName) {
              return upgradeWithDefinition(node, definition);
            } else if (!is && !definition.extends) {
              return upgradeWithDefinition(node, definition);
            }
          }
        }
      }
      function upgradeWithDefinition(element, definition) {
        flags.upgrade && console.group("upgrade:", element.localName);
        if (definition.is) {
          element.setAttribute("is", definition.is);
        }
        implementPrototype(element, definition);
        element.__upgraded__ = true;
        created(element);
        scope.attachedNode(element);
        scope.upgradeSubtree(element);
        flags.upgrade && console.groupEnd();
        return element;
      }
      function implementPrototype(element, definition) {
        if (Object.__proto__) {
          element.__proto__ = definition.prototype;
        } else {
          customMixin(element, definition.prototype, definition.native);
          element.__proto__ = definition.prototype;
        }
      }
      function customMixin(inTarget, inSrc, inNative) {
        var used = {};
        var p = inSrc;
        while (p !== inNative && p !== window.HTMLElement.prototype) {
          var keys = Object.getOwnPropertyNames(p);
          for (var i = 0, k; k = keys[i]; i++) {
            if (!used[k]) {
              Object.defineProperty(inTarget, k, Object.getOwnPropertyDescriptor(p, k));
              used[k] = 1;
            }
          }
          p = Object.getPrototypeOf(p);
        }
      }
      function created(element) {
        if (element.createdCallback) {
          element.createdCallback();
        }
      }
      scope.upgrade = upgrade;
      scope.upgradeWithDefinition = upgradeWithDefinition;
      scope.implementPrototype = implementPrototype;
    });

    window.CustomElements.addModule(function(scope) {
      var upgradeDocumentTree = scope.upgradeDocumentTree;
      var upgrade = scope.upgrade;
      var upgradeWithDefinition = scope.upgradeWithDefinition;
      var implementPrototype = scope.implementPrototype;
      var useNative = scope.useNative;
      function register(name, options) {
        var definition = options || {};
        if (!name) {
          throw new Error("window.document.registerElement: first argument `name` must not be empty");
        }
        if (name.indexOf("-") < 0) {
          throw new Error("window.document.registerElement: first argument ('name') must contain a dash ('-'). Argument provided was '" + String(name) + "'.");
        }
        if (isReservedTag(name)) {
          throw new Error("Failed to execute 'registerElement' on 'Document': Registration failed for type '" + String(name) + "'. The type name is invalid.");
        }
        if (getRegisteredDefinition(name)) {
          throw new Error("DuplicateDefinitionError: a type with name '" + String(name) + "' is already registered");
        }
        if (!definition.prototype) {
          definition.prototype = Object.create(window.HTMLElement.prototype);
        }
        definition.__name = name.toLowerCase();
        definition.lifecycle = definition.lifecycle || {};
        definition.ancestry = ancestry(definition.extends);
        resolveTagName(definition);
        resolvePrototypeChain(definition);
        overrideAttributeApi(definition.prototype);
        registerDefinition(definition.__name, definition);
        definition.ctor = generateConstructor(definition);
        definition.ctor.prototype = definition.prototype;
        definition.prototype.constructor = definition.ctor;
        if (scope.ready) {
          upgradeDocumentTree(window.document);
        }
        return definition.ctor;
      }
      function overrideAttributeApi(prototype) {
        if (prototype.setAttribute._polyfilled) {
          return;
        }
        var setAttribute = prototype.setAttribute;
        prototype.setAttribute = function(name, value) {
          changeAttribute.call(this, name, value, setAttribute);
        };
        var removeAttribute = prototype.removeAttribute;
        prototype.removeAttribute = function(name) {
          changeAttribute.call(this, name, null, removeAttribute);
        };
        prototype.setAttribute._polyfilled = true;
      }
      function changeAttribute(name, value, operation) {
        name = name.toLowerCase();
        var oldValue = this.getAttribute(name);
        operation.apply(this, arguments);
        var newValue = this.getAttribute(name);
        if (this.attributeChangedCallback && newValue !== oldValue) {
          this.attributeChangedCallback(name, oldValue, newValue);
        }
      }
      function isReservedTag(name) {
        for (var i = 0; i < reservedTagList.length; i++) {
          if (name === reservedTagList[i]) {
            return true;
          }
        }
      }
      var reservedTagList = [ "annotation-xml", "color-profile", "font-face", "font-face-src", "font-face-uri", "font-face-format", "font-face-name", "missing-glyph" ];
      function ancestry(extnds) {
        var extendee = getRegisteredDefinition(extnds);
        if (extendee) {
          return ancestry(extendee.extends).concat([ extendee ]);
        }
        return [];
      }
      function resolveTagName(definition) {
        var baseTag = definition.extends;
        for (var i = 0, a; a = definition.ancestry[i]; i++) {
          baseTag = a.is && a.tag;
        }
        definition.tag = baseTag || definition.__name;
        if (baseTag) {
          definition.is = definition.__name;
        }
      }
      function resolvePrototypeChain(definition) {
        if (!Object.__proto__) {
          var nativePrototype = window.HTMLElement.prototype;
          if (definition.is) {
            var inst = window.document.createElement(definition.tag);
            var expectedPrototype = Object.getPrototypeOf(inst);
            if (expectedPrototype === definition.prototype) {
              nativePrototype = expectedPrototype;
            }
          }
          var proto = definition.prototype, ancestor;
          while (proto && proto !== nativePrototype) {
            ancestor = Object.getPrototypeOf(proto);
            proto.__proto__ = ancestor;
            proto = ancestor;
          }
          definition.native = nativePrototype;
        }
      }
      function instantiate(definition) {
        return upgradeWithDefinition(domCreateElement(definition.tag), definition);
      }
      var registry = {};
      function getRegisteredDefinition(name) {
        if (name) {
          return registry[name.toLowerCase()];
        }
      }
      function registerDefinition(name, definition) {
        registry[name] = definition;
      }
      function generateConstructor(definition) {
        return function() {
          return instantiate(definition);
        };
      }
      var HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
      function createElementNS(namespace, tag, typeExtension) {
        if (namespace === HTML_NAMESPACE) {
          return createElement(tag, typeExtension);
        } else {
          return domCreateElementNS(namespace, tag);
        }
      }
      function createElement(tag, typeExtension) {
        var definition = getRegisteredDefinition(typeExtension || tag);
        if (definition) {
          if (tag == definition.tag && typeExtension == definition.is) {
            return new definition.ctor();
          }
          if (!typeExtension && !definition.is) {
            return new definition.ctor();
          }
        }
        var element;
        if (typeExtension) {
          element = createElement(tag);
          element.setAttribute("is", typeExtension);
          return element;
        }
        element = domCreateElement(tag);
        if (tag.indexOf("-") >= 0) {
          implementPrototype(element, window.HTMLElement);
        }
        return element;
      }
      function cloneNode(deep) {
        var n = domCloneNode.call(this, deep);
        upgrade(n);
        return n;
      }
      var domCreateElement = window.document.createElement.bind(window.document);
      var domCreateElementNS = window.document.createElementNS.bind(window.document);
      var domCloneNode = window.Node.prototype.cloneNode;
      var isInstance;
      if (!Object.__proto__ && !useNative) {
        isInstance = function(obj, ctor) {
          var p = obj;
          while (p) {
            if (p === ctor.prototype) {
              return true;
            }
            p = p.__proto__;
          }
          return false;
        };
      } else {
        isInstance = function(obj, base) {
          return obj instanceof base;
        };
      }
      window.document.registerElement = register;
      window.document.createElement = createElement;
      window.document.createElementNS = createElementNS;
      window.Node.prototype.cloneNode = cloneNode;
      scope.registry = registry;
      scope.instanceof = isInstance;
      scope.reservedTagList = reservedTagList;
      scope.getRegisteredDefinition = getRegisteredDefinition;
      window.document.register = window.document.registerElement;
    });

    (function(scope) {
      var useNative = scope.useNative;
      var initializeModules = scope.initializeModules;
      if (useNative) {
        var nop = function() {};
        scope.watchShadow = nop;
        scope.upgrade = nop;
        scope.upgradeAll = nop;
        scope.upgradeDocumentTree = nop;
        scope.upgradeSubtree = nop;
        scope.takeRecords = nop;
        scope.instanceof = function(obj, base) {
          return obj instanceof base;
        };
      } else {
        initializeModules();
      }
      var upgradeDocumentTree = scope.upgradeDocumentTree;
      if (!window.wrap) {
        if (window.ShadowDOMPolyfill) {
          window.wrap = window.ShadowDOMPolyfill.wrapIfNeeded;
          window.unwrap = window.ShadowDOMPolyfill.unwrapIfNeeded;
        } else {
          window.wrap = window.unwrap = function(node) {
            return node;
          };
        }
      }
      function bootstrap() {
        upgradeDocumentTree(window.wrap(window.document));
        if (window.HTMLImports) {
          window.HTMLImports.__importsParsingHook = function(elt) {
            upgradeDocumentTree(window.wrap(elt.import));
          };
        }
        window.CustomElements.ready = true;
        setTimeout(function() {
          window.CustomElements.readyTime = Date.now();
          if (window.HTMLImports) {
            window.CustomElements.elapsed = window.CustomElements.readyTime - window.HTMLImports.readyTime;
          }
          window.document.dispatchEvent(new window.CustomEvent("WebComponentsReady", {
            bubbles: true
          }));
        });
      }
      if (typeof window.CustomEvent !== "function") {
        window.CustomEvent = function(inType, params) {
          params = params || {};
          var e = window.document.createEvent("CustomEvent");
          e.initCustomEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable), params.detail);
          return e;
        };
        window.CustomEvent.prototype = window.Event.prototype;
      }
      if (window.document.readyState === "complete" || scope.flags.eager) {
        bootstrap();
      } else if (window.document.readyState === "interactive" && !window.attachEvent && (!window.HTMLImports || window.HTMLImports.ready)) {
        bootstrap();
      } else {
        var loadEvent = window.HTMLImports && !window.HTMLImports.ready ? "HTMLImportsLoaded" : "DOMContentLoaded";
        window.addEventListener(loadEvent, bootstrap);
      }
    })(window.CustomElements);

    var createdCallback = function() {
console.warn('fase A1');
        var instance = this;
        if (instance._renderCE && !instance.getAttr('itag-rendered')) {
console.warn('fase A2');
setTimeout(function() {
              instance._renderCE();
              instance.setAttr('itag-rendered', 'true');

}, 1000);
        }
    };

    (function(HTMLElementPrototype) {

        HTMLElementPrototype.createdCallback = createdCallback;

    }(window.HTMLElement.prototype));

    return {
        defineCE: function(customElement, renderFn, prototype) {
            var newProto = Object.create(prototype || window.HTMLElement.prototype);

            (customElement.indexOf('-')!==-1) || (customElement='i-'+customElement);
            if (!newProto.createdCallback) {
                newProto.createdCallback = createdCallback;
            }
            newProto._renderCE = renderFn;

  console.warn('registering '+customElement);
            // Register CE-definition:
            window.document.registerElement(customElement, {prototype: newProto});
            return newProto;
        }
    };

};
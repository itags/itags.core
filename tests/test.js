/*global describe, it */
/*jshint unused:false */

"use strict";

var expect = require('chai').expect,
    itagCore = require("../itags.core")(window, true),
    Classes = require("js-ext/extra/classes.js"),
    DOCUMENT = window.document;

require("js-ext");

// Shape - superclass
//function Shape(x, y) {
//  this.x = x || 0;
//  this.y = y || 0;
//}
//
//// superclass method
//Shape.prototype.move = function (x, y) {
//  this.x += x;
//  this.y += y;
//};

/*
var Shape = Classes.createClass(function (x, y) {
    this.x = x || 0;
    this.y = y || 0;
},{
    move: function (x, y) {
        this.x += x;
        this.y += y;
    }
});
var Circle = Shape.subClass(
    function (x, y, r) {
        this.r = r || 1;
        this.$superProp('constructor', x, y);
    },{
        area: function () {
            return this.r * this.r * Math.PI;
        }
    }
);
*/
var NOOP = function() {};


// itagCore.setPrototypeChain(false);


/*
        describe('redefine init', function () {
            it('Elements should be re-initialized', function (done) {
                var count = 0,
                    D = DOCUMENT.createItag('i-d1', {
                    init: function() {
                        this.text = 'first';
                    },
                    render: function() {
                        return this.text;
                    },
                    destroy: function() {
                        count++;
                    }
                });
                var d = new D();


                DOCUMENT.body.appendChild(d);

                expect(d.vnode.innerHTML).to.be.equal('first');

                D.mergePrototypes({
                    init:function() {
                        this.text = 'second';
                    }
                }, true);
                setTimeout(function() {
                    expect(d.vnode.innerHTML).to.be.equal('second');
                    expect(count).to.be.equal(1);
                    d.remove();
                    done();
                }, 50);
            });

        });

        describe('redefine render', function () {

            it('Elements should be re-rendered', function (done) {
                var countInit = 0, countDestroy = 0,
                    D = DOCUMENT.createItag('i-d2', {
                    init: function() {
                        countInit++;
                        this.text = 'the content';
                    },
                    render: function() {
                        return this.text;
                    },
                    destroy: function() {
                        countDestroy++;
                    }
                });
                var d = new D();
                DOCUMENT.body.appendChild(d);
                expect(d.vnode.innerHTML).to.be.equal('the content');
                D.mergePrototypes({
                    render:function() {
                        return this.text + ' new';
                    }
                }, true);
                setTimeout(function() {
                    expect(d.vnode.innerHTML).to.be.equal('the content new');
                    expect(countInit).to.be.equal(1);
                    expect(countDestroy).to.be.equal(0);
                    d.remove();
                    done();
                }, 50);
            });

        });

*/
        describe('removed init', function () {

            it('Elements should be re-initialized', function (done) {
                var count = 0,
                    initCount = 0,
                    D = DOCUMENT.createItag('i-d1', {
                    init: function() {
                        this.text = 'first';
console.warn('D.INIT');
                        initCount++;
                    },
                    render: function() {
                        return this.text;
                    },
                    destroy: function() {
                        count++;
                    }
                });
                var d = new D();
                DOCUMENT.body.appendChild(d);
                expect(d.vnode.innerHTML).to.be.equal('first');
                expect(initCount).to.be.equal(1);
                D.removePrototypes('init');
                setTimeout(function() {
                    expect(d.vnode.innerHTML).to.be.equal('first');
                    expect(initCount).to.be.equal(1);
                    expect(count).to.be.equal(1);
                    d.remove();
                    done();
                }, 50);
            });

        });
/*
        describe('redefine render', function () {

            it('Elements should be re-rendered', function (done) {
                var countInit = 0, countDestroy = 0,
                    D = DOCUMENT.createItag('i-d2', {
                    init: function() {
                        countInit++;
                        this.text = 'the content';
                    },
                    render: function() {
                        return this.text;
                    },
                    destroy: function() {
                        countDestroy++;
                    }
                });
                var d = new D();
                DOCUMENT.body.appendChild(d);
                expect(d.vnode.innerHTML).to.be.equal('the content');
                D.removePrototypes('render');
                setTimeout(function() {
                    expect(d.vnode.innerHTML).to.be.equal('');
                    expect(countInit).to.be.equal(1);
                    expect(countDestroy).to.be.equal(0);
                    d.remove();
                }, 50);
            });

        });
*/

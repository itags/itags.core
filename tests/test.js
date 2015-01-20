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


itagCore.setPrototypeChain(false);
        describe('$orig', function () {


            it('mergePrototypes with $orig without argument', function() {
                var A = DOCUMENT.createItag('i-a18', {
                        init: function() {
                            this.x = 'a';
                        },
                        printValues: function() {
                            return this.x;
                        }
                    });

                var a = new A();

                A.mergePrototypes({
                    printValues: function() {
                        return 'new '+this.$orig();
                    }
                }, true);

                expect(a.printValues('b')).to.be.equal('new a');
            });

            it('mergePrototypes with $orig with argument', function() {
                var A = DOCUMENT.createItag('i-a19', {
                        init: function(x) {
                            this.x = 'a';
                        },
                        printValues: function(v) {
                            return this.x+v;
                        }
                    });

                var a = new A();

                A.mergePrototypes({
                    printValues: function(v) {
                        return 'new '+this.$orig(v);
                    }
                }, true);

                expect(a.printValues('b')).to.be.equal('new ab');
            });

        });


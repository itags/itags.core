/*global describe, it */
/*jshint unused:false */

"use strict";

var expect = require('chai').expect,
    itagCore = require("../itags.core")(window, true),
    Classes = require("js-ext/extra/classes.js");

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
var NOOP = function() {};

describe('shape', function () {

    describe('empty constructor', function () {
        var s = new Shape();
        it('Should be located at 0,0', function () {
            expect(s.x).be.equal(0);
            expect(s.y).be.equal(0);
        });
    });
    describe('created with arguments', function () {
        var s = new Shape(1, 2);
        it('Should be located at 1,2', function () {
            expect(s.x).be.equal(1);
            expect(s.y).be.equal(2);
        });
        it('Should be an instance of Shape', function () {
            expect(s).be.an.instanceof(Shape);
        });
    });
});
describe('Circle', function () {
    describe('initialized circle', function () {
        var c = new Circle(1, 2, 3);
        it('should be instance of Shape and Circle', function () {
            expect(c).be.an.instanceof(Circle);
            expect(c).be.an.instanceof(Shape);
        });
        it('Should be located at 1,2, radious 3', function () {
            expect(c.x).be.equal(1);
            expect(c.y).be.equal(2);
            expect(c.r).be.equal(3);
        });
    });
    describe('Should be able to access methods of both classes', function () {

        var c = new Circle(1, 2, 3);
        it('Method of the parent class', function () {
            c.move(1, 1);
            expect(c.x).be.equal(2);
            expect(c.y).be.equal(3);
            expect(c.r).be.equal(3);
        });
        it('method of the new class', function () {
            expect(c.area()).be.closeTo(28.274, 0.001);
        });
    });
});

describe('With no constructor:', function () {
    var P = Classes.createClass({
            twice: function (v) {
                return 2 * v;
            }
        });
    it('base class', function () {
        var p = new P();
        expect(p.twice(3)).eql(6);
    });
    it('inherited class', function () {
        var Q = P.subClass({
                square: function (v) {
                    return v * v;
                },
                times4: function (v) {
                    return this.$superProp('twice', this.$superProp('twice', v));
                }
            }),
            q = new Q();
        expect(q.square(5)).eql(25);
        expect(q.times4(4)).eql(16);
    });
});

    describe('Multiple levels', function () {
        var A = Classes.createClass(
            function (a) {
                this.a = a;
            },
            {
                add: function (b) {
                    this.a += b;
                }
            }
        );
        var B = A.subClass(
            function (b) {
                this.b = b;
                this.$superProp('constructor', b);
            },
            {
                add: function (c) {
                    this.$superProp('add' ,(c * 2));
                }
            }
        );
        var C = B.subClass(
            function (c) {
                this.c = c;
                this.$superProp('constructor', c);
            },
            {
                add: function (c) {
                    this.$superProp('add', (c * 3));
                }
            }
        );

        it ('one level', function () {
            var a = new A(3);
            expect(a.a).eql(3);
            a.add(2);
            expect(a.a).eql(5);
        });

        it ('two levels', function () {

            var b = new B(3);
            expect(b.a).eql(3);
            expect(b.b).eql(3);
            b.add(2);
            expect(b.a).eql(7);

            // Later classes should not interfer with the previous
            var a = new A(3);
            expect(a.a).eql(3);
            expect(a.b===undefined).to.be.true;
            a.add(2);
            expect(a.a).eql(5);
            expect(b.a).eql(7);
        });

        it ('three levels', function () {
            var c = new C(3);
            expect(c.a).eql(3);
            expect(c.b).eql(3);
            expect(c.c).eql(3);
            c.add(2);
            expect(c.a).eql(15);

            // Later classes should not interfer with the previous
            var b = new B(3);
            expect(b.a).eql(3);
            expect(b.b).eql(3);
            expect(b.c).undefined;
            b.add(2);
            expect(b.a).eql(7);
            expect(c.a).eql(15);

            // Later classes should not interfer with the previous
            var a = new A(3);
            expect(a.a).eql(3);
            expect(a.b===undefined).to.be.true;
            expect(a.c===undefined).to.be.true;
            a.add(2);
            expect(a.a).eql(5);
            expect(b.a).eql(7);
            expect(c.a).eql(15);
        });

    });
describe('Three levels with no constructor:', function () {
    var P = Classes.createClass({
            twice: function (v) {
                return 2 * v;
            }
        });
    it('base class', function () {
        var p = new P();
        expect(p.twice(3)).eql(6);
    });
    it('inherited class', function () {
        var Q = P.subClass({
                square: function (v) {
                    return v * v;
                },
                times4: function (v) {
                    return this.$superProp('twice', this.$superProp('twice', v));
                }
            }),
            q = new Q();
        expect(q.square(5)).eql(25);
        expect(q.times4(4)).eql(16);
    });
});

describe('Different arguments', function () {
    it('configuration 1', function () {
        var A = Classes.createClass(NOOP, {a: 3});
        var a = new A();
        expect(a.a).be.equal(3);
    });
    it('configuration 2', function () {
        var A = Classes.createClass(NOOP, {a: 3}, false);
        var a = new A();
        expect(a.a).be.equal(3);
    });
    it('configuration 3', function () {
        var A = Classes.createClass(NOOP, {a: 3}, true);
        var a = new A();
        expect(a.a).be.equal(3);
    });

    it('configuration 4', function () {
        var A = Classes.createClass(null, {a: 3});
        var a = new A();
        expect(a.a).be.equal(3);
    });
    it('configuration 5', function () {
        var A = Classes.createClass(null, {a: 3}, false);
        var a = new A();
        expect(a.a).be.equal(3);
    });
    it('configuration 6', function () {
        var A = Classes.createClass(null, {a: 3}, true);
        var a = new A();
        expect(a.a).be.equal(3);
    });
    it('configuration 7', function () {
        var A = Classes.createClass({a: 3});
        var a = new A();
        expect(a.a).be.equal(3);
    });
    it('configuration 8', function () {
        var A = Classes.createClass({a: 3}, false);
        var a = new A();
        expect(a.a).be.equal(3);
    });
    it('configuration 9', function () {
        var A = Classes.createClass({a: 3}, true);
        var a = new A();
        expect(a.a).be.equal(3);
    });
});

describe('Overriding Object-members', function () {

    it('size() should be defined during initialisation', function () {
        var A = Classes.createClass({
            size: function() {
                return 100;
            }
        });
        var a = new A();
        expect(a.size()).be.equal(100);
    });

    it('size() should be defined through mergePrototypes', function () {
        var A = Classes.createClass().mergePrototypes({
            size: function() {
                return 100;
            }
        }, true);
        var a = new A();
        expect(a.size()).be.equal(100);
    });
    it('size() should  be defined through mergePrototypes', function () {
        var A = Classes.createClass({
            size: function() {
                return 10;
            }
        });
        var B = A.subClass().mergePrototypes({
            size: function() {
                return 100;
            }
        }, true);
        var b = new B();
        expect(b.size()).be.equal(100);
    });
});

describe('mergePrototypes', function () {
    var obj = {a:1, b:2, c:3};
    it('new empty class', function () {
        var ClassA = Classes.createClass(),
            a = new ClassA();
        ClassA.mergePrototypes(obj);
        expect(a.b).be.eql(2);
        expect(a.hasOwnProperty('b')).be.false;
    });
    it('existing class',  function () {
        var ClassA = Classes.createClass(null, {b: 42}),
            a = new ClassA();
        // ClassA.mergePrototypes(obj);
        expect(a.b).be.eql(42);
        expect(a.hasOwnProperty('b')).be.false;
    });
    it ('existing class, overwriting', function () {
        var ClassA = Classes.createClass({
            b: 'a',
            whatever: function (v) {
                expect(1, 'should never reach this one').eql(0);
            }
        }).mergePrototypes({
            whatever: function(v) {
                expect(this.b).eql('a');
                expect(v).eql('b');
                return  this.b + v + 'c';
            }
        },true);


        var a = new ClassA();
        expect(a.b).be.eql('a');
        expect(a.whatever('b')).eql('abc');

    });
});

describe('$orig', function () {

    it('existing class, override',  function () {
        var ClassA = Classes.createClass({
            b: 'a',
            whatever: function (v) {
                expect(this.b).eql('a');
                expect(v).eql('ec');
                return this.b + v;
            }
        }).mergePrototypes({
            whatever: function(v) {
                return this.$orig(v + 'c') + 'd';
            }
        }, true);


        var a = new ClassA();
        expect(a.b).be.eql('a');
        expect(a.whatever('e')).eql('aecd');
    });
    it('Two level inheritance each with plugin', function () {
        var ClassA = Classes.createClass({
            whatever: function (a) {
                return a + 'a';
            }
        }).mergePrototypes({
            whatever: function (b) {
                return this.$orig(b) + 'b';
            }
        }, true);
        var ClassB = ClassA.subClass({
            whatever: function (c) {
                return this.$superProp('whatever', c) + 'c';
            }
        }).mergePrototypes({
            whatever: function (d) {
                return this.$orig(d) + 'd';
            }
        }, true);

        var b = new ClassB();
        expect(b.whatever('0')).eql('0abcd');
        var a = new ClassA();
        expect(a.whatever('1')).eql('1ab');
    });
    it('Two level inheritance each with two plugins each', function () {
        var ClassA = Classes.createClass({
            whatever: function (a) {
                return a + 'a';
            }
        }).mergePrototypes({
            whatever: function (b) {
                return this.$orig(b) + 'b';
            }
        }, true).mergePrototypes({
            whatever: function (b) {
                return this.$orig(b) + 'B';
            }
        }, true);
        var ClassB = ClassA.subClass({
            whatever: function (c) {
                return this.$superProp('whatever', c) + 'c';
            }
        }).mergePrototypes({
            whatever: function (d) {
                return this.$orig(d) + 'd';
            }
        }, true).mergePrototypes({
            whatever: function (d) {
                return this.$orig(d) + 'D';
            }
        }, true);

        var b = new ClassB();
        expect(b.whatever('0')).eql('0abBcdD');
        var a = new ClassA();
        expect(a.whatever('1')).eql('1abB');
    });
    it('Three level inheritance each with plugin', function () {
        var ClassA = Classes.createClass({
            whatever: function (a) {
                return a + 'a';
            }
        }).mergePrototypes({
            whatever: function (b) {
                return this.$orig(b) + 'b';
            }
        }, true);
        var ClassB = ClassA.subClass({
            whatever: function (c) {
                return this.$superProp('whatever', c) + 'c';
            }
        }).mergePrototypes({
            whatever: function (d) {
                return this.$orig(d) + 'd';
            }
        }, true);

        var b = new ClassB();
        expect(b.whatever('0')).eql('0abcd');
        var a = new ClassA();
        expect(a.whatever('1')).eql('1ab');
    });
    it('Three level inheritance each with two plugins each', function () {
        var ClassA = Classes.createClass({
            whatever: function (a) {
                return a + 'a';
            }
        }).mergePrototypes({
            whatever: function (b) {
                return this.$orig(b) + 'b';
            }
        }, true).mergePrototypes({
            whatever: function (b) {
                return this.$orig(b) + 'B';
            }
        }, true);
        var ClassB = ClassA.subClass({
            whatever: function (c) {
                return this.$superProp('whatever', c) + 'c';
            }
        }).mergePrototypes({
            whatever: function (d) {
                return this.$orig(d) + 'd';
            }
        }, true).mergePrototypes({
            whatever: function (d) {
                return this.$orig(d) + 'D';
            }
        }, true);

        var b = new ClassB();
        expect(b.whatever('0')).eql('0abBcdD');
        var a = new ClassA();
        expect(a.whatever('1')).eql('1abB');
    });
    it('orig present even if no original', function (){
        var ClassA = Classes.createClass({
        }).mergePrototypes({
            whatever: function (b) {
                return this.$orig(b) + 'b';
            }
        }, true);
        var a = new ClassA();
        expect(a.whatever('1')).eql('undefinedb');
    });
    it('orig present even if no original two levels deep', function (){
        var ClassA = Classes.createClass({
        }).mergePrototypes({
            whatever: function (b) {
                return this.$orig(b) + 'b';
            }
        }, true).mergePrototypes({
            whatever: function (b) {
                return this.$orig(b) + 'B';
            }
        }, true);
        var a = new ClassA();
        expect(a.whatever('1')).eql('undefinedbB');
    });

    it('orig present even if no original two levels deep, multiple methods', function (){
        var ClassA = Classes.createClass({
        }).mergePrototypes({
            dummy1: function() {
                return 'dummy1 returnvalue';
            },
            whatever: function (b) {
                return this.$orig(b) + 'b';
            },
            dummy2: function() {
                return 'dummy2 returnvalue';
            }
        }, true).mergePrototypes({
            dummy3: function() {
                return 'dummy3 returnvalue';
            },
            dummy4: function() {
                return 'dummy4 returnvalue';
            },
            whatever: function (b) {
                return this.$orig(b) + 'B';
            },
            dummy5: function() {
                return 'dummy5 returnvalue';
            },
            dummy6: function() {
                return 'dummy6 returnvalue';
            }
        }, true);
        var a = new ClassA();
        expect(a.whatever('1')).eql('undefinedbB');
    });

    it('orig present even if no original three levels deep, multiple methods', function (){
        var ClassA = Classes.createClass({
        }).mergePrototypes({
            dummy1: function() {
                return 'dummy1 returnvalue';
            },
            whatever: function (b) {
                return this.$orig(b) + 'b';
            },
            dummy2: function() {
                return 'dummy2 returnvalue';
            }
        }, true).mergePrototypes({
            dummy3: function() {
                return 'dummy3 returnvalue';
            },
            dummy4: function() {
                return 'dummy4 returnvalue';
            },
            whatever: function (b) {
                return this.$orig(b) + 'B';
            },
            dummy5: function() {
                return 'dummy5 returnvalue';
            },
            dummy6: function() {
                return 'dummy6 returnvalue';
            }
        }, true);
        var a = new ClassA();
        expect(a.whatever('1')).eql('undefinedbB');
    });

    it('mergePrototypes with $orig without argument', function() {
        var A = Classes.createClass(
            function(x) {
                this.x = x;
            },
            {
                printValues: function() {
                    return this.x;
                }
            }
        );

        var a = new A('a');

        A.mergePrototypes({
            printValues: function() {
                return 'new '+this.$orig();
            }
        }, true);

        expect(a.printValues('b')).to.be.equal('new a');
    });

    it('mergePrototypes with $orig with argument', function() {
        var A = Classes.createClass(
            function(x) {
                this.x = x;
            },
            {
                printValues: function(v) {
                    return this.x+v;
                }
            }
        );

        var a = new A('a');

        A.mergePrototypes({
            printValues: function(v) {
                return 'new '+this.$orig(v);
            }
        }, true);

        expect(a.printValues('b')).to.be.equal('new ab');
    });

});

describe('Chained Constructors', function () {

    it('chaining by default', function () {
        var ClassA = Classes.createClass(function(x) {
            this.x = x;
        });
        var ClassB = ClassA.subClass(function(x, y) {
            this.y = y;
        });
        var ClassC = ClassB.subClass(function(x, y, z) {
            this.z = z;
        });
        var c = new ClassC(1, 2, 3);
        expect(c.x).to.be.equal(1);
        expect(c.y).to.be.equal(2);
        expect(c.z).to.be.equal(3);
    });

    it('forced chaining level 3', function () {
        var ClassA = Classes.createClass(function(x) {
            this.x = x;
        });
        var ClassB = ClassA.subClass(function(x, y) {
            this.y = y;
        }, true);
        var ClassC = ClassB.subClass(function(x, y, z) {
            this.z = z;
        });
        var c = new ClassC(1, 2, 3);
        expect(c.x).to.be.equal(1);
        expect(c.y).to.be.equal(2);
        expect(c.z).to.be.equal(3);
    });

    it('forced chaining level 2+3 ', function () {
        var ClassA = Classes.createClass(function(x) {
            this.x = x;
        });
        var ClassB = ClassA.subClass(function(x, y) {
            this.y = y;
        });
        var ClassC = ClassB.subClass(function(x, y, z) {
            this.z = z;
        }, true);
        var c = new ClassC(1, 2, 3);
        expect(c.x).to.be.equal(1);
        expect(c.y).to.be.equal(2);
        expect(c.z).to.be.equal(3);
    });

    it('forced chaining 3 levels', function () {
        var ClassA = Classes.createClass(function(x) {
            this.x = x;
        });
        var ClassB = ClassA.subClass(function(x, y) {
            this.y = y;
        }, true);
        var ClassC = ClassB.subClass(function(x, y, z) {
            this.z = z;
        }, true);
        var c = new ClassC(1, 2, 3);
        expect(c.x).to.be.equal(1);
        expect(c.y).to.be.equal(2);
        expect(c.z).to.be.equal(3);
    });

    it('forced no chaining level 3', function () {
        var ClassA = Classes.createClass(function(x) {
            this.x = x;
        });
        var ClassB = ClassA.subClass(function(x, y) {
            this.y = y;
        }, false);
        var ClassC = ClassB.subClass(function(x, y, z) {
            this.z = z;
        });
        var c = new ClassC(1, 2, 3);
        expect(c.x===undefined).to.be.true;
        expect(c.y).to.be.equal(2);
        expect(c.z).to.be.equal(3);
    });

    it('forced no chaining level 2+3 ', function () {
        var ClassA = Classes.createClass(function(x) {
            this.x = x;
        });
        var ClassB = ClassA.subClass(function(x, y) {
            this.y = y;
        });
        var ClassC = ClassB.subClass(function(x, y, z) {
            this.z = z;
        }, false);
        var c = new ClassC(1, 2, 3);
        expect(c.x===undefined).to.be.true;
        expect(c.y===undefined).to.be.true;
        expect(c.z).to.be.equal(3);
    });

    it('forced no chaining 3 levels', function () {
        var ClassA = Classes.createClass(function(x) {
            this.x = x;
        });
        var ClassB = ClassA.subClass(function(x, y) {
            this.y = y;
        }, false);
        var ClassC = ClassB.subClass(function(x, y, z) {
            this.z = z;
        }, false);
        var c = new ClassC(1, 2, 3);
        expect(c.x===undefined).to.be.true;
        expect(c.y===undefined).to.be.true;
        expect(c.z).to.be.equal(3);
    });

});

describe('Destruction', function () {

    it('calling Destroy', function () {
        var ClassA = Classes.createClass(function() {
            this.x = 10;
        }, {
            destroy: function() {
                expect(this.x).to.be.equal(10);
                this.x = 1;
            }
        });
        var a = new ClassA();
        expect(a.x).to.be.equal(10);
        a.destroy();
        expect(a.x).to.be.equal(1);
    });

    it('calling Destroy 2 level', function (){
        var ClassA = Classes.createClass({
            destroy: function() {
                expect(this.x).to.be.equal(5);
                this.x = 1;
            }
        });
        var ClassB = ClassA.subClass(function() {
            this.x = 10;
        }, {
            destroy: function() {
                expect(this.x).to.be.equal(10);
                this.x = 5;
            }
        });
        var b = new ClassB();
        expect(b.x).to.be.equal(10);
        b.destroy();
        expect(b.x).to.be.equal(1);
    });

    it('calling Destroy 3 level', function (){
        var ClassA = Classes.createClass({
            destroy: function() {
                expect(this.x).to.be.equal(2);
                this.x = 1;
            }
        });
        var ClassB = ClassA.subClass({
            destroy: function() {
                expect(this.x).to.be.equal(5);
                this.x = 2;
            }
        });
        var ClassC = ClassB.subClass(function() {
            this.x = 10;
        }, {
            destroy: function() {
                expect(this.x).to.be.equal(10);
                this.x = 5;
            }
        });
        var c = new ClassC();
        expect(c.x).to.be.equal(10);
        c.destroy();
        expect(c.x).to.be.equal(1);
    });

    it('calling Destroy 3 level and force notChained', function (){
        var ClassA = Classes.createClass({
            destroy: function() {
                expect(this.x).to.be.equal(2);
                this.x = 1;
            }
        });
        var ClassB = ClassA.subClass({
            destroy: function() {
                expect(this.x).to.be.equal(5);
                this.x = 2;
            }
        });
        var ClassC = ClassB.subClass(function() {
            this.x = 10;
        }, {
            destroy: function() {
                expect(this.x).to.be.equal(10);
                this.x = 5;
            }
        });
        var c = new ClassC();
        expect(c.x).to.be.equal(10);
        c.destroy(true);
        expect(c.x).to.be.equal(5);
    });

});


describe('test $superProp', function () {

    it('Properties should be accessable', function () {
        var C1 = Classes.createClass({
            f: function() {
                return 'F1';
            },
            h: function() {
                return 'H1';
            },
            a: 1
        });
        var C2 = C1.subClass({
            f: function() {
                return 'F2';
            },
            h: function() {
                return 'H2';
            },
            getF: function() {
                return this.$superProp('f');
            },
            a: 2
        });
        var C3 = C2.subClass({
            f: function() {
                return 'F3';
            },
            h: function() {
                return 'H3';
            },
            a: 3
        });
        var C4 = C3.subClass({
            f: function() {
                return 'F4';
            },
            h: function() {
                return 'H4';
            },
            a: 4
        });
        var c1 = new C1();
        var c2 = new C2();
        var c3 = new C3();
        var c4 = new C4();
        expect(c1.getF===undefined, 'c1 error').to.be.true;
        expect(c2.getF(), 'c2-error').to.be.equal('F1');
        expect(c3.getF(), 'c3-error').to.be.equal('F1');
        expect(c4.getF(), 'c4-error').to.be.equal('F1');
    });

    it('loop', function () {
        var C1 = Classes.createClass({
            f: function() {
                return this.h();
            },
            h: function() {
                return 'H1';
            },
            a: 1
        });
        var C2 = C1.subClass({
            f: function() {
                return 'F2';
            },
            h: function() {
                return 'H2';
            },
            getF: function() {
                return this.$superProp('f');
            },
            a: 2
        });
        var C3 = C2.subClass({
            f: function() {
                return 'F3';
            },
            h: function() {
                return 'H3';
            },
            a: 3
        });
        var C4 = C3.subClass({
            f: function() {
                return 'F4';
            },
            h: function() {
                return 'H4';
            },
            a: 4
        });
        var c1 = new C1();
        var c2 = new C2();
        var c3 = new C3();
        var c4 = new C4();
        expect(c1.getF===undefined, 'c1 error').to.be.true;
        expect(c2.getF(), 'c2-error').to.be.equal('H2');
        expect(c3.getF(), 'c3-error').to.be.equal('H3');
        expect(c4.getF(), 'c4-error').to.be.equal('H4');
    });

    it('loop double', function () {
        var C1 = Classes.createClass({
            f: function() {
                return this.g();
            },
            g: function() {
                return 'G1';
            },
            a: 1
        });
        var C2 = C1.subClass({
            f: function() {
                return 'F2';
            },
            getF: function() {
                return this.$superProp('f');
            },
            g: function() {
                return 'G2';
            },
            a: 2
        });
        var C3 = C2.subClass({
            f: function() {
                return 'F3';
            },
            g: function() {
                return 'G3';
            },
            h: function() {
                return 'H3-final';
            },
            a: 3
        });
        var C4 = C3.subClass({
            f: function() {
                return 'F4';
            },
            getF: function() {
                return this.$superProp('f');
            },
            g: function() {
                return this.$superProp('h');
            },
            a: 4
        });
        var C5 = C4.subClass();
        var c1 = new C1();
        var c2 = new C2();
        var c3 = new C3();
        var c4 = new C4();
        var c5 = new C5();
        expect(c1.getF===undefined, 'c1 error').to.be.true;
        expect(c2.getF(), 'c2 error').to.be.equal('G2');
        expect(c3.getF(), 'c3 error').to.be.equal('G3');
        expect(c4.getF(), 'c4 error').to.be.equal('F3');
        expect(c5.getF(), 'c5 error').to.be.equal('F3');
    });

    it('loop with multiple check reset', function () {
        var C1 = Classes.createClass({
            f: function() {
                return this.g();
            },
            g: function() {
                return 'G1';
            },
            h: function() {
                return this.i();
            },
            i: function() {
                return 'I1';
            },
            j: function() {
                return 'J1';
            },
            a: 1
        });
        var C2 = C1.subClass({
            f: function() {
                return 'F2';
            },
            getF: function() {
                // invoke $super twice to detect reset
                return this.$superProp('f')+this.$superProp('h')+this.$superProp('f');
            },
            g: function() {
                return 'G2';
            },
            i: function() {
                return 'I2';
            },
            j: function() {
                return 'J2';
            },
            a: 2
        });
        var C3 = C2.subClass({
            f: function() {
                return 'F3';
            },
            g: function() {
                return 'G3';
            },
            i: function() {
                return 'I3';
            },
            j: function() {
                return 'J3';
            },
            a: 3
        });
        var C4 = C3.subClass({
            f: function() {
                return 'F4';
            },
            getF: function() {
                return this.$superProp('f')+this.$superProp('h')+this.$superProp('f');
            },
            g: function() {
                return this.$superProp('h')+this.$superProp('h');
            },
            h: function() {
                return 'H3';
            },
            i: function() {
                return this.$super.$superProp('j');
            },
            j: function() {
                return 'J4';
            },
            a: 4
        });
        var C5 = C4.subClass();
        var c1 = new C1();
        var c2 = new C2();
        var c3 = new C3();
        var c4 = new C4();
        var c5 = new C5();
        expect(c1.getF===undefined, 'c1 error').to.be.true;
        expect(c2.getF(), 'c2 error').to.be.equal('G2I2G2');
        expect(c3.getF(), 'c3 error').to.be.equal('G3I3G3');
        expect(c4.getF(), 'c4 error').to.be.equal('F3J2F3');
        expect(c5.getF(), 'c5 error').to.be.equal('F3J2F3');
    });

    it('Properties should be accessable', function () {
        var C1 = Classes.createClass(function() {

            expect(this.m).to.be.equal(40);
            expect(this.$superProp('m')===undefined).to.be.true;

            // and once more: to make sure the context resets:
            expect(this.m).to.be.equal(40);
            expect(this.$superProp('m')===undefined).to.be.true;

            expect(this.f()).to.be.equal('F4');
            expect(this.$superProp('f')===undefined).to.be.true;

            // and once more: to make sure the context resets:
            expect(this.f()).to.be.equal('F4');
            expect(this.$superProp('f')===undefined).to.be.true;

            expect(this.g()).to.be.equal('G3');
            expect(this.$superProp('g')===undefined).to.be.true;

        }, {
            m: 10,
            f: function() {
                return 'F1';
            },
            g: function() {
                return 'G1';
            }
        });
        var C2 = C1.subClass(function() {
            expect(this.m).to.be.equal(40);
            expect(this.$superProp('m')).to.be.equal(10);
            expect(this.$super.$superProp('m')===undefined).to.be.true;

            expect(this.f()).to.be.equal('F4');
            expect(this.$superProp('f')).to.be.equal('F1');
            expect(this.$super.$superProp('f')===undefined).to.be.true;

            expect(this.g()).to.be.equal('G3');
            expect(this.$superProp('g')).to.be.equal('G1');
            expect(this.$super.$superProp('g')===undefined).to.be.true;
        }, {
            m: 20,
            f: function() {
                return 'F2';
            }
        });
        var C3 = C2.subClass(function() {
            expect(this.m).to.be.equal(40);
            expect(this.$superProp('m')).to.be.equal(20);
            expect(this.$super.$superProp('m')).to.be.equal(10);
            expect(this.$super.$super.$superProp('m')===undefined).to.be.true;

            expect(this.f()).to.be.equal('F4');
            expect(this.$superProp('f')).to.be.equal('F2');
            expect(this.$super.$superProp('f')).to.be.equal('F1');
            expect(this.$super.$super.$superProp('f')===undefined).to.be.true;

            expect(this.g()).to.be.equal('G3');
            expect(this.$superProp('g')).to.be.equal('G1');
            expect(this.$super.$superProp('g')).to.be.equal('G1');
            expect(this.$super.$super.$superProp('g')===undefined).to.be.true;
        }, {
            m: 30,
            f: function() {
                return 'F3';
            },
            g: function() {
                return 'G3';
            }
        });
        var C4 = C3.subClass(function() {
            expect(this.m).to.be.equal(40);
            expect(this.$superProp('m')).to.be.equal(30);
            expect(this.$super.$superProp('m')).to.be.equal(20);
            expect(this.$super.$super.$superProp('m')).to.be.equal(10);
            expect(this.$super.$super.$super.$superProp('m')===undefined).to.be.true;

            expect(this.f()).to.be.equal('F4');
            expect(this.$superProp('f')).to.be.equal('F3');
            expect(this.$super.$superProp('f')).to.be.equal('F2');
            expect(this.$super.$super.$superProp('f')).to.be.equal('F1');
            expect(this.$super.$super.$super.$superProp('f')===undefined).to.be.true;

            expect(this.g()).to.be.equal('G3');
            expect(this.$superProp('g')).to.be.equal('G3');
            expect(this.$super.$superProp('g')).to.be.equal('G1');
            expect(this.$super.$super.$superProp('g')).to.be.equal('G1');
            expect(this.$super.$super.$super.$superProp('g')===undefined).to.be.true;
        }, {
            m: 40,
            f: function() {
                return 'F4';
            }
        });
        var c4 = new C4();

    });

    it('Properties should modified well', function () {
        var C1 = Classes.createClass(function(x) {
            this.x = x;
        }, {
            f: function() {
                this.x = 10;
            }
        });
        var C2 = C1.subClass({
            f: function() {
                this.x = 20;
            }
        });
        var C3 = C2.subClass();
        var C4 = C3.subClass({
            f: function() {
                this.x = 40;
            }
        });
        var c4 = new C4(1);
        expect(c4.x).to.be.equal(1);
        c4.f();
        expect(c4.x).to.be.equal(40);
        c4.$superProp('f');
        expect(c4.x).to.be.equal(20);
        c4.$super.$superProp('f');
        expect(c4.x).to.be.equal(20);
        c4.$super.$super.$superProp('f');
        expect(c4.x).to.be.equal(10);
    });
});


describe('test $super', function () {

    it('Properties should be accessable', function () {
        var C0 = Classes.createClass({
            f: function() {
                return 'F0';
            },
            h: function() {
                return 'H0';
            },
            a: 0
        });
        var C1 = C0.subClass({
            f: function() {
                return 'F1';
            },
            h: function() {
                return 'H1';
            },
            a: 1
        });
        var C2 = C1.subClass({
            f: function() {
                return 'F2';
            },
            h: function() {
                return 'H2';
            },
            getF: function() {
                return this.$super.$superProp('f');
            },
            a: 2
        });
        var C3 = C2.subClass({
            f: function() {
                return 'F3';
            },
            h: function() {
                return 'H3';
            },
            a: 3
        });
        var C4 = C3.subClass({
            f: function() {
                return 'F4';
            },
            h: function() {
                return 'H4';
            },
            a: 4
        });
        var c0 = new C0();
        var c1 = new C1();
        var c2 = new C2();
        var c3 = new C3();
        var c4 = new C4();
        expect(c0.getF===undefined, 'c0 error').to.be.true;
        expect(c1.getF===undefined, 'c1 error').to.be.true;
        expect(c2.getF(), 'c2-error').to.be.equal('F0');
        expect(c3.getF(), 'c3-error').to.be.equal('F0');
        expect(c4.getF(), 'c4-error').to.be.equal('F0');
    });

    it('loop', function () {
        var C0 = Classes.createClass({
            f: function() {
                return this.h();
            },
            h: function() {
                return 'H0';
            },
            a: 0
        });
        var C1 = C0.subClass({
            f: function() {
                return 'F1';
            },
            h: function() {
                return 'H1';
            },
            a: 1
        });
        var C2 = C1.subClass({
            f: function() {
                return 'F2';
            },
            h: function() {
                return 'H2';
            },
            getF: function() {
                return this.$super.$superProp('f');
            },
            a: 2
        });
        var C3 = C2.subClass({
            f: function() {
                return 'F3';
            },
            h: function() {
                return 'H3';
            },
            a: 3
        });
        var C4 = C3.subClass({
            f: function() {
                return 'F4';
            },
            h: function() {
                return 'H4';
            },
            a: 4
        });
        var c0 = new C0();
        var c1 = new C1();
        var c2 = new C2();
        var c3 = new C3();
        var c4 = new C4();
        expect(c0.getF===undefined, 'c0 error').to.be.true;
        expect(c1.getF===undefined, 'c1 error').to.be.true;
        expect(c2.getF(), 'c2-error').to.be.equal('H2');
        expect(c3.getF(), 'c3-error').to.be.equal('H3');
        expect(c4.getF(), 'c4-error').to.be.equal('H4');
    });

    it('loop double', function () {
        var C0 = Classes.createClass({
            f: function() {
                return this.g();
            },
            g: function() {
                return 'G0';
            },
            a: 0
        });
        var C1 = C0.subClass({
            f: function() {
                return 'F0';
            },
            g: function() {
                return 'G1';
            },
            a: 1
        });
        var C2 = C1.subClass({
            f: function() {
                return 'F2';
            },
            getF: function() {
                return this.$super.$superProp('f');
            },
            g: function() {
                return 'G2';
            },
            a: 2
        });
        var C3 = C2.subClass({
            f: function() {
                return 'F3';
            },
            g: function() {
                return 'G3';
            },
            h: function() {
                return 'H3-final';
            },
            a: 3
        });
        var C4 = C3.subClass({
            f: function() {
                return 'F4';
            },
            getF: function() {
                return this.$super.$superProp('f');
            },
            g: function() {
                return this.$super.$superProp('h');
            },
            a: 4
        });
        var C5 = C4.subClass();
        var c0 = new C0();
        var c1 = new C1();
        var c2 = new C2();
        var c3 = new C3();
        var c4 = new C4();
        var c5 = new C5();
        expect(c0.getF===undefined, 'c0 error').to.be.true;
        expect(c1.getF===undefined, 'c1 error').to.be.true;
        expect(c2.getF(), 'c2 error').to.be.equal('G2');
        expect(c3.getF(), 'c3 error').to.be.equal('G3');
        expect(c4.getF(), 'c4 error').to.be.equal('F2');
        expect(c5.getF(), 'c5 error').to.be.equal('F2');
    });

    it('loop with multiple check reset', function () {
        var C0 = Classes.createClass({
            f: function() {
                return this.g();
            },
            g: function() {
                return 'G0';
            },
            h: function() {
                return this.i();
            },
            i: function() {
                return 'I0';
            },
            j: function() {
                return 'J0';
            },
            a: 0
        });
        var C1 = C0.subClass({
            f: function() {
                return 'F1';
            },
            g: function() {
                return 'G1';
            },
            h: function() {
                return 'H1';
            },
            i: function() {
                return 'I1';
            },
            j: function() {
                return 'J1';
            },
            a: 1
        });
        var C2 = C1.subClass({
            f: function() {
                return 'F2';
            },
            getF: function() {
                // invoke $super twice to detect reset
                return this.$super.$superProp('f')+this.$super.$superProp('h')+this.$super.$superProp('f');
            },
            g: function() {
                return 'G2';
            },
            i: function() {
                return 'I2';
            },
            j: function() {
                return 'J2';
            },
            a: 2
        });
        var C3 = C2.subClass({
            f: function() {
                return 'F3';
            },
            g: function() {
                return 'G3';
            },
            i: function() {
                return 'I3';
            },
            j: function() {
                return 'J3';
            },
            a: 3
        });
        var C4 = C3.subClass({
            f: function() {
                return 'F4';
            },
            getF: function() {
                return this.$super.$superProp('f')+this.$super.$superProp('h')+this.$super.$superProp('f');
            },
            g: function() {
                return this.$super.$superProp('h')+this.$super.$superProp('h');
            },
            h: function() {
                return 'H3';
            },
            i: function() {
                return this.$super.$super.$superProp('j');
            },
            j: function() {
                return 'J4';
            },
            a: 4
        });
        var C5 = C4.subClass();
        var c0 = new C0();
        var c1 = new C1();
        var c2 = new C2();
        var c3 = new C3();
        var c4 = new C4();
        var c5 = new C5();
        expect(c0.getF===undefined, 'c0 error').to.be.true;
        expect(c1.getF===undefined, 'c1 error').to.be.true;
        expect(c2.getF(), 'c2 error').to.be.equal('G2I2G2');
        expect(c3.getF(), 'c3 error').to.be.equal('G3I3G3');
        expect(c4.getF(), 'c4 error').to.be.equal('F2H1F2');
        expect(c5.getF(), 'c5 error').to.be.equal('F2H1F2');
    });

});

describe('remove prototypes', function () {

    it('Same level', function () {
        var C0 = Classes.createClass({
            f: function() {
                return 'F0';
            },
            g: function() {
                return 'G0';
            }
        });
        var c0 = new C0();
        expect(c0.f===undefined).to.be.false;
        expect(c0.g===undefined).to.be.false;
        C0.removePrototypes('f');
        expect(c0.f===undefined).to.be.true;
        expect(c0.g===undefined).to.be.false;
    });

    it('Multiple levels', function () {
        var C0 = Classes.createClass({
            f: function() {
                return 'F0';
            },
            g: function() {
                return 'G0';
            }
        });
        var C1 = C0.subClass({
            f: function() {
                return 'F1';
            },
            g: function() {
                return 'G1';
            }
        });
        var c1 = new C1();
        expect(c1.f===undefined).to.be.false;
        expect(c1.g===undefined).to.be.false;
        C1.removePrototypes('f');
        expect(c1.f===undefined).to.be.false;
        expect(c1.g===undefined).to.be.false;
        C0.removePrototypes('f');
        expect(c1.f===undefined).to.be.true;
        expect(c1.g===undefined).to.be.false;
    });

    it('Same level - array properties', function () {
        var C0 = Classes.createClass({
            e: function() {
                return 'E0';
            },
            f: function() {
                return 'F0';
            },
            g: function() {
                return 'G0';
            }
        });
        var c0 = new C0();
        expect(c0.e===undefined).to.be.false;
        expect(c0.f===undefined).to.be.false;
        expect(c0.g===undefined).to.be.false;
        C0.removePrototypes(['e', 'f']);
        expect(c0.e===undefined).to.be.true;
        expect(c0.f===undefined).to.be.true;
        expect(c0.g===undefined).to.be.false;
    });

    it('Multiple levels - array properties', function () {
        var C0 = Classes.createClass({
            e: function() {
                return 'E0';
            },
            f: function() {
                return 'F0';
            },
            g: function() {
                return 'G0';
            }
        });
        var C1 = C0.subClass({
            e: function() {
                return 'E0';
            },
            f: function() {
                return 'F1';
            },
            g: function() {
                return 'G1';
            }
        });
        var c1 = new C1();
        expect(c1.e===undefined).to.be.false;
        expect(c1.f===undefined).to.be.false;
        expect(c1.g===undefined).to.be.false;
        C1.removePrototypes(['e', 'f']);
        expect(c1.e===undefined).to.be.false;
        expect(c1.f===undefined).to.be.false;
        expect(c1.g===undefined).to.be.false;
        C0.removePrototypes(['e', 'f']);
        expect(c1.e===undefined).to.be.true;
        expect(c1.f===undefined).to.be.true;
        expect(c1.g===undefined).to.be.false;
    });

});

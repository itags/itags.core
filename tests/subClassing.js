/*global describe, it, before, after */
/*jshint unused:false */
(function (window) {

    "use strict";

    var expect = require('chai').expect,
        DOCUMENT = window.document,
        itagCore = require("../itags.core")(window);

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

    describe('With __proto__', function() {
        var IShape = DOCUMENT.createItag('i-shape', {
                init: function () {
                    // should only be set the firts time
                    // otherwise there is a bug: init shouldn't run twice
                    if (this.x) {
                        this.x = 'double init called';
                        this.y = 'double init called';
                    }
                    else {
                        this.x = 10;
                        this.y = 20;
                    }
                },
                move: function (x, y) {
                    this.x += x;
                    this.y += y;
                },
                setBG: function () {
                    this.bg = '#111';
                },
                destroy: function() {
console.info('destroying shape');
                    // should only be runned once at removal node from the dom
                    // otherwise there is a bug: destroy shouldn't run twice
                    if (this.x===-1) {
                        this.x = -91;
                        this.y = -92;
                    }
                    else {
                        this.x = -1;
                        this.y = -2;
                    }
                }
            }),
            ICircle = IShape.subItag('i-circle', {
                init: function () {
                    // should only be set the firts time
                    // otherwise there is a bug: init shouldn't run twice
                    if (this.x) {
                        this.x = 'double init called';
                        this.r = 'double init called';
                    }
                    else {
                        this.x = 100;
                        this.r = 5;
                    }
                },
                area: function () {
                    return this.r * this.r * Math.PI;
                },
                setBG: function () {
                    this.bg = '#222';
                },
                destroy: function() {
console.info('destroying circle');
                    // should only be runned once at removal node from the dom
                    // otherwise there is a bug: destroy shouldn't run twice
                    if (this.x===-11) {
                        this.x = -911;
                        this.y = -912;
                        this.r = -913;
                    }
                    else {
                        this.x = -11;
                        this.y = -12;
                        this.r = -13;
                    }
                }
            });

        describe('i-shape', function () {
            var s = new IShape();
            DOCUMENT.body.append(s);
            s.initUI(); // should end into NOOP
            s.$super.initUI(); // should end into NOOP
            it('Should be an instance of Shape and HTMLElement', function () {
                expect(s).be.an.instanceof(window.HTMLElement);
            });
            it('Should be located at 10,10', function () {
                expect(s.x).be.equal(10);
                expect(s.y).be.equal(20);
            });
            it('Method of instance', function () {
                s.move(1, 2);
                expect(s.x).be.equal(11);
                expect(s.y).be.equal(22);
            });
            it('Destroy cannot be called manually', function () {
                s.destroyUI();
                expect(s.x).be.equal(11);
                expect(s.y).be.equal(22);
            });
            it('Destroy', function (done) {
                s.remove();
                setTimeout(function() {
console.info('after timeout');
                    expect(s.x).be.equal(-1);
                    expect(s.y).be.equal(-2);
                    // s.destroyUI(); // should end into NOOP
                    // expect(s.x).be.equal(-1);
                    // expect(s.y).be.equal(-2);
                    done();
                }, 1500);
            });
        });
        describe('i-circle', function () {
            var c = new ICircle();
            DOCUMENT.body.append(c);
            c.initUI(); // should end into NOOP
            c.$super.initUI(); // should end into NOOP
            it('should be instance of Shape, Circle and HTMLElement', function () {
                expect(c).be.an.instanceof(window.HTMLElement);
            });
            it('Should be located at 100,20 with radious 5', function () {
                expect(c.x).be.equal(100);
                expect(c.y).be.equal(20);
                expect(c.r).be.equal(5);
            });
            it('Method of the parent class', function () {
                c.move(1, 2);
                expect(c.x).be.equal(101);
                expect(c.y).be.equal(22);
                expect(c.r).be.equal(5);
            });
            it('method of the new class', function () {
                expect(c.area()).be.closeTo(78.540, 0.001);
            });
            it('method of the new class', function () {
                c.setBG();
                expect(c.bg).be.equal('#222');
            });
            it('overridden method at parentclass', function () {
                ICircle.$super.setBG.apply(c);
                expect(c.bg).be.equal('#111');
            });
            it('Destroy cannot be called manually', function () {
                c.destroyUI(); // should end into NOOP
                c.$super.destroyUI(); // should end into NOOP
                expect(c.x).be.equal(101);
                expect(c.y).be.equal(22);
            });
            it('Destroy', function () {
                c.remove();
                expect(c.x).be.equal(-1);
                expect(c.y).be.equal(-2);
                expect(c.z).be.equal(-13);
                c.destroyUI(); // should end into NOOP
                c.$super.destroyUI(c); // should end into NOOP
                expect(c.x).be.equal(-1);
                expect(c.y).be.equal(-2);
                expect(c.z).be.equal(-13);
            });
        });

        describe('Check inteference subItages', function () {
            var A = DOCUMENT.createItag('i-a', {
                    init: function() {
                        this.a = 3;
                    },
                    add: function (b) {
                        this.a += b;
                    }
                }),
                B = A.subItag('i-b', {
                    init: function() {
                        this.b = 13;
                    },
                    add: function (c) {
                        B.$super.add.apply(this, c * 2);
                    }
                }),
                C = B.subItag('i-c', {
                    init: function() {
                        this.c = 113;
                    },
                    add: function (d) {
                        C.$super.add.apply(this, d * 3);
                    }
                });
            it ('one level', function () {
                var a = new A();
                expect(a.a).eql(3);
                a.add(2);
                expect(a.a).eql(5);
            });
            it ('two levels', function () {
                var b = new B();
                expect(b.a).eql(3);
                expect(b.b).eql(13);
                b.add(2);
                expect(b.a).eql(7);
                expect(b.b).eql(13);

                // Later classes should not interfer with the previous
                var a = new A();
                expect(a.a).eql(3);
                expect(a.b===undefined).to.be.true;
                a.add(2);
                expect(a.a).eql(5);
                expect(b.a).eql(7);
            });
            it ('three levels', function () {
                var c = new C();
                expect(c.a).eql(3);
                expect(c.b).eql(13);
                expect(c.c).eql(113);
                c.add(2);
                expect(c.a).eql(15);

                // Later classes should not interfer with the previous
                var b = new B();
                expect(b.a).eql(3);
                expect(b.b).eql(13);
                expect(b.c===undefined).to.be.true;
                b.add(2);
                expect(b.a).eql(7);
                expect(c.a).eql(15);

                // Later classes should not interfer with the previous
                var a = new A();
                expect(a.a).eql(3);
                expect(a.b===undefined).to.be.true;
                expect(a.c===undefined).to.be.true;
                a.add(2);
                expect(a.a).eql(5);
                expect(b.a).eql(7);
                expect(c.a).eql(15);
            });
        });
/*
        describe('mergePrototypes', function () {
            var obj = {a:1, b:2, c:3};
            it('new empty class', function () {
                var ItagD = DOCUMENT.createItag('i-d'),
                    d = new ItagD();
                ItagD.mergePrototypes(obj);
                expect(d.b).be.eql(2);
                expect(d.hasOwnProperty('b')).be.false;
            });
            it('existing class',  function () {
                var ItagE = DOCUMENT.createItag('i-e', {b: 42}),
                    e = new ItagE();
                ItagE.mergePrototypes(obj);
                expect(e.b).be.eql(42);
                expect(e.hasOwnProperty('b')).be.false;
            });
            it ('existing class, overwriting', function () {
                var ItagF = DOCUMENT.createItag('i-f', {
                    b: 'a',
                    whatever: function (v) {
                        expect(1, 'should never reach this one').eql(0);
                    }
                }).mergePrototypes({
                    whatever: function(v) {
                        expect(this.b).eql('a');
                        expect(v).eql('b');
                        return this.b + v + 'c';
                    }
                },true);
                var f = new ItagF();
                expect(f.b).be.eql('a');
                expect(f.whatever('b')).eql('abc');
            });
        });

        describe('$orig', function () {
            it('existing class, override',  function () {
                var ItagG = DOCUMENT.createItag('i-g', {
                    b: 'a',
                    whatever: function (v) {
                        expect(this.b).eql('a');
                        expect(v).eql('ec');
                        return this.b + v;
                    }
                }).mergePrototypes({
                    whatever: function(v) {
                        return ItagG.$orig.whatever.apply(this, v + 'c') + 'd';
                    }
                }, true);
                var g = new ItagG();
                expect(g.b).be.eql('a');
                expect(g.whatever('e')).eql('aecd');
            });
            it('Two level inheritance each with plugin', function () {
                var ItagH = DOCUMENT.createItag('i-h', {
                    whatever: function (a) {
                        return a + 'a';
                    }
                }).mergePrototypes({
                    whatever: function (b) {
                        return ItagH.$orig.whatever.apply(this, b) + 'b';
                    }
                }, true);
                var ItagI = DOCUMENT.createItag('i-i', {
                    whatever: function (c) {
                        return ItagI.$super.whatever.apply(this, c) + 'c';
                    }
                }).mergePrototypes({
                    whatever: function (d) {
                        return ItagI.$orig.whatever.apply(this, d) + 'd';
                    }
                }, true);

                var h = new ItagH();
                expect(h.whatever('0')).eql('0abcd');
                var i = new ItagI();
                expect(i.whatever('1')).eql('1ab');
            });
            it('Two level inheritance each with two plugins each', function () {
                var ItagJ = DOCUMENT.createItag('i-j', {
                    whatever: function (a) {
                        return a + 'a';
                    }
                }).mergePrototypes({
                    whatever: function (b) {
                        return ItagJ.$orig.whatever.apply(this, b) + 'b';
                    }
                }, true).mergePrototypes({
                    whatever: function (b) {
                        return ItagJ.$orig.whatever.apply(this, b) + 'B';
                    }
                }, true);
                var ItagK = DOCUMENT.createItag('i-k', {
                    whatever: function (c) {
                        return ItagK.$super.whatever.apply(this, c) + 'c';
                    }
                }).mergePrototypes({
                    whatever: function (d) {
                        return ItagK.$orig.whatever.apply(this, d) + 'd';
                    }
                }, true).mergePrototypes({
                    whatever: function (d) {
                        return ItagK.$orig.whatever.apply(this, d) + 'D';
                    }
                }, true);

                var j = new ItagJ();
                expect(j.whatever('0')).eql('0abBcdD');
                var k = new ItagK();
                expect(k.whatever('1')).eql('1abB');
            });
            it('orig present even if no original', function (){
                var ItagL = DOCUMENT.createItag('i-l', {
                }).mergePrototypes({
                    whatever: function (b) {
                        return ItagL.$orig.whatever.apply(this, b) + 'b';
                    }
                }, true);
                var l = new ItagL();
                expect(l.whatever('1')).eql('undefinedb');
            });
            it('orig present even if no original two levels deep', function (){
                var ItagM = DOCUMENT.createItag('i-m', {
                }).mergePrototypes({
                    whatever: function (b) {
                        return ItagM.$orig.whatever.apply(this, b) + 'b';
                    }
                }, true).mergePrototypes({
                    whatever: function (b) {
                        return ItagM.$orig.whatever.apply(this, b) + 'B';
                    }
                }, true);
                var m = new ItagM();
                expect(m.whatever('1')).eql('undefinedbB');
            });

            it('orig present even if no original two levels deep, multiple methods', function (){
                var ItagN = DOCUMENT.createItag('i-n', {
                }).mergePrototypes({
                    dummy1: function() {
                        return 'dummy1 returnvalue';
                    },
                    whatever: function (b) {
                        return ItagN.$orig.whatever.apply(this, b) + 'b';
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
                        return ItagN.$orig.whatever.apply(this, b) + 'B';
                    },
                    dummy5: function() {
                        return 'dummy5 returnvalue';
                    },
                    dummy6: function() {
                        return 'dummy6 returnvalue';
                    }
                }, true);
                var n = new ItagN();
                expect(n.whatever('1')).eql('undefinedbB');
            });

            it('orig present even if no original', function (){
                var ItagO = DOCUMENT.createItag('i-o', {
                }).mergePrototypes({
                    whatever: function (b) {
                        return ItagO.$orig.whatever.apply(this, b) + 'b';
                    }
                }, true).mergePrototypes({
                    whatever: function (b) {
                        return ItagO.$orig.whatever.apply(this, b) + 'B';
                    }
                }, true);
                var o = new ItagO();
                expect(o.whatever('1')).eql('undefinedbB');
            });

        });
*/
    });


    describe('Without __proto__', function() {

        before(function() {
            itagCore.setPrototypeChain(false);
        });

        after(function() {
            itagCore.setPrototypeChain(true);
        });

        var IShape = DOCUMENT.createItag('i-xshape', {
                init: function () {
                    // should only be set the firts time
                    // otherwise there is a bug: init shouldn't run twice
                    if (this.x) {
                        this.x = 'double init called';
                        this.y = 'double init called';
                    }
                    else {
                        this.x = 10;
                        this.y = 20;
                    }
                },
                move: function (x, y) {
                    this.x += x;
                    this.y += y;
                },
                setBG: function () {
                    this.bg = '#111';
                },
                destroy: function() {
                    // should only be runned once at removal node from the dom
                    // otherwise there is a bug: destroy shouldn't run twice
                    if (this.x===-1) {
                        this.x = -91;
                        this.y = -92;
                    }
                    else {
                        this.x = -1;
                        this.y = -2;
                    }
                }
            }),
            ICircle = IShape.subItag('i-xcircle', {
                init: function () {
                    // should only be set the firts time
                    // otherwise there is a bug: init shouldn't run twice
                    if (this.x) {
                        this.x = 'double init called';
                        this.r = 'double init called';
                    }
                    else {
                        this.x = 100;
                        this.r = 5;
                    }
                },
                area: function () {
                    return this.r * this.r * Math.PI;
                },
                setBG: function () {
                    this.bg = '#222';
                },
                destroy: function() {
                    // should only be runned once at removal node from the dom
                    // otherwise there is a bug: destroy shouldn't run twice
                    if (this.x===-11) {
                        this.x = -911;
                        this.y = -912;
                        this.r = -913;
                    }
                    else {
                        this.x = -11;
                        this.y = -12;
                        this.r = -13;
                    }
                }
            });

        describe('i-shape', function () {
            var s = new IShape();
            DOCUMENT.body.append(s);
            s.initUI(); // should end into NOOP
            s.$super.initUI(); // should end into NOOP
            it('Should be an instance of Shape and HTMLElement', function () {
                expect(s).be.an.instanceof(window.HTMLElement);
            });
            it('Should be located at 10,10', function () {
                expect(s.x).be.equal(10);
                expect(s.y).be.equal(20);
            });
            it('Method of instance', function () {
                s.move(1, 2);
                expect(s.x).be.equal(11);
                expect(s.y).be.equal(22);
            });
            it('Destroy cannot be called manually', function () {
                s.destroyUI();
                expect(s.x).be.equal(11);
                expect(s.y).be.equal(22);
            });
            it('Destroy', function () {
                s.remove();
                expect(s.x).be.equal(-1);
                expect(s.y).be.equal(-2);
                s.destroyUI(); // should end into NOOP
                expect(s.x).be.equal(-1);
                expect(s.y).be.equal(-2);
            });
        });
        describe('i-circle', function () {
            var c = new ICircle();
            DOCUMENT.body.append(c);
            c.initUI(); // should end into NOOP
            c.$super.initUI(); // should end into NOOP
            it('should be instance of Shape, Circle and HTMLElement', function () {
                expect(c).be.an.instanceof(window.HTMLElement);
            });
            it('Should be located at 100,20 with radious 5', function () {
                expect(c.x).be.equal(100);
                expect(c.y).be.equal(20);
                expect(c.r).be.equal(5);
            });
            it('Method of the parent class', function () {
                c.move(1, 2);
                expect(c.x).be.equal(101);
                expect(c.y).be.equal(22);
                expect(c.r).be.equal(5);
            });
            it('method of the new class', function () {
                expect(c.area()).be.closeTo(78.540, 0.001);
            });
            it('method of the new class', function () {
                c.setBG();
                expect(c.bg).be.equal('#222');
            });
            it('overridden method at parentclass', function () {
                ICircle.$super.setBG.apply(c);
                expect(c.bg).be.equal('#111');
            });
            it('Destroy cannot be called manually', function () {
                c.destroyUI(); // should end into NOOP
                c.$super.destroyUI(); // should end into NOOP
                expect(c.x).be.equal(101);
                expect(c.y).be.equal(22);
            });
            it('Destroy', function () {
                c.remove();
                expect(c.x).be.equal(-1);
                expect(c.y).be.equal(-2);
                expect(c.z).be.equal(-13);
                c.destroyUI(); // should end into NOOP
                c.$super.destroyUI(); // should end into NOOP
                expect(c.x).be.equal(-1);
                expect(c.y).be.equal(-2);
                expect(c.z).be.equal(-13);
            });
        });

        describe('Check inteference subItages', function () {
            var A = DOCUMENT.createItag('i-xa', {
                    init: function() {
                        this.a = 3;
                    },
                    add: function (b) {
                        this.a += b;
                    }
                }),
                B = A.subItag('i-xb', {
                    init: function() {
                        this.b = 13;
                    },
                    add: function (c) {
                        B.$super.add.apply(this, c * 2);
                    }
                }),
                C = B.subItag('i-xc', {
                    init: function() {
                        this.c = 113;
                    },
                    add: function (d) {
                        C.$super.add.apply(this, d * 3);
                    }
                });
            it ('one level', function () {
                var a = new A();
                expect(a.a).eql(3);
                a.add(2);
                expect(a.a).eql(5);
            });
            it ('two levels', function () {
                var b = new B();
                expect(b.a).eql(3);
                expect(b.b).eql(13);
                b.add(2);
                expect(b.a).eql(7);
                expect(b.b).eql(13);

                // Later classes should not interfer with the previous
                var a = new A();
                expect(a.a).eql(3);
                expect(a.b===undefined).to.be.true;
                a.add(2);
                expect(a.a).eql(5);
                expect(b.a).eql(7);
            });
            it ('three levels', function () {
                var c = new C();
                expect(c.a).eql(3);
                expect(c.b).eql(13);
                expect(c.c).eql(113);
                c.add(2);
                expect(c.a).eql(15);

                // Later classes should not interfer with the previous
                var b = new B();
                expect(b.a).eql(3);
                expect(b.b).eql(13);
                expect(b.c===undefined).to.be.true;
                b.add(2);
                expect(b.a).eql(7);
                expect(c.a).eql(15);

                // Later classes should not interfer with the previous
                var a = new A();
                expect(a.a).eql(3);
                expect(a.b===undefined).to.be.true;
                expect(a.c===undefined).to.be.true;
                a.add(2);
                expect(a.a).eql(5);
                expect(b.a).eql(7);
                expect(c.a).eql(15);
            });
        });
/*
        describe('mergePrototypes', function () {
            var obj = {a:1, b:2, c:3};
            it('new empty class', function () {
                var ItagD = DOCUMENT.createItag('i-xd'),
                    d = new ItagD();
                ItagD.mergePrototypes(obj);
                expect(d.b).be.eql(2);
                expect(d.hasOwnProperty('b')).be.false;
            });
            it('existing class',  function () {
                var ItagE = DOCUMENT.createItag('i-xe', {b: 42}),
                    e = new ItagE();
                ItagE.mergePrototypes(obj);
                expect(e.b).be.eql(42);
                expect(e.hasOwnProperty('b')).be.false;
            });
            it ('existing class, overwriting', function () {
                var ItagF = DOCUMENT.createItag('i-xf', {
                    b: 'a',
                    whatever: function (v) {
                        expect(1, 'should never reach this one').eql(0);
                    }
                }).mergePrototypes({
                    whatever: function(v) {
                        expect(this.b).eql('a');
                        expect(v).eql('b');
                        return this.b + v + 'c';
                    }
                },true);
                var f = new ItagF();
                expect(f.b).be.eql('a');
                expect(f.whatever('b')).eql('abc');
            });
        });

        describe('$orig', function () {
            it('existing class, override',  function () {
                var ItagG = DOCUMENT.createItag('i-xg', {
                    b: 'a',
                    whatever: function (v) {
                        expect(this.b).eql('a');
                        expect(v).eql('ec');
                        return this.b + v;
                    }
                }).mergePrototypes({
                    whatever: function(v) {
                        return ItagG.$orig.whatever.apply(this, v + 'c') + 'd';
                    }
                }, true);
                var g = new ItagG();
                expect(g.b).be.eql('a');
                expect(g.whatever('e')).eql('aecd');
            });
            it('Two level inheritance each with plugin', function () {
                var ItagH = DOCUMENT.createItag('i-xh', {
                    whatever: function (a) {
                        return a + 'a';
                    }
                }).mergePrototypes({
                    whatever: function (b) {
                        return ItagH.$orig.whatever.apply(this, b) + 'b';
                    }
                }, true);
                var ItagI = DOCUMENT.createItag('i-xi', {
                    whatever: function (c) {
                        return ItagI.$super.whatever.apply(this, c) + 'c';
                    }
                }).mergePrototypes({
                    whatever: function (d) {
                        return ItagI.$orig.whatever.apply(this, d) + 'd';
                    }
                }, true);

                var h = new ItagH();
                expect(h.whatever('0')).eql('0abcd');
                var i = new ItagI();
                expect(i.whatever('1')).eql('1ab');
            });
            it('Two level inheritance each with two plugins each', function () {
                var ItagJ = DOCUMENT.createItag('i-xj', {
                    whatever: function (a) {
                        return a + 'a';
                    }
                }).mergePrototypes({
                    whatever: function (b) {
                        return ItagJ.$orig.whatever.apply(this, b) + 'b';
                    }
                }, true).mergePrototypes({
                    whatever: function (b) {
                        return ItagJ.$orig.whatever.apply(this, b) + 'B';
                    }
                }, true);
                var ItagK = DOCUMENT.createItag('i-xk', {
                    whatever: function (c) {
                        return ItagK.$super.whatever.apply(this, c) + 'c';
                    }
                }).mergePrototypes({
                    whatever: function (d) {
                        return ItagK.$orig.whatever.apply(this, d) + 'd';
                    }
                }, true).mergePrototypes({
                    whatever: function (d) {
                        return ItagK.$orig.whatever.apply(this, d) + 'D';
                    }
                }, true);

                var j = new ItagJ();
                expect(j.whatever('0')).eql('0abBcdD');
                var k = new ItagK();
                expect(k.whatever('1')).eql('1abB');
            });
            it('orig present even if no original', function (){
                var ItagL = DOCUMENT.createItag('i-xl', {
                }).mergePrototypes({
                    whatever: function (b) {
                        return ItagL.$orig.whatever.apply(this, b) + 'b';
                    }
                }, true);
                var l = new ItagL();
                expect(l.whatever('1')).eql('undefinedb');
            });
            it('orig present even if no original two levels deep', function (){
                var ItagM = DOCUMENT.createItag('i-xm', {
                }).mergePrototypes({
                    whatever: function (b) {
                        return ItagM.$orig.whatever.apply(this, b) + 'b';
                    }
                }, true).mergePrototypes({
                    whatever: function (b) {
                        return ItagM.$orig.whatever.apply(this, b) + 'B';
                    }
                }, true);
                var m = new ItagM();
                expect(m.whatever('1')).eql('undefinedbB');
            });

            it('orig present even if no original two levels deep, multiple methods', function (){
                var ItagN = DOCUMENT.createItag('i-xn', {
                }).mergePrototypes({
                    dummy1: function() {
                        return 'dummy1 returnvalue';
                    },
                    whatever: function (b) {
                        return ItagN.$orig.whatever.apply(this, b) + 'b';
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
                        return ItagN.$orig.whatever.apply(this, b) + 'B';
                    },
                    dummy5: function() {
                        return 'dummy5 returnvalue';
                    },
                    dummy6: function() {
                        return 'dummy6 returnvalue';
                    }
                }, true);
                var n = new ItagN();
                expect(n.whatever('1')).eql('undefinedbB');
            });

            it('orig present even if no original', function (){
                var ItagO = DOCUMENT.createItag('i-xo', {
                }).mergePrototypes({
                    whatever: function (b) {
                        return ItagO.$orig.whatever.apply(this, b) + 'b';
                    }
                }, true).mergePrototypes({
                    whatever: function (b) {
                        return ItagO.$orig.whatever.apply(this, b) + 'B';
                    }
                }, true);
                var o = new ItagO();
                expect(o.whatever('1')).eql('undefinedbB');
            });

        });
*/
    });

}(global.window || require('node-win')));

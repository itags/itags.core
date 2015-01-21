/*global describe, it, before, after */
/*jshint unused:false */
(function (window) {

    "use strict";

    var expect = require('chai').expect,
        DOCUMENT = window.document,
        async = require('utils').asyncSilent,
        itagCore = require("../itags.core")(window, true);


    itagCore.setPrototypeChain(false);

    describe('Without __proto__', function() {

        var IShape = DOCUMENT.createItag('i-shape', {
                init: function () {
                    this.x = 10;
                    this.y = 20;
                },
                move: function (x, y) {
                    this.x += x;
                    this.y += y;
                },
                setBG: function () {
                    this.bg = '#111';
                },
                destroy: function() {
                    this.x = -1;
                    this.y = -2;
                }
            }),
            ICircle = IShape.subClass('i-circle', {
                init: function () {
                    this.x = 100;
                    this.r = 5;
                },
                area: function () {
                    return this.r * this.r * Math.PI;
                },
                setBG: function () {
                    this.bg = '#222';
                },
                destroy: function() {
                    this.x = -11;
                    this.y = -12;
                    this.r = -13;
                }
            });

        describe('i-shape', function () {
            var s = new IShape();
            DOCUMENT.body.append(s);
            s.initUI(); // should end into NOOP
            s.$superProp('initUI'); // should end into NOOP

            // it('Should be an instance of Shape and HTMLElement', function () {
                // expect(s).be.an.instanceof(window.HTMLElement);
            // });
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
                s.destroy();
                expect(s.x).be.equal(11);
                expect(s.y).be.equal(22);
                s.destroyUI();
                expect(s.x).be.equal(11);
                expect(s.y).be.equal(22);
            });
            it('Destroy', function (done) {
                s.remove();
                setTimeout(function() {
                    expect(s.x).be.equal(-1);
                    expect(s.y).be.equal(-2);
                    s.destroyUI(); // should end into NOOP
                    expect(s.x).be.equal(-1);
                    expect(s.y).be.equal(-2);
                    done();
                }, 50);
            });

        });

        describe('i-circle', function () {
            // var s = new IShape();
            var c = new ICircle();
            DOCUMENT.body.append(c);
            c.initUI(); // should end into NOOP
            c.$superProp('initUI'); // should end into NOOP

            it('should be instance of HTMLElement', function () {
                expect(c).be.an.instanceof(window.HTMLElement);
            });
            it('Should be located at 100,20 with radious 5', function () {
                expect(c.x).be.equal(100);
                expect(c.r).be.equal(5);
                expect(c.y).be.equal(20);
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
                c.$superProp('setBG');
                expect(c.bg).be.equal('#111');
            });

            it('Destroy cannot be called manually', function () {
                c.destroyUI(); // should end into NOOP
                c.$superProp('destroyUI'); // should end into NOOP
                expect(c.x).be.equal(101);
                expect(c.y).be.equal(22);
            });
            it('Destroy', function (done) {
                c.remove();
                setTimeout(function() {
                    expect(c.x).be.equal(-1);
                    expect(c.y).be.equal(-2);
                    expect(c.r).be.equal(-13);
                    c.destroyUI(); // should end into NOOP
                    c.$superProp('destroyUI'); // should end into NOOP
                    expect(c.x).be.equal(-1);
                    expect(c.y).be.equal(-2);
                    expect(c.r).be.equal(-13);
                    done();
                }, 50);
            });

        });

        describe('With no constructor:', function () {
            var P = DOCUMENT.createItag('i-p', {
                    twice: function (v) {
                        return 2 * v;
                    }
                });
            it('base class', function () {
                var p = new P();
                expect(p.twice(3)).eql(6);
            });
            it('inherited class', function () {
                var Q = P.subClass('i-q', {
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
                var A = DOCUMENT.createItag('i-a', {
                        init: function () {
                            this.a = 3;
                        },
                        add: function (b) {
                            this.a += b;
                        }
                    });
                var B = A.subClass('i-b', {
                        init: function () {
                            this.b = 4;
                        },
                        add: function (c) {
                            this.$superProp('add' ,(c * 2));
                        }
                    });
                var C = B.subClass('i-c', {
                        init: function (c) {
                            this.c = 5;
                        },
                        add: function (c) {
                            this.$superProp('add', (c * 3));
                        }
                    });

                it ('one level', function (done) {
                    var a = new A();
                    async(function() {
                        expect(a.a).eql(3);
                        a.add(2);
                        expect(a.a).eql(5);
                        done();
                    });
                });

                it ('two levels', function (done) {

                    var b = new B();
                    async(function() {
                        expect(b.a).eql(3);
                        expect(b.b).eql(4);
                        b.add(2);
                        expect(b.a).eql(7);
                        // Later classes should not interfer with the previous
                        var a = new A();
                        async(function() {
                            expect(a.a).eql(3);
                            expect(a.b===undefined).to.be.true;
                            a.add(2);
                            expect(a.a).eql(5);
                            expect(b.a).eql(7);
                            done();
                        });
                    });
                });

                it ('three levels', function (done) {
                    var c = new C();
                    async(function() {
                        expect(c.a).eql(3);
                        expect(c.b).eql(4);
                        expect(c.c).eql(5);
                        c.add(2);
                        expect(c.a).eql(15);

                        // Later classes should not interfer with the previous
                        var b = new B();
                        async(function() {
                            expect(b.a).eql(3);
                            expect(b.b).eql(4);
                            expect(b.c===undefined).to.be.true;
                            b.add(2);
                            expect(b.a).eql(7);
                            expect(c.a).eql(15);

                            // Later classes should not interfer with the previous
                            var a = new A();
                            async(function() {
                                expect(a.a).eql(3);
                                expect(a.b===undefined).to.be.true;
                                expect(a.c===undefined).to.be.true;
                                a.add(2);
                                expect(a.a).eql(5);
                                expect(b.a).eql(7);
                                expect(c.a).eql(15);
                                done();
                            });
                        });
                    });
                });

            });
        describe('Three levels with no constructor:', function () {
            var P = DOCUMENT.createItag('i-p2', {
                    twice: function (v) {
                        return 2 * v;
                    }
                });
            it('base class', function () {
                var p = new P();
                expect(p.twice(3)).eql(6);
            });
            it('inherited class', function () {
                var Q = P.subClass('i-q2', {
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

        describe('Check prototype properties', function () {
            it('properties', function () {
                var A = DOCUMENT.createItag('i-a2', {a: 3});
                var a = new A();
                expect(a.a).be.equal(3);
            });
        });

        describe('Overriding Object-members', function () {

            it('size() should be defined during initialisation', function () {
                var A = DOCUMENT.createItag('i-a3', {
                    size: function() {
                        return 100;
                    }
                });
                var a = new A();
                expect(a.size()).be.equal(100);
            });

            it('size() should be defined through mergePrototypes', function () {
                var A = DOCUMENT.createItag('i-a4').mergePrototypes({
                    size: function() {
                        return 100;
                    }
                }, true);
                var a = new A();
                expect(a.size()).be.equal(100);
            });
            it('size() should  be defined through redifinition mergePrototypes', function () {
                var A = DOCUMENT.createItag('i-a5', {
                    size: function() {
                        return 10;
                    }
                });
                var B = A.subClass('i-b2').mergePrototypes({
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
                var ClassA = DOCUMENT.createItag('i-a6'),
                    a = new ClassA();
                ClassA.mergePrototypes(obj);
                expect(a.b).be.eql(2);
                expect(a.hasOwnProperty('b')).be.true;
            });
            it('existing class',  function () {
                var ClassA = DOCUMENT.createItag('i-a7', {b: 42}),
                    a = new ClassA();
                // ClassA.mergePrototypes(obj);
                expect(a.b).be.eql(42);
                expect(a.hasOwnProperty('b')).be.true;
            });
            it ('existing class, overwriting', function () {
                var ClassA = DOCUMENT.createItag('i-a8', {
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
                var ClassA = DOCUMENT.createItag('i-a9', {
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
                var ClassA = DOCUMENT.createItag('i-a10', {
                    whatever: function (a) {
                        return a + 'a';
                    }
                }).mergePrototypes({
                    whatever: function (b) {
                        return this.$orig(b) + 'b';
                    }
                }, true);
                var ClassB = ClassA.subClass('i-b3', {
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
                var ClassA = DOCUMENT.createItag('i-a11', {
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
                var ClassB = ClassA.subClass('i-b4', {
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
                var ClassA = DOCUMENT.createItag('i-a12', {
                    whatever: function (a) {
                        return a + 'a';
                    }
                }).mergePrototypes({
                    whatever: function (b) {
                        return this.$orig(b) + 'b';
                    }
                }, true);
                var ClassB = ClassA.subClass('i-b5', {
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
                var ClassA = DOCUMENT.createItag('i-a13', {
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
                var ClassB = ClassA.subClass('i-b6', {
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
                var ClassA = DOCUMENT.createItag('i-a14', {
                }).mergePrototypes({
                    whatever: function (b) {
                        return this.$orig(b) + 'b';
                    }
                }, true);
                var a = new ClassA();
                expect(a.whatever('1')).eql('undefinedb');
            });
            it('orig present even if no original two levels deep', function (){
                var ClassA = DOCUMENT.createItag('i-a15', {
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
                var ClassA = DOCUMENT.createItag('i-a16', {
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
                var ClassA = DOCUMENT.createItag('i-a17').mergePrototypes({
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

            it('mergePrototypes with $orig without argument', function(done) {
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
                async(function() {
                    expect(a.printValues('b')).to.be.equal('new a');
                    done();
                });
            });

            it('mergePrototypes with $orig with argument', function(done) {
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

                async(function() {
                    expect(a.printValues('b')).to.be.equal('new ab');
                    done();
                });
            });

        });


        describe('$orig on sync', function () {

            it('existing class, override',  function () {
                var ClassA = DOCUMENT.createItag('i-za9', {
                    b: 'a',
                    sync: function (v) {
                        expect(this.b).eql('a');
                        return this.b + v;
                    }
                }).mergePrototypes({
                    sync: function(v) {
                        return this.$orig(v + 'c') + 'd';
                    }
                }, true);


                var a = new ClassA();
                expect(a.b).be.eql('a');
                expect(a._syncUI('e')).eql('aecd');
            });
            it('Two level inheritance each with plugin', function () {
                var ClassA = DOCUMENT.createItag('i-za10', {
                    sync: function (a) {
                        return a + 'a';
                    }
                }).mergePrototypes({
                    sync: function (b) {
                        return this.$orig(b) + 'b';
                    }
                }, true);
                var ClassB = ClassA.subClass('i-zb3', {
                    sync: function (c) {
                        return this.$superProp('sync', c) + 'c';
                    }
                }).mergePrototypes({
                    sync: function (d) {
                        return this.$orig(d) + 'd';
                    }
                }, true);

                var b = new ClassB();
                expect(b._syncUI('0')).eql('0abcd');
                var a = new ClassA();
                expect(a._syncUI('1')).eql('1ab');
            });
            it('Two level inheritance each with two plugins each', function () {
                var ClassA = DOCUMENT.createItag('i-za11', {
                    sync: function (a) {
                        return a + 'a';
                    }
                }).mergePrototypes({
                    sync: function (b) {
                        return this.$orig(b) + 'b';
                    }
                }, true).mergePrototypes({
                    sync: function (b) {
                        return this.$orig(b) + 'B';
                    }
                }, true);
                var ClassB = ClassA.subClass('i-zb4', {
                    sync: function (c) {
                        return this.$superProp('sync', c) + 'c';
                    }
                }).mergePrototypes({
                    sync: function (d) {
                        return this.$orig(d) + 'd';
                    }
                }, true).mergePrototypes({
                    sync: function (d) {
                        return this.$orig(d) + 'D';
                    }
                }, true);

                var b = new ClassB();
                expect(b._syncUI('0')).eql('0abBcdD');
                var a = new ClassA();
                expect(a._syncUI('1')).eql('1abB');
            });
            it('Three level inheritance each with plugin', function () {
                var ClassA = DOCUMENT.createItag('i-za12', {
                    sync: function (a) {
                        return a + 'a';
                    }
                }).mergePrototypes({
                    sync: function (b) {
                        return this.$orig(b) + 'b';
                    }
                }, true);
                var ClassB = ClassA.subClass('i-zb5', {
                    sync: function (c) {
                        return this.$superProp('sync', c) + 'c';
                    }
                }).mergePrototypes({
                    sync: function (d) {
                        return this.$orig(d) + 'd';
                    }
                }, true);

                var b = new ClassB();
                expect(b._syncUI('0')).eql('0abcd');
                var a = new ClassA();
                expect(a._syncUI('1')).eql('1ab');
            });
            it('Three level inheritance each with two plugins each', function () {
                var ClassA = DOCUMENT.createItag('i-za13', {
                    sync: function (a) {
                        return a + 'a';
                    }
                }).mergePrototypes({
                    sync: function (b) {
                        return this.$orig(b) + 'b';
                    }
                }, true).mergePrototypes({
                    sync: function (b) {
                        return this.$orig(b) + 'B';
                    }
                }, true);
                var ClassB = ClassA.subClass('i-zb6', {
                    sync: function (c) {
                        return this.$superProp('sync', c) + 'c';
                    }
                }).mergePrototypes({
                    sync: function (d) {
                        return this.$orig(d) + 'd';
                    }
                }, true).mergePrototypes({
                    sync: function (d) {
                        return this.$orig(d) + 'D';
                    }
                }, true);

                var b = new ClassB();
                expect(b._syncUI('0')).eql('0abBcdD');
                var a = new ClassA();
                expect(a._syncUI('1')).eql('1abB');
            });
            it('orig present even if no original', function (){
                var ClassA = DOCUMENT.createItag('i-za14', {
                }).mergePrototypes({
                    sync: function (b) {
                        return this.$orig(b) + 'b';
                    }
                }, true);
                var a = new ClassA();
                expect(a._syncUI('1')).eql('undefinedb');
            });
            it('orig present even if no original two levels deep', function (){
                var ClassA = DOCUMENT.createItag('i-za15', {
                }).mergePrototypes({
                    sync: function (b) {
                        return this.$orig(b) + 'b';
                    }
                }, true).mergePrototypes({
                    sync: function (b) {
                        return this.$orig(b) + 'B';
                    }
                }, true);
                var a = new ClassA();
                expect(a._syncUI('1')).eql('undefinedbB');
            });

            it('orig present even if no original two levels deep, multiple methods', function (){
                var ClassA = DOCUMENT.createItag('i-za16', {
                }).mergePrototypes({
                    dummy1: function() {
                        return 'dummy1 returnvalue';
                    },
                    sync: function (b) {
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
                    sync: function (b) {
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
                expect(a._syncUI('1')).eql('undefinedbB');
            });

            it('orig present even if no original three levels deep, multiple methods', function (){
                var ClassA = DOCUMENT.createItag('i-za17').mergePrototypes({
                    dummy1: function() {
                        return 'dummy1 returnvalue';
                    },
                    sync: function (b) {
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
                    sync: function (b) {
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
                expect(a._syncUI('1')).eql('undefinedbB');
            });

            it('mergePrototypes with $orig without argument', function(done) {
                var A = DOCUMENT.createItag('i-za18', {
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
                async(function(){
                    expect(a.printValues('b')).to.be.equal('new a');
                    done();
                });
            });

            it('mergePrototypes with $orig with argument', function(done) {
                var A = DOCUMENT.createItag('i-za19', {
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

                async(function(){
                    expect(a.printValues('b')).to.be.equal('new ab');
                    done();
                });
            });

        });

        describe('Chained init', function () {

            it('chaining by default', function (done) {
                var ClassA = DOCUMENT.createItag('i-a20', {
                        init: function() {
                            this.x = 1;
                        }
                    });
                var ClassB = ClassA.subClass('i-b7', {
                        init: function() {
                            this.y = 2;
                        }
                    });

                var ClassC = ClassB.subClass('i-c2', {
                        init: function() {
                            this.z = 3;
                        }
                    });
                var c = new ClassC();
                async(function(){
                    expect(c.x).to.be.equal(1);
                    expect(c.y).to.be.equal(2);
                    expect(c.z).to.be.equal(3);
                    done();
                });
            });

            it('forced chaining level 3', function (done) {
                var ClassA = DOCUMENT.createItag('i-a21', {
                        init: function() {
                            this.x = 1;
                        }
                    });
                var ClassB = ClassA.subClass('i-b8', {
                        init: function() {
                            this.y = 2;
                        }
                    }, true);

                var ClassC = ClassB.subClass('i-c3', {
                        init: function() {
                            this.z = 3;
                        }
                    });
                var c = new ClassC();
                async(function(){
                    expect(c.x).to.be.equal(1);
                    expect(c.y).to.be.equal(2);
                    expect(c.z).to.be.equal(3);
                    done();
                });
            });

            it('forced chaining level 2+3 ', function (done) {
                var ClassA = DOCUMENT.createItag('i-a22', {
                        init: function() {
                            this.x = 1;
                        }
                    });
                var ClassB = ClassA.subClass('i-b9', {
                        init: function() {
                            this.y = 2;
                        }
                    });

                var ClassC = ClassB.subClass('i-c4', {
                        init: function() {
                            this.z = 3;
                        }
                    }, true);
                var c = new ClassC();
                async(function(){
                    expect(c.x).to.be.equal(1);
                    expect(c.y).to.be.equal(2);
                    expect(c.z).to.be.equal(3);
                    done();
                });
            });

            it('forced chaining 3 levels', function (done) {
                var ClassA = DOCUMENT.createItag('i-a23', {
                        init: function() {
                            this.x = 1;
                        }
                    });
                var ClassB = ClassA.subClass('i-b10', {
                        init: function() {
                            this.y = 2;
                        }
                    }, true);

                var ClassC = ClassB.subClass('i-c5', {
                        init: function() {
                            this.z = 3;
                        }
                    }, true);
                var c = new ClassC();
                async(function(){
                    expect(c.x).to.be.equal(1);
                    expect(c.y).to.be.equal(2);
                    expect(c.z).to.be.equal(3);
                    done();
                });
            });

            it('forced no chaining level 3', function (done) {
                var ClassA = DOCUMENT.createItag('i-a24', {
                        init: function() {
                            this.x = 1;
                        }
                    });
                var ClassB = ClassA.subClass('i-b11', {
                        init: function() {
                            this.y = 2;
                        }
                    }, false);

                var ClassC = ClassB.subClass('i-c6', {
                        init: function() {
                            this.z = 3;
                        }
                    });
                var c = new ClassC();
                async(function(){
                    expect(c.x===undefined).to.be.true;
                    expect(c.y).to.be.equal(2);
                    expect(c.z).to.be.equal(3);
                    done();
                });
            });

            it('forced no chaining level 2+3 ', function (done) {
                var ClassA = DOCUMENT.createItag('i-a25', {
                        init: function() {
                            this.x = 1;
                        }
                    });
                var ClassB = ClassA.subClass('i-b12', {
                        init: function() {
                            this.y = 2;
                        }
                    });

                var ClassC = ClassB.subClass('i-c7', {
                        init: function() {
                            this.z = 3;
                        }
                    }, false);
                var c = new ClassC();
                async(function(){
                    expect(c.x===undefined).to.be.true;
                    expect(c.y===undefined).to.be.true;
                    expect(c.z).to.be.equal(3);
                    done();
                });
            });

            it('forced no chaining 3 levels', function (done) {
                var ClassA = DOCUMENT.createItag('i-a26', {
                        init: function() {
                            this.x = 1;
                        }
                    });
                var ClassB = ClassA.subClass('i-b13', {
                        init: function() {
                            this.y = 2;
                        }
                    }, false);

                var ClassC = ClassB.subClass('i-c8', {
                        init: function() {
                            this.z = 3;
                        }
                    }, false);
                var c = new ClassC();
                async(function(){
                    expect(c.x===undefined).to.be.true;
                    expect(c.y===undefined).to.be.true;
                    expect(c.z).to.be.equal(3);
                    done();
                });
            });

            it('forced no chaining level 2+3  redefined init', function (done) {
                var ClassA = DOCUMENT.createItag('i-a27', {
                        init: function() {
                            this.x = 1;
                        }
                    });
                var ClassB = ClassA.subClass('i-b14', {
                        init: function() {
                            this.y = 2;
                        }
                    });

                var ClassC = ClassB.subClass('i-c9', {
                        init: function() {
                            this.$superProp('init');
                            this.z = 3;
                        }
                    }, false);
                var c = new ClassC();
                async(function(){
                    expect(c.x).to.be.equal(1);
                    expect(c.y).to.be.equal(2);
                    expect(c.z).to.be.equal(3);
                    done();
                });
            });

            it('forced no chaining 3 levels redefined init', function (done) {
                var ClassA = DOCUMENT.createItag('i-a28', {
                        init: function() {
                            this.x = 1;
                        }
                    });
                var ClassB = ClassA.subClass('i-b15', {
                        init: function() {
                            this.$superProp('init');
                            this.y = 2;
                        }
                    }, false);

                var ClassC = ClassB.subClass('i-c10', {
                        init: function() {
                            this.$superProp('init');
                            this.z = 3;
                        }
                    }, false);
                var c = new ClassC();
                async(function(){
                    expect(c.x).to.be.equal(1);
                    expect(c.y).to.be.equal(2);
                    expect(c.z).to.be.equal(3);
                    done();
                });
            });

        });

        describe('Destruction', function () {

            it('calling Destroy', function (done) {
                var ClassA = DOCUMENT.createItag('i-a29', {
                        init: function() {
                            this.x = 10;
                        },
                        destroy: function() {
                            expect(this.x).to.be.equal(10);
                            this.x = 1;
                        }
                    });
                var a = new ClassA();
                async(function(){
                    DOCUMENT.body.append(a);
                    expect(a.x).to.be.equal(10);
                    a.destroy();
                    expect(a.x).to.be.equal(10);
                    a.remove();
                    setTimeout(function() {
                        expect(a.x).to.be.equal(1);
                        done();
                    }, 50);
                });
            });

            it('calling Destroy 2 level', function (done){
                var ClassA = DOCUMENT.createItag('i-a30', {
                    destroy: function() {
                        expect(this.x).to.be.equal(5);
                        this.x = 1;
                    }
                });
                var ClassB = ClassA.subClass('i-b16', {
                        init: function() {
                            this.x = 10;
                        },
                        destroy: function() {
                            expect(this.x).to.be.equal(10);
                            this.x = 5;
                        }
                    });
                var b = new ClassB();
                async(function(){
                    DOCUMENT.body.append(b);
                    expect(b.x).to.be.equal(10);
                    b.destroy();
                    expect(b.x).to.be.equal(10);
                    b.remove();
                    setTimeout(function() {
                        expect(b.x).to.be.equal(1);
                        done();
                    }, 50);
                });
            });

            it('calling Destroy 3 level', function (done){
                var ClassA = DOCUMENT.createItag('i-a31', {
                    destroy: function() {
                        expect(this.x).to.be.equal(2);
                        this.x = 1;
                    }
                });
                var ClassB = ClassA.subClass('i-b17', {
                    destroy: function() {
                        expect(this.x).to.be.equal(5);
                        this.x = 2;
                    }
                });
                var ClassC = ClassB.subClass('i-c11', {
                        init:function() {
                            this.x = 10;
                        },
                        destroy: function() {
                            expect(this.x).to.be.equal(10);
                            this.x = 5;
                        }
                    });
                var c = new ClassC();
                async(function(){
                    DOCUMENT.body.append(c);
                    expect(c.x).to.be.equal(10);
                    c.destroy();
                    expect(c.x).to.be.equal(10);
                    c.remove();
                    setTimeout(function() {
                        expect(c.x).to.be.equal(1);
                        done();
                    }, 50);
                });
            });

            it('calling Destroy 3 level and force notChained last class', function (done){
                var ClassA = DOCUMENT.createItag('i-a32', {
                    destroy: function() {
                        expect(this.x).to.be.equal(2);
                        this.x = 1;
                    }
                });
                var ClassB = ClassA.subClass('i-b18', {
                    destroy: function() {
                        expect(this.x).to.be.equal(5);
                        this.x = 2;
                    }
                });
                var ClassC = ClassB.subClass('i-c12', {
                        init:function() {
                            this.x = 10;
                        },
                        destroy: function() {
                            expect(this.x).to.be.equal(10);
                            this.x = 5;
                        }
                    }, true, false);
                var c = new ClassC();
                async(function(){
                    DOCUMENT.body.append(c);
                    expect(c.x).to.be.equal(10);
                    c.destroy();
                    expect(c.x).to.be.equal(10);
                    c.remove();
                    setTimeout(function() {
                        expect(c.x).to.be.equal(5);
                        done();
                    }, 50);
                });
            });

            it('calling Destroy 3 level and force notChained second last class', function (done){
                var ClassA = DOCUMENT.createItag('i-a33', {
                    destroy: function() {
                        expect(this.x).to.be.equal(2);
                        this.x = 1;
                    }
                });
                var ClassB = ClassA.subClass('i-b19', {
                    destroy: function() {
                        expect(this.x).to.be.equal(5);
                        this.x = 2;
                    }
                }, true, false);
                var ClassC = ClassB.subClass('i-c13', {
                        init:function() {
                            this.x = 10;
                        },
                        destroy: function() {
                            expect(this.x).to.be.equal(10);
                            this.x = 5;
                        }
                    });
                var c = new ClassC();
                async(function(){
                    DOCUMENT.body.append(c);
                    expect(c.x).to.be.equal(10);
                    c.destroy();
                    expect(c.x).to.be.equal(10);
                    c.remove();
                    setTimeout(function() {
                        expect(c.x).to.be.equal(2);
                        done();
                    }, 50);
                });
            });

            it('calling Destroy 3 level and force notChained last 2 classes', function (done){
                var ClassA = DOCUMENT.createItag('i-a34', {
                    destroy: function() {
                        expect(this.x).to.be.equal(2);
                        this.x = 1;
                    }
                });
                var ClassB = ClassA.subClass('i-b20', {
                    destroy: function() {
                        expect(this.x).to.be.equal(5);
                        this.x = 2;
                    }
                }, true, false);
                var ClassC = ClassB.subClass('i-c14', {
                        init:function() {
                            this.x = 10;
                        },
                        destroy: function() {
                            expect(this.x).to.be.equal(10);
                            this.x = 5;
                        }
                    }, true, false);
                var c = new ClassC();
                async(function(){
                    DOCUMENT.body.append(c);
                    expect(c.x).to.be.equal(10);
                    c.destroy();
                    expect(c.x).to.be.equal(10);
                    c.remove();
                    setTimeout(function() {
                        expect(c.x).to.be.equal(5);
                        done();
                    }, 50);
                });
            });

            it('calling Destroy 3 level and force notChained last class yet reinitted', function (done){
                var ClassA = DOCUMENT.createItag('i-a35', {
                    destroy: function() {
                        expect(this.x).to.be.equal(2);
                        this.x = 1;
                    }
                });
                var ClassB = ClassA.subClass('i-b21', {
                    destroy: function() {
                        expect(this.x).to.be.equal(5);
                        this.x = 2;
                    }
                });
                var ClassC = ClassB.subClass('i-c15', {
                        init:function() {
                            this.x = 10;
                        },
                        destroy: function() {
                            expect(this.x).to.be.equal(10);
                            this.x = 5;
                            this.$superProp('destroy');
                        }
                    }, true, false);
                var c = new ClassC();
                async(function(){
                    DOCUMENT.body.append(c);
                    expect(c.x).to.be.equal(10);
                    c.destroy();
                    expect(c.x).to.be.equal(10);
                    c.remove();
                    setTimeout(function() {
                        expect(c.x).to.be.equal(1);
                        done();
                    }, 50);
                });
            });

            it('calling Destroy 3 level and force notChained second last class yet reinitted', function (done){
                var ClassA = DOCUMENT.createItag('i-a36', {
                    destroy: function() {
                        expect(this.x).to.be.equal(2);
                        this.x = 1;
                    }
                });
                var ClassB = ClassA.subClass('i-b22', {
                    destroy: function() {
                        expect(this.x).to.be.equal(5);
                        this.x = 2;
                        this.$superProp('destroy');
                    }
                }, true, false);
                var ClassC = ClassB.subClass('i-c16', {
                        init:function() {
                            this.x = 10;
                        },
                        destroy: function() {
                            expect(this.x).to.be.equal(10);
                            this.x = 5;
                        }
                    });
                var c = new ClassC();
                async(function(){
                    DOCUMENT.body.append(c);
                    expect(c.x).to.be.equal(10);
                    c.destroy();
                    expect(c.x).to.be.equal(10);
                    c.remove();
                    setTimeout(function() {
                        expect(c.x).to.be.equal(1);
                        done();
                    }, 50);
                });
            });

            it('calling Destroy 3 level and force notChained last 2 classes yet reinitted on last', function (done){
                var ClassA = DOCUMENT.createItag('i-a37', {
                    destroy: function() {
                        expect(this.x).to.be.equal(2);
                        this.x = 1;
                    }
                });
                var ClassB = ClassA.subClass('i-b23', {
                    destroy: function() {
                        expect(this.x).to.be.equal(5);
                        this.x = 2;
                    }
                }, true, false);
                var ClassC = ClassB.subClass('i-c17', {
                        init:function() {
                            this.x = 10;
                        },
                        destroy: function() {
                            expect(this.x).to.be.equal(10);
                            this.x = 5;
                            this.$superProp('destroy');
                        }
                    }, true, false);
                var c = new ClassC();
                async(function(){
                    DOCUMENT.body.append(c);
                    expect(c.x).to.be.equal(10);
                    c.destroy();
                    expect(c.x).to.be.equal(10);
                    c.remove();
                    setTimeout(function() {
                        expect(c.x).to.be.equal(2);
                        done();
                    }, 50);
                });
            });

            it('calling Destroy 3 level and force notChained last 2 classes yet reinitted on both', function (done){
                var ClassA = DOCUMENT.createItag('i-a38', {
                    destroy: function() {
                        expect(this.x).to.be.equal(2);
                        this.x = 1;
                    }
                });
                var ClassB = ClassA.subClass('i-b24', {
                    destroy: function() {
                        expect(this.x).to.be.equal(5);
                        this.x = 2;
                        this.$superProp('destroy');
                    }
                }, true, false);
                var ClassC = ClassB.subClass('i-c18', {
                        init:function() {
                            this.x = 10;
                        },
                        destroy: function() {
                            expect(this.x).to.be.equal(10);
                            this.x = 5;
                            this.$superProp('destroy');
                        }
                    }, true, false);
                var c = new ClassC();
                async(function(){
                    DOCUMENT.body.append(c);
                    expect(c.x).to.be.equal(10);
                    c.destroy();
                    expect(c.x).to.be.equal(10);
                    c.remove();
                    setTimeout(function() {
                        expect(c.x).to.be.equal(1);
                        done();
                    }, 50);
                });
            });

        });


        describe('test $superProp', function () {

            it('Properties should be accessable', function () {
                var C1 = DOCUMENT.createItag('i-c19', {
                    f: function() {
                        return 'F1';
                    },
                    h: function() {
                        return 'H1';
                    },
                    a: 1
                });
                var C2 = C1.subClass('i-c20', {
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
                var C3 = C2.subClass('i-c21', {
                    f: function() {
                        return 'F3';
                    },
                    h: function() {
                        return 'H3';
                    },
                    a: 3
                });
                var C4 = C3.subClass('i-c22', {
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
                var C1 = DOCUMENT.createItag('i-c23', {
                    f: function() {
                        return this.h();
                    },
                    h: function() {
                        return 'H1';
                    },
                    a: 1
                });
                var C2 = C1.subClass('i-c24', {
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
                var C3 = C2.subClass('i-c25', {
                    f: function() {
                        return 'F3';
                    },
                    h: function() {
                        return 'H3';
                    },
                    a: 3
                });
                var C4 = C3.subClass('i-c26', {
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
                var C1 = DOCUMENT.createItag('i-c27', {
                    f: function() {
                        return this.g();
                    },
                    g: function() {
                        return 'G1';
                    },
                    a: 1
                });
                var C2 = C1.subClass('i-c28', {
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
                var C3 = C2.subClass('i-c29', {
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
                var C4 = C3.subClass('i-c30', {
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
                var C5 = C4.subClass('i-c31');
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
                var C1 = DOCUMENT.createItag('i-c32', {
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
                var C2 = C1.subClass('i-c32', {
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
                var C3 = C2.subClass('i-c34', {
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
                var C4 = C3.subClass('i-c35', {
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
                var C5 = C4.subClass('i-c36');
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
                var C1 = DOCUMENT.createItag('i-c37', {
                    init: function() {

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

                    },
                    m: 10,
                    f: function() {
                        return 'F1';
                    },
                    g: function() {
                        return 'G1';
                    }
                });
                var C2 = C1.subClass('i-c38', {
                    init: function() {
                        expect(this.m).to.be.equal(40);
                        expect(this.$superProp('m')).to.be.equal(10);
                        expect(this.$super.$superProp('m')===undefined).to.be.true;

                        expect(this.f()).to.be.equal('F4');
                        expect(this.$superProp('f')).to.be.equal('F1');
                        expect(this.$super.$superProp('f')===undefined).to.be.true;

                        expect(this.g()).to.be.equal('G3');
                        expect(this.$superProp('g')).to.be.equal('G1');
                        expect(this.$super.$superProp('g')===undefined).to.be.true;
                    },
                    m: 20,
                    f: function() {
                        return 'F2';
                    }
                });
                var C3 = C2.subClass('i-c39', {
                    init: function() {
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
                    },
                    m: 30,
                    f: function() {
                        return 'F3';
                    },
                    g: function() {
                        return 'G3';
                    }
                });
                var C4 = C3.subClass('i-c40', {
                    init: function() {
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
                    },
                    m: 40,
                    f: function() {
                        return 'F4';
                    }
                });
                var c4 = new C4();

            });

            it('Properties should modified well', function (done) {
                var C1 = DOCUMENT.createItag('i-c41', {
                        init: function() {
                            this.x = 1;
                        },
                        f: function() {
                            this.x = 10;
                        }
                    });
                var C2 = C1.subClass('i-c42', {
                    f: function() {
                        this.x = 20;
                    }
                });
                var C3 = C2.subClass('i-c43');
                var C4 = C3.subClass('i-c44', {
                    f: function() {
                        this.x = 40;
                    }
                });
                var c4 = new C4();
                async(function() {
                    expect(c4.x).to.be.equal(1);
                    c4.f();
                    expect(c4.x).to.be.equal(40);
                    c4.$superProp('f');
                    expect(c4.x).to.be.equal(20);
                    c4.$super.$superProp('f');
                    expect(c4.x).to.be.equal(20);
                    c4.$super.$super.$superProp('f');
                    expect(c4.x).to.be.equal(10);
                    done();
                });
            });
        });


        describe('test $super', function () {

            it('Properties should be accessable', function () {
                var C0 = DOCUMENT.createItag('i-c45', {
                    f: function() {
                        return 'F0';
                    },
                    h: function() {
                        return 'H0';
                    },
                    a: 0
                });
                var C1 = C0.subClass('i-c46', {
                    f: function() {
                        return 'F1';
                    },
                    h: function() {
                        return 'H1';
                    },
                    a: 1
                });
                var C2 = C1.subClass('i-c47', {
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
                var C3 = C2.subClass('i-c48', {
                    f: function() {
                        return 'F3';
                    },
                    h: function() {
                        return 'H3';
                    },
                    a: 3
                });
                var C4 = C3.subClass('i-c49', {
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
                var C0 = DOCUMENT.createItag('i-c50', {
                    f: function() {
                        return this.h();
                    },
                    h: function() {
                        return 'H0';
                    },
                    a: 0
                });
                var C1 = C0.subClass('i-c51', {
                    f: function() {
                        return 'F1';
                    },
                    h: function() {
                        return 'H1';
                    },
                    a: 1
                });
                var C2 = C1.subClass('i-c52', {
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
                var C3 = C2.subClass('i-c53', {
                    f: function() {
                        return 'F3';
                    },
                    h: function() {
                        return 'H3';
                    },
                    a: 3
                });
                var C4 = C3.subClass('i-c54', {
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
                var C0 = DOCUMENT.createItag('i-c55', {
                    f: function() {
                        return this.g();
                    },
                    g: function() {
                        return 'G0';
                    },
                    a: 0
                });
                var C1 = C0.subClass('i-c56', {
                    f: function() {
                        return 'F0';
                    },
                    g: function() {
                        return 'G1';
                    },
                    a: 1
                });
                var C2 = C1.subClass('i-c57', {
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
                var C3 = C2.subClass('i-c58', {
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
                var C4 = C3.subClass('i-c59', {
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
                var C5 = C4.subClass('i-c60');
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
                var C0 = DOCUMENT.createItag('i-c61', {
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
                var C1 = C0.subClass('i-c62', {
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
                var C2 = C1.subClass('i-c63', {
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
                var C3 = C2.subClass('i-c64', {
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
                var C4 = C3.subClass('i-c65', {
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
                var C5 = C4.subClass('i-c66');
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
                var C0 = DOCUMENT.createItag('i-c67', {
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
                var C0 = DOCUMENT.createItag('i-c68', {
                    f: function() {
                        return 'F0';
                    },
                    g: function() {
                        return 'G0';
                    }
                });
                var C1 = C0.subClass('i-c69', {
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
                var C0 = DOCUMENT.createItag('i-c70', {
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
                var C0 = DOCUMENT.createItag('i-c71', {
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
                var C1 = C0.subClass('i-c72', {
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


        describe('redefine init', function () {

            it('Elements should be re-initialized', function (done) {
                var count = 0,
                    D = DOCUMENT.createItag('i-d1', {
                    init: function() {
                        this.text = 'first';
                    },
                    sync: function() {
                        this.setHTML(this.text);
                    },
                    destroy: function() {
                        count++;
                    }
                });
                var d = new D();
                async(function() {
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

        });

        describe('redefine sync', function () {

            it('Elements should be re-synced', function (done) {
                var countInit = 0, countDestroy = 0,
                    D = DOCUMENT.createItag('i-d2', {
                    init: function() {
                        countInit++;
                        this.text = 'the content';
                    },
                    sync: function() {
                        this.setHTML(this.text);
                    },
                    destroy: function() {
                        countDestroy++;
                    }
                });
                var d = new D();
                async(function() {
                    DOCUMENT.body.appendChild(d);
                    expect(d.vnode.innerHTML).to.be.equal('the content');
                    D.mergePrototypes({
                        sync:function() {
                            this.setHTML(this.text+' new');
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

        });

        describe('removed init', function () {

            it('Elements should be re-initialized', function (done) {
                var count = 0,
                    initCount = 0,
                    D = DOCUMENT.createItag('i-d1', {
                    init: function() {
                        this.text = 'first';
                        initCount++;
                    },
                    sync: function() {
                        this.setHTML(this.text);
                    },
                    destroy: function() {
                        count++;
                    }
                });
                var d = new D();
                async(function() {
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

        });

        describe('redefine sync', function () {

            it('Elements should be re-synced', function (done) {
                var countInit = 0, countDestroy = 0,
                    D = DOCUMENT.createItag('i-d2', {
                    init: function() {
                        countInit++;
                        this.sometext = 'the content';
                    },
                    sync: function() {
                        this.setHTML(this.sometext);
                    },
                    destroy: function() {
                        countDestroy++;
                    }
                });
                var d = new D();
                async(function() {
                    DOCUMENT.body.appendChild(d);
                    expect(d.vnode.innerHTML).to.be.equal('the content');
                    D.removePrototypes('sync');
                    setTimeout(function() {
                        expect(d.vnode.innerHTML).to.be.equal('the content');
                        expect(countInit).to.be.equal(1);
                        expect(countDestroy).to.be.equal(0);
                        d.remove();
                        done();
                    }, 50);
                });
            });

        });

    });

}(global.window || require('node-win')));

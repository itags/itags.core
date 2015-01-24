/*global describe, it, before, after */
/*jshint unused:false */
(function (window) {

    "use strict";

    var expect = require('chai').expect,
        DOCUMENT = window.document,
        async = require('utils').asyncSilent,
        itagCore = require("../itags.core")(window, true);


    describe('With __proto__', function() {
        var IShape = DOCUMENT.createItag('i-shape', {
                init: function () {
                    this.x = 10;
                }
            });

        describe('i-shape', function () {
            var s = new IShape();
            // DOCUMENT.body.append(s);
            it('Should be located at 10,10', function () {
                expect(s.x).be.equal(10);
            });
        });

    });

}(global.window || require('node-win')));

/*global describe, it */
/*jshint unused:false */

"use strict";
var expect = require('chai').expect;
var ITSA = require('../itsa.build.js');

describe('Integration test, are they available where they should?', function () {
	it('idGenerator', function () {
		expect(ITSA.idGenerator('integration', 500)).be.equal('integration-500');
	});
	it('io', function () {
		expect(ITSA.IO.request).be.a('function');
	});
	it('event', function () {
		expect(ITSA.Event).be.an('object');
	});
	it('event-emitter', function () {
		expect(ITSA.Event.Emitter).be.a('function');
	});
	it('event-listener', function () {
		expect(ITSA.Event.Listener).be.an('object');
	});
	it('promise-ext', function () {
		expect(Promise.finishAll).be.a('function');
	});
	it('lang: rbind', function () {
		expect(Function.prototype.rbind).be.a('function');
	});
	it('timers', function () {
		expect(ITSA.later).be.a('function');
	});
	it('timers:asyncfunc emitted after async', function (done) {
		ITSA.Event.after('timers:asyncfunc', function() {
			done();
		});
		// calling async() should emit the event 'timers:asyncfunc',
		// which is a `dummy`-event which will re-render the dDOM
		ITSA.async(function() {});
	});

});

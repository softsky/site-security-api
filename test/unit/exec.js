var mocha = require('mocha')
, assert = require('assert')
, chai = require('chai')
, should = chai.should()
, expect = chai.expect
, _ = require('lodash');

var options = require('../../src/options.json');
var [protocol, host, port] = (process.env.MONGODB_PORT || "tcp://localhost:27017").split(/\:/);
var report_path = '/data';
options.mongo.host = host.replace(/\/\//,''); options.mongo.port = port; //FIXME use destructuring assignments
options.report_path = report_path;

console.log(options.mongo);

const Promise = require('bluebird');
var seneca = Promise.promisifyAll(require('seneca')()
				  //.use('mongo-store',  options.mongo)
				  .use('mem-store',  options.mongo)
				  //.use('src/entity', options)
				  .use('src/exec', options)
				  .client({
				      timeout: 15000
				  }), {suffix: 'Async'});

describe('seneca:exec microservice', () => {
    describe('TaskQueue', () => {
	it('Should  properly invoke next() for queue', () => {
	    'use strict';
	    // FIXME use actual array
	    var execjs = require('../../src/exec.js');
	    const tq = new (execjs.TaskQueue)([1, 2, 3])
	    , iter = tq.iterator();
	    tq.push(4);
	    
	    expect(iter.next()).to.deep.equal({done: false, value: 1});
	    expect(iter.next()).to.deep.equal({done: false, value: 2});
	    expect(iter.next()).to.deep.equal({done: false, value: 3});
	    expect(iter.next()).to.deep.equal({done: false, value: 4});
	    expect(iter.next()).to.deep.equal({done: true});
	    tq.push(1);
	    console.log(tq.data);
	    expect(iter.next()).to.deep.equal({done: false, value: 1});
	    expect(iter.next()).to.deep.equal({done: true});
	});
    });
    
    describe('predefined command', () => {
	// before('Setting up custom sleep', () => {
	//     seneca.add({role:'run', cmd:'execute', name:'sleep'}, (msg, respond) => {
	// 	var spec = {
	// 	    cwd: '/',
	// 	    command: 'sleep',
	// 	    args: [msg.time || 1],
	// 	    done: msg.done
	// 	};
	// 	console.log('Returning spec', spec);
	// 	respond(null, spec);
	//     });	    
	// });
	
	it.only('should execute normally and return the result', (done) => {
	    var cb = (result) => {
		console.log('DONE:', result);
		done();		
	    };
	    seneca.act({role:'run', cmd:'execute', name:'sleep', time: 15, done: cb}, (err, result) => {
		expect(err).to.be.null;
		expect(result).to.be.not.null;
		expect(result.status).to.equal('scheduled');
		console.log(result);
	    });
	}).timeout(16000);

	it('should execute tasks in parallel', (done) => {
	    var num = 0;
	    const cb = (result) => {
		console.log('Num:', num);
		if(++num === 7){
		    done();
		}
	    }
	    , runOneMore = (result)  => {
		cb(result);		
		seneca.act({role:'run', cmd:'execute', name:'sleep', time: 1, done: cb}, (err, result) => {
		    console.log('Queued:', result);		   
		});
	    };
	    
	    seneca.act({role:'run', cmd:'execute', name:'sleep', time: 6, done: cb}, (err, result) => {
		    console.log('Queued:', result);
		seneca.act({role:'run', cmd:'execute', name:'sleep', time: 4, done: runOneMore}, (err, result) => {
		    console.log('Queued:', result);
		});
		seneca.act({role:'run', cmd:'execute', name:'sleep', time: 2, done: runOneMore}, (err, result) => {
		    console.log('Queued:', result);
		});
		seneca.act({role:'run', cmd:'execute', name:'sleep', time: 1, done: runOneMore}, (err, result) => {
		    console.log('Queued:', result);
		});
	    });

	}).timeout(7000);

	it('should properly scan through CMS', (done) => {
	    seneca.act({role:'exec', cmd:'scan', type:'fast'})
	});
    });

});




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

var seneca = require('seneca')()
//.use('mongo-store',  options.mongo)
	.use('mem-store',  options.mongo)
	.use('src/entity', options)
	.use('src/exec', options)
	.client({timeout: 15000});

describe('seneca:exec microservice', () => {
    describe('predefined command', () => {
	seneca.add({role:'exec', cmd:'sleep'}, (msg, respond) => {
	    var spec = {
		cwd: '/',
		command: 'sleep',
		args: [msg.time || 1],
		done: msg.done
	    };
	    console.log('Returning spec', spec);
	    respond(null, spec);
	});
	
	
	it('should execute normally and return the result', (done) => {
	    var cb = (result) => {
		console.log('DONE:', result);
		done();		
	    };
	    seneca.act({role:'exec', cmd:'sleep', time: 15, done: cb}, (err, result) => {
		expect(err).to.be.null;
		expect(result).to.be.not.null;
		expect(result.status).to.equal('scheduled');
		console.log(result);
	    });
	}).timeout(20000);

	it('should execute tasks in parallel', (done) => {
	    const cb = (result) => {
		console.log(result);
		done();
	    }
	    seneca.act({role:'exec', cmd:'sleep', time: 6, done: cb}, (err, result) => {
		console.log('Done with', err, result);
	    });
	    
	    _(5).times((it) => {
		seneca.act({role:'exec', cmd:'sleep', time: 1}, (err, result) => {
		    console.log('Done with', err, result);
		    //done();
		});
	    });
	}).timeout(8000);
    });
});




var mocha = require('mocha')
, assert = require('assert')
, chai = require('chai')
, should = chai.should()
, expect = chai.expect;

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
	.use('src/exec', options);



describe('seneca:exec microservice', () => {
    describe('predefined command', () => {
	it('should execute normally and return the result', (done) => {
	    seneca.sub({role: 'exec', info: 'report'}, (args) => {
		console.log(args);
	    });
	    seneca.act({role:'exec', cmd:'whatweb', host:'192.168.0.254'}, (err, result) => {
		expect(err).to.be.null;
		expect(result).to.be.not.null;
		expect(result.status).to.equal('scheduled');
		done();
	    });
	});	
    });
});




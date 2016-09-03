var mocha = require('mocha')
, assert = require('assert')
, chai = require('chai')
, should = chai.should()
, expect = chai.expect;

var options = require('../../src/options.json');
var [protocol, host, port] = "tcp://localhost:27017".split(/\:/);
var report_path = '/data';
options.mongo.host = host.replace(/\/\//,''); options.mongo.port = port; //FIXME use destructuring assignments
options.report_path = report_path;

var seneca = require('seneca')()
// .use('src/queue')
// .use('src/email')
// .use('src/routes')
	.use('src/entity', options)
	.use('src/exec', options);
	// .listen({
	//     type: 'http',
	//     port: '3000',
	//     host: '0.0.0.0',
	//     protocol: 'http'
	// });



describe('seneca:exec microservice', () => {
    describe('predefined command', () => {
	it('should execute normally and return the result', (done) => {
	    seneca.sub({role: 'exec', info: 'report'}, (args) => {
		console.log(args);
	    });
	    seneca.act({role:'exec', cmd:'whatweb'}, (err, result) => {
		expect(err).to.be.null;
		expect(result).to.be.notNull;
		expect(result.status).to.equal('scheduled');
		done();
	    });
	});	
    });
});




var mocha = require('mocha')
, chai = require('chai')
, assert = chai.assert
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
				  .use('src/action', options)
				  .client({
				      timeout: 15000
				  })
                                  , {suffix: 'Async'});

describe('seneca:action microservice', () => {
    describe('on:online-scan', () => {
	it('should validate parameters', (done) => {
            seneca.actAsync({role:'on', cmd:'online-scan', card: {}})
                .then(() => { throw new Error('Shouldn\'t be here');})
                .catch((err) => {
                    console.log(err);
                    expect(err).to.exist;
                    expect(err.orig.code).to.equal('Invalid arguments');
                    return seneca;
                })
                .finally(done);
        });
        it.only('should call online-scan', (done) => {
            seneca.actAsync({role:'on', cmd:'online-scan', card: {url:'softsky.com.ua', firstName:'Arsen', lastName:'Gutsal',email:'gutsal.arsen@softsky.com.ua'}})
                .then(console.log.bind(console))
                .finally(done);
            
        });
    });
    
});




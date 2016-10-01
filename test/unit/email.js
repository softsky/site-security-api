var mocha = require('mocha')
, chai = require('chai')
, assert = chai.assert
, should = chai.should()
, expect = chai.expect
, _ = require('lodash')
, nodemailer = require('nodemailer')
, stubTransport = require('nodemailer-stub-transport');

var options = require('../../src/options.json');
var [protocol, host, port] = (process.env.MONGODB_PORT || "tcp://localhost:27017").split(/\:/);
var report_path = '/data';
options.mongo.host = host.replace(/\/\//,''); options.mongo.port = port; //FIXME use destructuring assignments
options.report_path = report_path;
options.nodemailerTransport = nodemailer.createTransport(stubTransport({keepBcc:true}));
console.log(options.mongo);

const Promise = require('bluebird');
var seneca = Promise.promisifyAll(require('seneca')()
				  //.use('mongo-store',  options.mongo)
				  .use('mem-store',  options.mongo)
				  .use('src/email', options)
				  .client({
				      timeout: 15000
				  })
                                  , {suffix: 'Async'});

describe('seneca:email microservice', () => {
    
    describe('notify', () => {
        var users = [
            {
                url: 'spaghetti.com',
                email: 'info@softsky.com.ua',
                name: {first: 'John', last: 'Rigatoni'}
            },{
                url: 'spaghetti.com',
                email: 'support@softsky.com.ua',
                name: {first: 'Luca', last: 'Tortellini'}
            },
            {
                url: 'softsky.com.ua',
                email: 'scan@softsky.com.ua',
                name: {first: 'Arsen', last: 'Gutsal'}
            }                
        ];
        
	it('should properly handle email template', (done) => {

            seneca.actAsync({role:'notify',cmd:'email',name:'online-scan-start', users:users})
                .then((results) => {
                    _(results).each((it, idx) => {
                        console.log(it);
                        assert(it.html.indexOf('#{') === -1, 'html should not contain #{}, but it does:' + it.html);
                        assert(it.text.indexOf('#{') === -1, 'text should not contain #{}, but it does:' + it.text);
                        assert(it.subject.indexOf('#{') === -1, 'subject should not contain #{}, but it does:' + it.subject);
                    });
                    done();
                });
        });
    });
});

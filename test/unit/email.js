const Promise = require('bluebird');

var mocha = require('mocha')
, chai = require('chai')
, assert = chai.assert
, should = chai.should()
, expect = chai.expect
, _ = require('lodash')
, parseString = Promise.promisify(require('xml2js').parseString)
, nodemailer = require('nodemailer')
, stubTransport = require('nodemailer-stub-transport');

var options = require('../../src/options.json');
var [protocol, host, port] = (process.env.MONGODB_PORT || "tcp://mongo:27017").split(/\:/);
var report_path = '/data';
options.mongo.host = host.replace(/\/\//,''); options.mongo.port = port; //FIXME use destructuring assignments
options.report_path = report_path;
options.nodemailerTransport = nodemailer.createTransport(stubTransport({keepBcc:true}));
console.log(options.mongo);

var seneca = Promise.promisifyAll(require('seneca')()
				  //.use('mongo-store',  options.mongo)
				  .use('mem-store',  options.mongo)
				  .use('src/email', options)
				  .client({
				      timeout: 15000
				  })
                                  , {suffix: 'Async'});

describe('seneca:email microservice', () => {

    describe('template', () => {
        const fs = require('fs')
        , path = require('path');
        
	it('should properly render email template', (done) => {
            var srcPath = 'email-templates'
            , user = {
                email: 'a@a.com',
                name: {first: 'John', last: 'Doe'},
                url: 'http://example.com'
            }
            ,  directories = fs.readdirSync(srcPath)
                    .filter((file) => file.startsWith('.') === false // omitting hinden directories
                            && fs.statSync(path.join(srcPath,file)).isDirectory());

            _(directories).each((it) => {
                seneca.actAsync('role:template,cmd:render', {object: user, locale: user.locale, action:it})
                    .catch(done)
                    .then((result) => {
                        parseString(result.html)
                            .catch((err) => {
                                console.log('',err);
                                done(err);
                            })
                            .then((it) => {
                                console.log(it);
                                const filtered =_(it).filter((it, key) => (key[0] != '_') && (key[0] === key[0].toUpperCase())).value();
                                console.log(filtered);
                                expect(filtered.length).to.equal(0, 'Found upercased tags:' + JSON.stringify(filtered));
                                
                            });                                            
                    });                
            });
            done();
        });

    });
    
    describe('notify', () => {
        var user = {
                url: 'softsky.com.ua',
                email: 'scan@softsky.com.ua',
                name: {first: 'Arsen', last: 'Gutsal'}
        };
        
	it('should properly handle online-scan-start', (done) => {
            seneca.actAsync('role:notify,cmd:email,action:online-scan-start', {user:user})
                .catch(done)
                .then((results) => {
                    console.log('--- Results:', results);
                    _(results).each((it, idx) => {
                        console.log(it);
                        _(Object.keys(it)).each((it, key) => {
                            assert(it[key].indexOf('#{') === -1, key +' should not contain #{}, but it does:' + it.html);
                        });
                    });
                    done();
                });
        });

	it('should properly handle contact-requested', (done) => {
            user = _.extend(user, {
                subject: 'Some subject',
                message: 'Some message'
            });
            seneca.actAsync('role:notify,cmd:email,action:contact-request', {user:user})
                .catch(done)
                .then((results) => {
                    expect(results).to.have.length(1);
                    console.log('--- Results:', results);
                    _(results).each((it, idx) => {
                        console.log(it);
                        _(Object.keys(it)).each((it, key) => {
                            assert(it[key].indexOf('#{') === -1, key +' should not contain #{}, but it does:' + it.html);
                        });
                    });
                    done();
                });
        });
        
    });
});

var mocha = require('mocha')
, chai = require('chai')
, chaiAsPromised = require('chai-as-promised')
, assert = chai.assert
, expect = chai.expect
, should = chai.should()
, _ = require('lodash')
, nodemailer = require('nodemailer')
, stubTransport = require('nodemailer-stub-transport');

chai.use(chaiAsPromised);


var options = require('../../src/options.json');
var [protocol, host, port] = (process.env.MONGODB_PORT || "tcp://mongo:27017").split(/\:/);
var report_path = '/data';
options.mongo.host = host.replace(/\/\//,'');
options.mongo.port = port; //FIXME use destructuring assignments
options.mongo.db = 'test';
options.report_path = report_path;
options.nodemailerTransport = nodemailer.createTransport(stubTransport({keepBcc:true}));
console.log('OPTIONS', options.mongo);

const Promise = require('bluebird');
var seneca =  Promise.promisifyAll(require('seneca')(), {suffix:'Async'})
        .use('mem-store',  options.mongo)
//.use('mongo-store',  options.mongo)
        .use('entity')
        .use('src/exec', options)
        .use('src/action', options)
        .use('src/email', options);

describe('seneca:action microservice', () => {
    before((done) => {
        seneca.ready(done);
    });
    describe('on:online-scan', () => {
	it('should validate parameters', (done) => {
            seneca.actAsync('role:on,cmd:online-scan,action:start', {card: {}})
                .then(() => { throw new Error('Shouldn\'t be here');})
                .catch((err) => {
                    console.log(err);
                    expect(err).to.exist;
                    //expect(err).to.have.property('orig');
                    // expect(err.orig).to.exist;
                    // expect(err.orig).to.have.property('code');
                    // expect(err.orig.code).to.equal('Invalid arguments');
                    return seneca;
                })
                .finally(done);
        });
        it('should store to database and send email', () =>  {
            const card = {
                url:'example.com',
                name: {
                    first: 'John',
                    last:'Doe'
                },
                email:'john.doe@gmail.com',
                'scan-type':'wordpress',
                'round':'0',
                'coupon':'XXX000'
            };

            const c$ = seneca.make$('customer')
            , s$ = seneca.make$('scan');

            let cid
            , mails = [];
            // mocking nodemailerTransport.sendMail
            options.nodemailerTransport.sendMail = (mail, cb) => {
                console.log('+++++RESULTS:', mail);
                cb(null, {response:'OK'});
                mails.push(mail);
            };
           
            return Promise.all([
                expect(c$.listAsync()).to.eventually.have.length(0),
                expect(s$.listAsync()).to.eventually.have.length(0)
            ])
                .then(() => expect(mails).to.have.length(0))
                .then(() => seneca.actAsync({role:'on', cmd:'online-scan', action:'start'}, {card: card}))
                .then((r) => {
                    expect(mails).to.have.length(1);
                    return r;
                })
                .then((r) => expect(r).to.be.deep.equal({status:'scheduled'}))
                .then(() => Promise.all([c$.listAsync(), s$.listAsync()]))
                .then(([c,s]) => {
                    console.log('+++++++++', c, s);
                    expect(c).to.have.length(1);
                    c = c[0];
                    c.email.should.equal('john.doe@gmail.com');
                    c.name.should.deep.equal({first:'John', last:'Doe'});
                    cid = c.id;
                    
                    expect(s).to.have.length(1);
                    s = s[0];
                    console.log(cid, s);
                    expect(s).to.have.property('url', 'example.com');
                    expect(s).to.have.property('scan-type', 'wordpress');
                    expect(s).to.have.property('round', '0');
                    expect(s).to.have.property('coupon','XXX000');
                    expect(s).to.have.property('customer_id', cid);                    
                })
            // trying to save second instance
                .then(() => seneca.actAsync({role:'on', cmd:'online-scan', action:'start'}, {card: card}))
                .then((r) => expect(r).to.be.deep.equal({status:'scheduled'}))            
                .then(() => c$.listAsync())
                .then((c) => expect(c).to.have.length(1))
                .then(() => s$.listAsync())
                .then((s) => expect(s).to.have.length(2));            
        });
        
        it('test email template', (done) => {
            done();
        });
    });
    
});




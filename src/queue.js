const _ = require('lodash')
, spawn = require('child_process').spawn
, async = require('async')
, seneca = require('seneca')()
	  .use('entity')
	  .use('redis-store', {
	      uri: 'redis://localhost:6379',
	      options: {}
	  })
	  .use('seneca-web');

module.exports = function exec(options){
    const self = this;

    this.add({role:'queue', cmd:'add'}, function (msg, done){
	const entity = seneca
	      .make$(msg.name)
	      .data$(msg)
	      .save$((err, object) => {
		  if(err){
		      throw new Error(err);
		  } else {
		      done(null, {saved: object.id});
		  }
	      });
    });

    const scanQueue = function(){
	seneca
	    .make$('validate-email-queue')
	    .list$((err, list) => {
		console.log('List:', list);
		async.eachOfLimit(list, 2, (it, idx) => {
		    console.log('Validating email for:', it);
		    it.load$({id: it.id}, (err, entity) => {
			self.act('role:validate, cmd:email', {host: entity.host, email: "webmaster@".concat(entity.host)});
		    });
		    it.remove$({id: it.id});
		}, (err) => {
		    if(err){
			throw new Error(err);
		    }
		});
	    });
    };

    seneca.ready(scanQueue);
};


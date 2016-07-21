const _ = require('lodash')
, spawn = require('child_process').spawn
, async = require('async')
, seneca = require('seneca')()
      .use('entity')
      .use('seneca-web')
      .use('mongo-store', {
    	  name: 'security',
	  db: 'security',
    	  host: '127.0.0.1',
    	  port: 27017,
    	  options: {}
      });


module.exports = function(options){
    this.add({role:'entity', cmd:'list'}, function (msg, done){
	var sq = _.chain(msg)
	    .pickBy((val, key) => { return key.startsWith('q.'); })
	    .mapKeys((val, key) => { return key.replace(/q\./,'')})
	    .value();

	this.log.info('ENTITY', sq);
	seneca
	    .make$(msg.name)
    	    .list$(sq, (err, entities) => {
		if(err){
		    done(null, {error: err});
		} else {
    		    done(null, entities);
		}
    	    });
    });
}

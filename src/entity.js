const _ = require('lodash')
, ObjectId = require('mongodb').ObjectID
, seneca = require('seneca')()
      .use('entity')
      .use('mongo-store', require('./options.json').mongo);


module.exports = function api(options){

    this.add({role:'entity', cmd:'save'}, function (msg, done){
	var name$ = msg.name$;
	delete msg.name$;
	var obj = msg.req$.body;
	// if(obj._id){
	//     obj._id = ObjectId(obj._id);
	// }
	//console.log(obj);
	seneca
	    .make$(name$)
	    .save$(obj, done);
    });

    this.add({role:'entity', cmd:'list'}, function (msg, done){
	var sq = _.chain(msg)
	    .pickBy((val, key) => { return key.startsWith('q.'); })
	    .mapKeys((val, key) => { return key.replace(/q\./, ''); })
	    .mapValues((val, idx) => {
		return (val.startsWith('/') && val.endsWith('/'))?new RegExp(val.substring(1, val.length - 1)):val;
	    })
	    .value();
	console.log(sq, msg.name);
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

    this.add('init:api', function (msg, respond) {
	this.log.info('init:api called');
	this.act('role:web',{use:{
    	    prefix: '/entity',
    	    pin:    'role:entity,cmd:*',
    	    map: {
    		save: { GET:true, POST: true, suffix:'/:name$' },
    		delete: { GET:true, POST: true, suffix:'/:name$' },
    		list: { GET:true, POST: true, suffix:'/:name$' }
    	    }
	}}, respond);
    });
    
}

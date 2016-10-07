'use strict';
const _ = require('lodash')
, ObjectId = require('mongodb').ObjectID;

module.exports = function api(options){
    var seneca = this;
    //seneca.use('entity');
    
    this.add({role:'entity', cmd:'save'}, function (msg, done){
	var obj = msg.body;
	// if(obj._id){
	//     obj._id = ObjectId(obj._id);
	// }
	//console.log(obj); 
	seneca
	    .make$(msg.name)
	    .save$(obj, done);
    });

    this.add({role:'entity', cmd:'list'}, function (msg, done){
	// var sq = _.chain(msg)
	//     .pickBy((val, key) => { return key.startsWith('q.'); })
	//     .mapKeys((val, key) => { return key.replace(/q\./, ''); })
	//     .mapValues((val, idx) => {
	// 	return (val.startsWith('/') && val.endsWith('/'))?new RegExp(val.substring(1, val.length - 1)):val;
	//     })
	//     .value();
	seneca
	    .make$(msg.name)
    	    .list$({}, (err, entities) => {
		if(err){
		    done(null, {error: err});
		} else {
    		    done(null, entities);
		}
    	    });
    });

    this.add('init:api', function (msg, respond) {
    	console.log('init:api called, entity');
    	this.act('role:web',{use:{
    	    prefix: '/api/entity',
    	    pin:    'role:entity,cmd:*',
    	    map: {
    		save: { GET:true, POST: true, suffix:'/:name$' },
    		delete: { GET:true, POST: true, suffix:'/:name$' },
    		list: { GET:true, POST: true, suffix:'/:name$' }
    	    }
    	}}, respond);
    });    
};

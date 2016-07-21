const _ = require('lodash')
, spawn = require('child_process').spawn
, async = require('async')
, seneca = require('seneca')()
	  .use('entity')
	  .use('seneca-web');

module.exports = function exec(options){
    this.add('role:web',// { use: {
	       // 	// define some routes that start with /api/v1
	       // 	prefix: '/api/entity',

	       // 	// use action patterns where role has the value 'api' and cmd has some defined value
	       // 	pin: {role:'entity',cmd:'*'},

	       // 	// for each value of cmd, match some HTTP method, and use the
	       // 	// query parameters as values for the action
	       // 	map:{
	       //     	    list: {GET:true}
	       // 	}
	       // }}
	       (msg, done) => {
		   console.log("DONE");
		   done(null, {status:'DONE'});
	       });
}

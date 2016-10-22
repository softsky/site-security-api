const _ = require('lodash')
, async = require('async');

module.exports = function(options){
    var seneca = this;
    this.add('role:health,cmd:all', function (msg, done){
    	done(null, {status:'OK'});
    });

    seneca.ready((respond) => {
	console.log('init:api called, health');
    	this.act('role:web',{use:{
    	    prefix: '/api/health',
    	    pin:    'role:health, cmd:*',
    	    map: {
    		all: { GET: true }
    	    }
    	}}, respond);
    });
    
};


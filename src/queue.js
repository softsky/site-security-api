const _ = require('lodash')
, async = require('async')
, seneca = require('seneca')()
      .use('entity');

module.exports = function(options){
    // var q = async.priorityQueue((task, callback)  => {	
    // 	seneca.act({role:'exec',cmd:'nmap', host: task.domain, timeout$:2 * 24 * 3600 * 1000 /* allowing two days for task execution */}, (err, res) => {
    // 	    if(err){
    // 		console.log(err);
    // 	    } else {
    // 		console.log(res);
    // 	    }
    // 	    callback();	    
    // 	});		
    // }, 50); // allowing 50 parallel executions
    
    // this.add({role:'queue', cmd:'add'}, function (msg, done){
    // 	q.push({domain: msg.host}, (err) => {
    // 	    if(err){
    // 		seneca.log.error(err);
    // 	    } else {		
    // 		seneca.log.info(`Finished process ${msg.command}`);
    // 	    };
    // 	});
	
    // 	done(null, {status:'queued'});
    // });
};


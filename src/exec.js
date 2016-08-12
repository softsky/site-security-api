const _ = require('lodash')
, spawn = require('child_process').spawn
, fs = require('fs')
, dotenv = require('dotenv') //.configure()
, request = require('request')
, qs = require('querystring')
, seneca = require('seneca')()
	  .use('entity')
	  .use('src/import')
	  .use('run', {
	      batch: {
		  'mkdir': {
		      command: 'mkdir'
		  },
		  'whatweb': {
		      command: 'whatweb'
		  },
		  'nmap': {
		      command: 'nmap',
		      timeout: 2 * 24 * 3600 * 1000
		  },
		  'nikto': {
		      
		  }		  
	      }
	  })
	  .use('mongo-store', require('./options.json').mongo),
      xml2js = require('xml2js');


const wrap = (spec) => {
    if(process.env.NODE_ENV === 'production'){
	return spec;
    } else {
	return {
	    command: 'docker',
	    args: ['exec', '-t', 'zen_davinci', spec.command].concat(spec.args)
	};
    }
};

module.exports = function api(options){

    this.add({role: 'exec', cmd:'whatweb'}, function (msg, done) {
	const filePath = `/tmp/reports/${msg.host}/${msg.cmd}.xml`;

	const spec = wrap({
	    cwd: '/tmp/reports',
	    command: msg.cmd,
	    args: [`--log-xml=${filePath}`, msg.host]
	});
	done(null, spec);
    });

    this.add({role:'exec', cmd:'nmap'}, function (msg, done) {
	const filePath = `/tmp/reports/${msg.host}/${msg.cmd}.xml`;

	const spec = wrap({
	    cwd: '/tmp/reports/${msg.host}',
	    command: 'nmap',
	    args: ['-oX',filePath, '--script','vuln', '-Pn', msg.host]
	});
	done(null, spec);
    });
        

    // this.sub('role:run,info:report',function(args,done){
    // 	fs.readFile(`/tmp/reports/${args.host}/whatweb.xml`, function(err, data) {
    // 	    var parser = new xml2js.Parser({attrkey:'properties$'});
    // 	    if(err){
    // 		seneca.log.error(err);
    // 		done(null, {error: JSON.stringify(err), result:JSON.stringify(data)});
    // 	    } else {
    // 		parser.parseString(data, function (err, result) {
    // 		    if(err){
    // 			seneca.log.error(err);
    // 			done(null, {error: `Can\'t parse JSON for ${args.host}`});
    // 		    } else {
    // 			var instance = seneca
    // 				.make$('nmaprun')
    // 				.data$({nmaprun: result['nmaprun']})
    // 				.save$((err, obj) => {
    // 			    if(err){
    // 				seneca.log.error(err);
    // 				done(null, {error: JSON.stringify(err), result:JSON.stringify(data)});
    // 			    } else {
    // 				done(null, {status:'OK'});
    // 			    }
    // 			});
    // 		    };
    // 		});
    // 	    };
    // 	});
    // });

    var q = [];

    this.wrap("role:exec", function(msg, respond) {
    	if (q.length < process.env.EXEC_QUEUE_LIMIT || 50) {
    	    var func = function(err, spec) {
    		if (err){
    		    respond(err);
    		} else {
    		    var old = q.pop() || {self:this, msg:msg};
    		    if(old){
			const filePath = `/tmp/reports/${old.msg.host}/${old.msg.cmd}.xml`;			
			// if(fs.existsSync(filePath)){
			//     seneca.act(_.extend(msg, {role:'import'}), respond);
			// } else 
			{
			    seneca.act({role:'run', cmd:'execute', name:'mkdir', spec:{
				args: ['-p', `/tmp/reports/${old.msg.host}`]
			    }}, (err, result) => {
				seneca.log.info('Running', spec.command, ' with args ', spec.args);
				var stdout = [], stderr = [];
				var proc = spawn(spec.command, spec.args);
				proc.stdout.on('data', stdout.push.bind(stdout));
				proc.stderr.on('data', stderr.push.bind(stderr));
				proc.on('close', (ret) => {
				    console.log('Process finished:', ret);
				    seneca.act({role:'import', cmd:msg.cmd, host: old.msg.host});
				});				
			    });
			    respond(null, {status:'scheduled'});			    
			}
    		    }
    		}
    	    };
    	    this.prior(msg, func);
    	} else {
    	    q.push({self:this, msg:msg});
    	};
    });
    
    // this.add('init:api', function (msg, respond) {
    // 	this.act('role:web',{use:{
    // 	    prefix: '/api/exec',
    // 	    pin:    'role:exec,cmd:*',
    // 	    map: {
    // 		nmap: { GET:true, suffix:'/:host' },
    // 		whatweb: { GET:true, suffix:'/:host' }
    // 	    }
    // 	}}, respond);
    // });
};

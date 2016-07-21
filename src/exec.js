const _ = require('lodash')
, spawn = require('child_process').spawn
, fs = require('fs')
, dotenv = require('dotenv') //.configure()
, request = require('request')
, qs = require('querystring')
, seneca = require('seneca')()
	  .use('entity')
	  .use('mongo-store', {
    	      name: 'security',
	      db: 'security',
    	      host: '127.0.0.1',
    	      port: 27017,
    	      options: {}
	  });

const wrap = (command, args) => {
    if(process.env.NODE_EVN === 'production'){
	return [command, args];
    } else {
	return ['docker', ['exec', '-t', 'zen_davinci'].concat([command]).concat(args)];
    }
};

const wrapPath = (filePath) => {
    if(process.env.NODE_EVN === 'production'){
	return filePath;
    } else {
	return filePath;
    }
};

const pathForHost = (host, suffix) => {
    return `/tmp/reports/${host}${suffix}`;
};

const saveLogger = (err, object) => {
    if(err){
	throw new Error(err);
    }
    console.log(`Saved: ${object}`);
};

var execute = (cmd, args, done) => {
    const stdout = [], stderr = [];

    const w = wrap(cmd, args)
    , wrapped = {cmd: w[0], args: w.slice(1)}
    , command = spawn(wrapped.cmd, wrapped.args[0]);

    command.stdout.on('data', (data) => {
	// getting buffer in `data`
	const str = data.toString('utf-8');
	stdout.push(str);
    });

    command.stderr.on('data', (data) => {
	//getting buffer in `data`
	const str = data.toString('utf-8');
	stderr.push(str);
    });

    command.on('close', (code) => {
	if(_.isFunction(done)){
	    var fs = require('fs')
	    , host = args[args.length - 1];
	    fs.writeFileSync(wrapPath(pathForHost(host,'.stdout.txt')), stdout);
	    fs.writeFileSync(wrapPath(pathForHost(host,'.stderr.txt')), stderr);
	    var jsonObj = JSON.parse(fs.readFileSync(wrapPath(pathForHost(host,'.json')), 'utf8'));
	    seneca
		.make$(cmd)
		.data$({date:Date.now(), host:host, json: jsonObj})
		.save$(saveLogger);
	    // check if it's sync or async
	    done(code, stdout, stderr);
	} else {
	    console.log(`child process exited with code ${code}`);
	}
    });
};

module.exports = function exec(options){

    this.add({role: 'exec', cmd: 'whatweb'}, function (msg, done) {
	const path = `/tmp/reports/${msg.host}.json`;
	if(fs.existsSync(path)){
	    fs.unlinkSync(path, console.log);
	}
	execute('whatweb', [`--log-json=${path}`, msg.host], (code, stdout, stderr) => {
	    // var list = seneca.act('role:entity,cmd:list',{name:'whatweb'});
	    // console.log('Entities:', list);
	    done(null, {result: code});
	});
    });

    this.add({role: 'validate', cmd: 'email'}, function (msg, done) {
	const email = 'webmaster@' + msg.host;
	const params = {
	    access_key:process.env.APILAYER_KEY,
	    smtp:1,
	    format:1,
	    email:email
	};

	var entity = seneca.make$('email');
	if(entity.list({email: email})){
	    done(null, {status: 'OK', cached: entity});
	} else {
	    request('http://apilayer.net/api/check?' + qs.stringify(params), (err, response, body) => {
		entity
	    	    .data$(response)
	    	    .save$((err, obj) => {
	    		if(err){
	    		    throw new Error(err);
	    		} else {
	    		    console.log(`Saved: ${obj}`);
	    		}
	    	    });
	    });
	}
	done(null, {status: 'OK'});
    });
};

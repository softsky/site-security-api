'use strict';

const _ = require('lodash')
, async = require('async')
, fs = require('fs')
, xml2js = require('xml2js');

module.exports = function(options){
    , seneca = require('seneca')()
	      .use('entity');

    this.add("role:import", (msg, done) => {
    	fs.readFile(`${options.report_path}/${msg.cmd}.xml`, function(err, data) {
    	    if(err){
    		seneca.log.error(err);
    		done(null, {error: err});
    	    } else {
    		var parser = new xml2js.Parser({attrkey:'p$', explicitRoot: false});
    		parser.parseString(data, function (err, result) {
    		    if(err){
    			seneca.log.error(err);
    			done(null, {status:'error', text:`Can\'t parse XML for ${msg.host}`});
    		    } else {
    			var instance = seneca.make$(msg.cmd);
    			instance = _.extend(instance, result);
			instance
    			    .save$((err, obj) => {
    				if(err){
    				    seneca.log.error(err);
    				    done(null, {status:'error', text:err});

    				} else {
    				    done(null, {status:'OK', entity:obj});
    				}
    			    });
    		    };
    		});
    	    };		
    	});
    });    
};


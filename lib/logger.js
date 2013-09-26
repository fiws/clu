var _ = require('lodash');
var events = require('events');
var util = require('util');

var logger = new events.EventEmitter();

var lastLogWasStep = false;

var levels = {
	"log": {},
	"info": {},
	"warn": {}
};

logger.silent = false;

_.each(levels, function(level, word){
	logger[word] = function(){
		var log = util.format.apply(null, _.values(arguments));
		logger.emit("log", log);
		if (logger.silent === false){
			if (lastLogWasStep) console.log("\n" + log);
			else console.log(log);
		}
	};
});

logger.debug = function(){
	// whatev
};

logger.step = function(){
	var log = util.format.apply(null, _.values(arguments));
	logger.emit("step", log);
	process.stdout.write(log);
	lastLogWasStep = true;
};


module.exports = logger;
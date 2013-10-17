var _ = require('lodash');
var events = require('events');
var util = require('util');

var logger = new events.EventEmitter();

var levels = {
	"log": {},
	"info": {},
	"warn": {}
};

logger.silent = false;
logger.verbose = false;

_.each(levels, function(level, word){
	logger[word] = function(){
		var log = util.format.apply(null, _.values(arguments));
		logger.emit("log", log);
		if (logger.silent === false) console.log(log);
	};
});

logger.debug = function(){
	if (logger.verbose === false) return;
	var log = util.format.apply(null, _.values(arguments));
	console.log("DEBUG: " + log);
};


logger.step = function(){
	// ignoring
};

module.exports = logger;
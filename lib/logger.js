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

_.each(levels, (level, word) => {
	logger[word] = function(...args) {
		var log = util.format.apply(null, _.values(args));
		logger.emit("log", log);
		if (logger.silent === false) console.log(log);
	};
});

logger.debug = function(...args) {
	if (logger.verbose === false) return;
	var log = util.format.apply(null, _.values(args));
	console.log("DEBUG: " + log);
};


logger.step = () => {
	// ignoring
};

module.exports = logger;
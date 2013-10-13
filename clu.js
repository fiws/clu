// libs
var events = require('events');
var fs = require('fs');
var _ = require('lodash');
var cluster = require('cluster');
require('colors');

// event emitter
var clu = new events.EventEmitter();
module.exports = clu;

// clu.tasks = new events.EventEmitter(); // unused for now

var logger = require('./lib/logger'); // own crappy logger
clu.logger = logger; // expose it

// states
var cli = false;
var exiting = false;


// built in plugins
clu.repl = require('./lib/repl');

clu.createCluster = function(options){

	// invalid calls
	if (!options) throw new Error("not enough parameters");
	if (_.isString(options)) options = {exec: options};
	else if (!options.exec) throw new Error("exec option needs to be specified.");

	// default options
	_.defaults(options, {
		workers: require('os').cpus().length,
		silent: false,
		silentWorkers: true,
		cli: true,
		socket: require("os").platform() === "win32" ? 13872 : 'clu.sock'
	});


	// get the config dir (.clu and the absolute path of the exec)
	var path = require('path');

	var cd = clu.dir = path.dirname(process.argv[1]) + "/.clu/";

	// set clu socket
	// this is gonna be used by the command line
	if (_.isString(options.socket) && options.socket[0] !== "/") options.socket = clu.dir + options.socket;

	// absolute path (?)
	if (options.exec[0] === "/"){
		cd = path.dirname(options.exec) + "/.clu/";
	} else {
		options.exec = path.resolve(path.dirname(process.argv[1]) + "/" + options.exec);
	}
	if (!fs.existsSync(options.exec) && !fs.existsSync(options.exec + ".js")) throw new Error(options.exec + " was not found!");

	// expose options
	clu.options = options;

	// check if running like 'node server <verb>' and cli is enabled
	if (options.cli && process.argv[2]){
		cli = true;
		return process.nextTick(function(){
			require('./commandLine').start(options);
		});
	}

	// options for logging
	if (options.silent === true) logger.silent = true;
	if (options.verbose === true) logger.verbose = true; // won't to anything


	// PIDS
	var pidsDir = cd + "pids";
	if (!fs.existsSync(pidsDir)){
		var mkdirp = require("mkdirp");
		mkdirp.sync(pidsDir);
	}
	if (fs.existsSync(pidsDir + "/master.pid")){
		// TODO: check if master process is running
		if(options.forceStart !== true) throw new Error("master seems to be already running");
		else fs.unlinkSync(pidsDir + "/master.pid"); // ignore and delete master.pid
	} 

	process.on('exit', function(){
		// delete master pid
		try {
			fs.unlinkSync(cd + "pids/master.pid");
		} catch(e){
			// whatever...
		}
	});

	// Without this it wont delete the master.pid
	process.on('uncaughtException', function(err){
		console.log(err.stack);
		process.exit(1);
	});

	fs.writeFileSync(pidsDir + "/master.pid", process.pid, 'utf8');

	// silent workers
	var clusterOptions = _.clone(options);
	if (clusterOptions.silentWorkers === true) clusterOptions.silent = true;

	// setup master
	cluster.setupMaster(clusterOptions);

	// for cli
	if (options.cli === true) use(require('./lib/protocol')(options.socket));

	// api
	use(require('./lib/api')());


	// Finally: Fork the workers
	clu.scaleUp(options.workers);


	// Listeners
	cluster.on('exit', function(worker) {
		logger.debug("Worker %s exited (PID %s)".yellow , worker.id, worker.process.pid);
	});

	cluster.on('online', function(worker) {
		logger.debug("Worker %s started (PID %s)".green , worker.id, worker.process.pid);
	});

	cluster.on('listening', function(worker) {
		worker.timeStarted = new Date();
		worker.uptime = function(){
			return (new Date() - this.timeStarted) / 1000;
		};
	});

	cluster.on('disconnect', function(worker) {
		if (worker.suicide === true || exiting === true) return;
		logger.warn('Worker #%s has disconnected. respawning...'.red, worker.id);
		cluster.fork();
	});

	// Ctrl + C
	process.on('SIGINT', function(){
		exiting = true;
		cluster.disconnect(function(){
			process.nextTick(process.exit);
		});
	});

};

var use = clu.use = function(module){
	if (cli === true) return;
	module.call(clu, clu);
};



clu.cluster = cluster;


// global install or node clu
if(require.main === module) require('./commandLine').start();
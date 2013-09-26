// libs
var fs = require('fs');
var _ = require('lodash');
var cluster = require('cluster');
var async = require('async');
var logger = require('./lib/logger'); // own crappy logger


var cli = false;

require('colors');

// built in plugins
exports.telnet = require('./lib/telnet');

exports.createCluster = function(options){

	// missing stuff
	if (!options) throw new Error("not enough parameters");
	if (_.isString(options)) options = {exec: options};
	else if (!options.exec) throw new Error("exec option needs to be specified.");

	// default options
	_.defaults(options, {
		workers: require('os').cpus().length,
		silent: false,
		silentWorkers: true,
		cli: true
	});

	// get the config dir (.clu and the absolute path of the exec)
	var path = require('path');
	var cd = exports.dir = path.dirname(process.argv[1]) + "/.clu/";
	options.exec = path.resolve(path.dirname(process.argv[1]) + "/" + options.exec);

	exports.options = options;

	// check if running like 'node server <verb>' and cli is enabled
	if (options.cli && process.argv[2]){
		cli = true;
		return require('./cli');
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
	if (fs.existsSync(pidsDir + "/master.pid")) throw new Error("master seems to be already running");
	fs.writeFileSync(pidsDir + "/master.pid", process.pid, 'utf8');


	// silent workers
	var clusterOptions = _.clone(options);
	if (clusterOptions.silentWorkers === true) clusterOptions.silent = true;

	// setup master
	cluster.setupMaster(clusterOptions);

	// for cli
	if (options.cli === true) use(require('./lib/dnode'));


	// Finally: Fork the workers
	increaseWorkers(options.workers);


	// Listeners
	cluster.on('exit', function(worker) {
		logger.debug("Worker %s exited (PID %s)".yellow , worker.id, worker.process.pid);
	});

	cluster.on('online', function(worker) {
		logger.debug("Worker %s started (PID %s)".green , worker.id, worker.process.pid);
	});

	cluster.on('disconnect', function(worker) {
		if (worker.suicide === true) return;
		logger.warn('Worker #%s has disconnected. respawning...'.red, worker.id);
		cluster.fork();
	});

	process.on('exit', function(){
		// delete master pid
		fs.unlinkSync(cd + "pids/master.pid");
	});

	// Without this it wont delete the master.pid
	process.on('uncaughtExeption', function(err){
		console.log(err);
		console.log(err.stack);
		process.exit();
	});

	// Ctrl + C
	process.on('SIGINT', function(){
		cluster.disconnect(function(){
			process.exit();
		});
	});

};

var use = exports.use = function(module){
	if (cli === true) return;
	module.call(cluster, exports.options);
};

exports.restart = function(cb){
	if (!_.isFunction(cb)) cb = function(){};

	// restart workers one after one
	async.eachSeries(_.values(cluster.workers), function(worker, cb){
		var gapFiller = cluster.fork();
		worker.send('close');
		gapFiller.once('online', function(){
			logger.step(".".green);
			worker.disconnect();
			setTimeout(cb, 2000);
		});

	}, function(err){
		cb(err);
		if (!err) logger.info("restarted all workers".green);
	});
};

exports.fastRestart = function(){
	// TODO: implement
};

exports.restartMaster = function(){
	var child_process = require('child_process');
	cluster.disconnect(function(){
		var script = process.argv[1];

		// spawn the child using the same node process as ours
		var child = child_process.spawn(process.execPath, [script], {
			stdio: 'ignore',
			env: process.env,
			cwd: process.cwd,
			detached: true
		});
		child.unref();
		process.exit();
	});
};

// also used internal for first start
var increaseWorkers = exports.increaseWorkers = function(num, cb){
	// Fork the workers
	async.times(num, function(a, done){
		var worker = cluster.fork();
		worker.once("listening", function(){
			logger.step(".".green);
			done(null, worker);
		});

	}, function(err, workers){
		if (err && cb) return cb(err); // TODO: Error handling here
		else if (err) throw err;

		logger.info(workers.length + " workers listening.".green.bold);
		if (cb) cb(null, workers);
	});
};


exports.decreaseWorkers = function(num, cb){
	var workers = _.filter(cluster.workers, function(worker){
		return (worker.state != "disconnected" && worker.state != "exit");
	});

	if (num > workers.length) return cb(new Error("not enough workers to stop"));

	async.times(num, function(a, cb){
		var worker = workers[a];
		worker.disconnect();
		worker.once("disconnect", function(){
			logger.step(".".yellow);
			cb(null, worker);
		});

	}, function(err, workers){
		if (err && cb) return cb(err); // TODO: Error handling here
		else if (err) throw err;

		logger.info(workers.length + " workers stoped.".green.bold);
		if (cb) cb(null, workers);
	});

};

exports.decreaseWorkers.force = function(num, cb){
	var workers = _.filter(cluster.workers, function(worker){
		return (worker.state != "disconnected" && worker.state != "exit");
	});

	if (num > workers.length) return cb(new Error("not enough workers to stop"));

	async.times(num, function(a, done){
		var worker = workers[a];
		worker.kill("SIGKILL");

		// workers don't trigger 'disconnected' if killed
		worker.once("exit", function(code, signal){
			if (signal == "SIGKILL") logger.step(".".red);
			else return;
			done(null, worker);
		});

	}, function(err, workers){
		if (err && cb) return cb(err); // TODO: Error handling here
		else if (err) throw err;

		logger.info(workers.length + " workers killed.".green.bold);
		if (cb) cb(null, workers);
	});
};

exports.stop = function(cb){
	logger.info("stopping...".blue);
	cluster.disconnect(function(){
		if (cb) cb();
		console.log('disconnected all workers');
		process.exit();
	});
};

exports.getWorkers = function(cb){
	cb(cluster);
};

exports.getWorkerCount = function(cb){
	cb(_.keys(cluster.workers).length);
};

exports.cluster = cluster;


// global install or node clu
if(require.main === module) require('./cli');
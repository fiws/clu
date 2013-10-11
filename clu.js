// libs
var fs = require('fs');
var _ = require('lodash');
var cluster = require('cluster');
var async = require('async');

var logger = require('./lib/logger'); // own crappy logger
exports.logger = logger; // expose it


var cli = false;

require('colors');

// built in plugins
exports.repl = require('./lib/repl');

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

	// absolute path (?)
	if (options.exec[0] === "/"){
		cd = path.dirname(options.exec) + "/.clu/";
	} else {
		options.exec = path.resolve(path.dirname(process.argv[1]) + "/" + options.exec);
	}
	if (!fs.existsSync(options.exec) && !fs.existsSync(options.exec + ".js")) throw new Error(options.exec + " was not found!");

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
	if (options.cli === true) use(require('./lib/protocol')());


	// Finally: Fork the workers
	scaleUp(options.workers);


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
		if (worker.suicide === true) return;
		logger.warn('Worker #%s has disconnected. respawning...'.red, worker.id);
		cluster.fork();
	});

	// Ctrl + C
	process.on('SIGINT', function(){
		cluster.disconnect(function(){
			process.exit();
		});
	});

};

var cluExports = module.exports;
var use = exports.use = function(module){
	if (cli === true) return;
	module.call(cluExports, cluExports);
};

exports.restart = function(cb){
	if (!_.isFunction(cb)) cb = function(){};

	// restart workers one after another
	async.eachSeries(_.values(cluster.workers), function(worker, cb){
		var gapFiller = cluster.fork();
		worker.send('close');
		gapFiller.once('online', function(){
			logger.step(".".green);
			worker.disconnect();
			cb();
		});

	}, function(err){
		cb(err);
		if (!err) logger.info("restarted all workers".green);
	});
};

exports.fastRestart = function(){
	// TODO: implement
};

exports.restartMaster = function(cb){
	var child_process = require('child_process');
	cluster.disconnect(function(){
		if (cb) cb();
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

exports.scaleTo = function(num, cb){
	if (num < 0) throw new Error("cannot scale below 0 workers.");
	var workers = getWorkers();
	workers =_.filter(workers, function(worker){ return worker.state === "listening" || worker.state === "online"; });
	if (num === 0) stopWorkers(cb);
	else if (num > workers.length) scaleUp(num - workers.length, cb);
	else scaleDown(workers.length - num, cb);
};

// also used internal for first start
var scaleUp = exports.scaleUp = function(num, cb){
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

		logger.info(workers.length + " new workers listening.".bold);
		if (cb) cb(null, workers);
	});
};

exports.increaseWorkers = scaleUp;


var scaleDown = exports.scaleDown = function(num, cb){
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

		logger.info(workers.length + " workers stoped.".bold);
		if (cb) cb(null, workers);
	});

};

exports.decreaseWorkers = exports.scaleDown;

exports.scaleDown.force = function(num, cb){
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

		logger.info(workers.length + " workers killed.".bold);
		if (cb) cb(null, workers);
	});
};

exports.stop = function(cb){
	logger.info("stopping...".blue);
	cluster.disconnect(function(){
		if (cb) cb();
		logger.info('disconnected all workers');
		process.exit();
	});
};

var stopWorkers = exports.stopWorkers = function(cb){
	logger.info("stopping...".blue);
	cluster.disconnect(function(){
		if (cb) cb();
		logger.info('disconnected all workers');
	});
};

var getWorkers = exports.workers = function(cb){
	var workers = _.values(cluster.workers);

	if (cb) cb(workers);
	else return workers;
};

exports.workerCount = function(cb){
	var count = _.keys(cluster.workers).length;
	if (cb) cb(count);
	else return count;
};

exports.status = function(cb){
	var workers = _.values(cluster.workers);
	var status = {
		workers: {
			total: workers.length,
			active: 0,
			pending: 0,
			averageUptime: 0
		},
		master: {
			uptime: process.uptime(),
			memoryUsage: process.memoryUsage()
		}
	};
	
	_.each(workers, function(worker){
		if (worker.state == "disconnected" || worker.state == "exit" || worker.state == "online") status.workers.pending++;
		status.workers.averageUptime += worker.uptime();
	});
	// average uptime
	status.workers.averageUptime = status.workers.averageUptime / workers.length;

	status.workers.active = workers.length - status.workers.pending;

	if (cb) cb(status);
	else return status;
};

exports.cluster = cluster;


// global install or node clu
if(require.main === module) require('./cli');
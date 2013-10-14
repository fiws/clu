var async = require('async');
var _ = require('lodash');

module.exports = function(){
	return api;
}

var api = function(clu){
	// extend clu

	var cluster = clu.cluster;
	var logger = clu.logger;

	clu.restart = function(cb){
		if (!_.isFunction(cb)) cb = function(){};

		var workers = _.values(cluster.workers);
		var initialCount = workers.length;

		// restart workers one after another
		var restarted = 0;
		async.eachSeries(workers, function(worker, cb){
			var gapFiller = cluster.fork();
			worker.send('close');
			gapFiller.once('online', function(){
				restarted++;
				worker.disconnect();
				cb();

				clu.emit("progress", {
					task: "restart",
					total: initialCount,
					current: restarted
				});
			});

		}, function(err){
			cb(err);
			if (!err) logger.info("restarted all workers".green);
		});
	};

	clu.fastRestart = function(){
		// TODO: implement
	};

	clu.restartMaster = function(cb){
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

	clu.scaleTo = function(num, cb){
		if (num < 0 && cb) cb(new Error("cannot scale below 0 workers."));
		else if (num < 0) throw new Error("cannot scale below 0 workers.");

		var workers = getWorkers();
		workers =_.filter(workers, function(worker){ return worker.state === "listening" || worker.state === "online"; });
		if (num === 0) stopWorkers(cb);
		else if (num > workers.length) scaleUp(num - workers.length, cb);
		else scaleDown(workers.length - num, cb);
	};

	// also used internal for first start
	var scaleUp = clu.scaleUp = function(num, cb){
		// Fork the workers

		if (num < 0 && cb) return cb(new Error("cannot start a negative number of workers"));
		else if (num < 0) throw new Error("cannot start a negative number of workers");

		var c = 1;
		async.times(num, function(a, done){
			var worker = cluster.fork();
			worker.once("listening", function(){
				done(null, worker);

				// Progress event
				clu.emit("progress", {
					task: "scaleUp",
					total: num,
					current: c++
				});
			});

		}, function(err, workers){
			if (err && cb) return cb(err); // TODO: Error handling here
			else if (err) throw err;

			logger.info(workers.length + " new workers listening.".bold);
			if (cb) cb(null, workers);
		});
	};

	var scaleDown = clu.scaleDown = function(num, cb){
		var workers = _.filter(cluster.workers, function(worker){
			return (worker.state != "disconnected" && worker.state != "exit");
		});

		var err = null;
		if (num > workers.length){
			err = new Error("not enough workers to stop");
			if (cb) return cb(err);
			else throw err;
		}

		if (num < 0){
			err = new Error("cannot stop less than 0 workers");
			if(cb) return cb(err);
			else throw err;
		}

		var c = 1;
		async.times(num, function(a, cb){
			var worker = workers[a];
			worker.disconnect();
			worker.once("disconnect", function(){
				cb(null, worker);

				// Progress event
				clu.emit("progress", {
					task: "scaleDown",
					total: num,
					current: c++
				});
			});

		}, function(err, workers){
			if (err && cb) return cb(err); // TODO: Error handling here
			else if (err) throw err;

			logger.info(workers.length + " workers stoped.".bold);
			if (cb) cb(null, workers);
		});

	};

	clu.scaleDown.force = function(num, cb){
		var workers = _.filter(cluster.workers, function(worker){
			return (worker.state != "disconnected" && worker.state != "exit");
		});

		if (num > workers.length) return cb(new Error("not enough workers to stop"));

		async.times(num, function(a, done){
			var worker = workers[a];
			worker.kill("SIGKILL");

			// workers don't trigger 'disconnected' if killed
			worker.once("exit", function(code, signal){
				if (signal !== "SIGKILL") return;
				done(null, worker);
			});

		}, function(err, workers){
			if (err && cb) return cb(err); // TODO: Error handling here
			else if (err) throw err;

			logger.info(workers.length + " workers killed.".bold);
			if (cb) cb(null, workers);
		});
	};

	clu.stop = function(cb){
		logger.info("stopping...".blue);
		cluster.disconnect(function(){
			if (cb) cb();
			logger.info('disconnected all workers');
			process.exit();
		});
	};

	var stopWorkers = clu.stopWorkers = function(cb){
		logger.info("stopping...".blue);
		cluster.disconnect(function(){
			if (cb) cb();
			logger.info('disconnected all workers');
		});
	};

	var getWorkers = clu.workers = function(cb){
		var workers = _.values(cluster.workers);

		if (cb) cb(workers);
		else return workers;
	};

	clu.status = function(cb){
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
			if (worker.uptime !== undefined) status.workers.averageUptime += worker.uptime();
		});
		// average uptime
		status.workers.averageUptime = status.workers.averageUptime / workers.length;

		status.workers.active = workers.length - status.workers.pending;

		if (cb) cb(status);
		else return status;
	};

};
var async = require('async');
var _ = require('lodash');
var chalk = require('chalk');

module.exports = () => api;

var api = clu => {
	// extend clu

	var cluster = clu.cluster;
	var logger = clu.logger;

	clu.restart = cb => {
		if (!_.isFunction(cb)) cb = () => {};

		var workers = _.values(cluster.workers);
		var initialCount = workers.length;

		// restart workers one after another
		var restarted = 0;
		async.eachSeries(workers, (worker, cb) => {
			var gapFiller = cluster.fork();
			worker.send('close');
			gapFiller.once('online', () => {
				restarted++;
				worker.disconnect();
				cb();

				clu.emit("progress", {
					task: "restart",
					total: initialCount,
					current: restarted
				});
			});

		}, err => {
			cb(err);
			if (!err) logger.info(chalk.bold("restarted all workers"));
		});
	};

	clu.fastRestart = () => {
		// TODO: implement
	};

	clu.restartMaster = cb => {
		var child_process = require('child_process');
		cluster.disconnect(() => {
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

	clu.scaleTo = (num, cb) => {
		if (num < 0 && cb) cb(new Error("cannot scale below 0 workers."));
		else if (num < 0) throw new Error("cannot scale below 0 workers.");

		var workers = getWorkers();
		workers =_.filter(workers, worker => worker.state === "listening" || worker.state === "online");

		if (num === 0) stopWorkers(cb);
		else if (num > workers.length) scaleUp(num - workers.length, cb);
		else scaleDown(workers.length - num, cb);
	};

	// also used internal for first start
	var scaleUp = clu.scaleUp = (num, cb) => {
		// Fork the workers

		if (num < 0 && cb) return cb(new Error("cannot start a negative number of workers"));
		else if (num < 0) throw new Error("cannot start a negative number of workers");

		var c = 1;
		async.times(num, (a, done) => {
			var worker = cluster.fork();
			worker.once("listening", () => {
				done(null, worker);

				// Progress event
				clu.emit("progress", {
					task: "scaleUp",
					total: num,
					current: c++
				});
			});

		}, (err, workers) => {
			if (err && cb) return cb(err); // TODO: Error handling here
			else if (err) throw err;

			logger.info(workers.length + chalk.bold(" new workers listening."));
			if (cb) cb(null, workers);
		});
	};

	var scaleDown = clu.scaleDown = (num, cb) => {
		var workers = _.filter(cluster.workers, worker => worker.state != "disconnected" && worker.state != "exit");

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
		async.times(num, (a, cb) => {
			var worker = workers[a];
			worker.disconnect();
			worker.once("disconnect", () => {
				cb(null, worker);

				// Progress event
				clu.emit("progress", {
					task: "scaleDown",
					total: num,
					current: c++
				});
			});

		}, (err, workers) => {
			if (err && cb) return cb(err); // TODO: Error handling here
			else if (err) throw err;

			logger.info(workers.length + chalk.bold(" workers stoped."));
			if (cb) cb(null, workers);
		});

	};

	clu.scaleDown.force = (num, cb) => {
		var workers = _.filter(cluster.workers, worker => worker.state != "disconnected" && worker.state != "exit");

		if (num > workers.length) return cb(new Error("not enough workers to stop"));

		async.times(num, (a, done) => {
			var worker = workers[a];
			worker.kill("SIGKILL");

			// workers don't trigger 'disconnected' if killed
			worker.once("exit", (code, signal) => {
				if (signal !== "SIGKILL") return;
				done(null, worker);
			});

		}, (err, workers) => {
			if (err && cb) return cb(err); // TODO: Error handling here
			else if (err) throw err;

			logger.info(workers.length + chalk.bold(" workers killed."));
			if (cb) cb(null, workers);
		});
	};

	clu.stop = cb => {
		logger.info("stopping...");
		clu.emit("stop");
		cluster.disconnect(() => {
			if (cb) cb();
			logger.info('disconnected all workers');
			var timeout = setTimeout(() => {
				// Exit the process if plugins don't respond
				logger.warn(chalk.red("Could not die gracefully. Exiting now."));
				process.exit();
			}, clu.options.stopTimeout);
			timeout.unref();
		});
	};

	var stopWorkers = clu.stopWorkers = cb => {
		logger.info("stopping...");
		cluster.disconnect(() => {
			if (cb) cb();
			logger.info('disconnected all workers');
		});
	};

	var getWorkers = clu.workers = cb => {
		var workers = _.values(cluster.workers);

		if (cb) cb(workers);
		else return workers;
	};

	clu.status = cb => {
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

		_.each(workers, worker => {
			var pendingStates = ["disconnected", "exit", "online"];
			if (_.includes(pendingStates, worker.status)) status.workers.pending++;
			if (worker.uptime !== undefined) status.workers.averageUptime += worker.uptime();
		});
		// average uptime
		status.workers.averageUptime = status.workers.averageUptime / workers.length;

		status.workers.active = workers.length - status.workers.pending;

		if (cb) cb(status);
		else return status;
	};

};

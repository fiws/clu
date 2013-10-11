var nssocket = require('nssocket');
var fs = require('fs');
var _ = require('lodash');

module.exports = function(){
	return init;
};

// t for transport error
var t = function(realErr){
	if (realErr === null || realErr === undefined) return null;
	var err = {
		message: "",
		stack: null
	};

	if (_.isString(realErr)) err.message = realErr;
	else {
		err = {
			message: realErr.message,
			stack: realErr.stack
		};
	}
	return err;
};


var init = function(clu){
	if (fs.existsSync(clu.dir + "clu.sock")) fs.unlinkSync(clu.dir + "clu.sock");
	var logger = clu.logger;

	var server = nssocket.createServer(function(socket){
		socket.send("connect");
		var sendLog = function(msg){
			socket.send("log", msg);
		};

		var sendStep = function(step){
			socket.send(["log", "step"], step);
		};

		logger.on("log", sendLog);
		logger.on("step", sendStep);



		socket.data("status", function(){
			socket.send("status", clu.status());
		});

		socket.data(["task", "stop"], function(data){
			if (data.force) {} // force it
			clu.stop(function(){
				socket.send("done", {name: "stop", err: null});
			});
		});

		socket.data(["task", "scaleTo"], function(num){
			clu.scaleTo(num, function(err){
				socket.send("done", {name: "Scale", err: t(err)});
			});
		});

		socket.data(["task", "scaleUp"], function(num){
			clu.scaleUp(num, function(err){
				socket.send("done", {name: "Upscale", err: t(err)});
			});
		});

		socket.data(["task", "scaleDown"], function(num){
			clu.scaleDown(num, function(err){
				socket.send("done", {name: "Downscale", err: t(err)});
			});
		});

		socket.data(["task", "restart"], function(data){
			if (data.force) {} // force it
			clu.restart(function(err){
				socket.send("done", {name: "restart", err: t(err)});
			});
		});

		socket.data(["task", "restartMaster"], function(){
			clu.restartMaster(function(){
				socket.send("done", {name: "restart Master", err: null});
			});
		});

		socket.data(["task", "*"], function(){
			if (socket.listeners(this.event).length > 1) return; // task already catched
			socket.send("done", {name: this.event[2], err: t(new Error("Task not found! You might need to update the master by restarting it."))});
		});

		socket.on("close", function(){
			logger.removeListener("log", sendLog);
			logger.removeListener("step", sendStep);
		});

		socket.on("error", function(err){
			if (err.code === "ECONNRESET") console.log(err.stack); // can be ignored
			else throw err;
		});
	});
	
	server.listen(clu.dir + "clu.sock");
};
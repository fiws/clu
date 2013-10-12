/* globals describe, it, before */
var should = require("should");

describe("clu", function(){
	var clu = require("../clu");
	describe(".createCluster()", function(){

		it("should exist", function(){
			should.exist(clu.createCluster);
		});

		it("should throw without any parameters", function(){
			(function(){
				clu.createCluster();
			}).should.throwError(/not enough parameters/);
		});

		it("should throw if exec option is not set", function(){
			(function(){
				clu.createCluster({foo: "bar"});
			}).should.throwError(/needs to be specified/);
		});


		it("should throw if exec file does not exist", function(){
			(function(){
				clu.createCluster({exec: "typo.js"});
			}).should.throwError(/not found/);
		});

		it("should run with valid exec option", function(done){
			(function(){
				clu.createCluster({
					exec: __dirname + "/../example/app",
					silent: true,
					cli: false,
					workers: 2
				});
				clu.cluster.once("listening", function(){
					done();
				});
			}).should.not.throw();
		});

	});

	describe(".use()", function(){
		it("should throw if plugin does not exist", function(){
			(function(){
				clu.use(clu.typo());
			}).should.throw();
		});
	});

	describe(".scaleUp()", function(){
		it("should scale up", function(done){
			clu.scaleUp(2, function(){
				var status = clu.status();
				should(status.workers.active).be.equal(4);

				done();
			});
		});

		it("should throw if scaling negative", function(){
			(function(){
				clu.scaleUp(-2);
			}).should.throwError(/cannot start/);
		});
	});

	describe(".scaleDown()", function(){
		it("should scale down", function(done){
			clu.scaleDown(2, function(){
				var status = clu.status();
				should(status.workers.active).be.equal(2);
				done();
			});
		});

		it("should throw if scaling negative", function(){
			(function(){
				clu.scaleDown(-2);
			}).should.throwError(/cannot stop/);
		});

		it("should throw if it cannot stop enough workers", function(){
			(function(){
				clu.scaleDown(200);
			}).should.throwError(/not enough/);
		});
	});

	describe(".scaleTo()", function(){
		it("should be able to scale up", function(done){
			clu.scaleTo(4, function(){
				var status = clu.status();
				should(status.workers.active).be.equal(4);

				done();
			});
		});

		it("should be able to scale down", function(done){
			clu.scaleTo(3, function(){
				var status = clu.status();
				should(status.workers.active).be.equal(3);

				done();
			});
		});

		it("should throw if scaling negative", function(){
			(function(){
				clu.scaleTo(-2);
			}).should.throwError(/cannot scale below 0/);
		});
	});

	describe(".status()", function(){
		it("should return a status like object", function(){
			var status = clu.status();

			status.should.have.properties("workers", "master");
			status.master.uptime.should.be.above(0);
			status.workers.averageUptime.should.be.above(0);
			status.workers.total.should.equal(3);
		});
	});

	describe(".stopWorkers()", function(){
		it("should stop all workers", function(done){
			clu.stopWorkers(function(){
				var workers = clu.workers();
				should(workers).have.length(0);
				done();
			});
		});
	});
});
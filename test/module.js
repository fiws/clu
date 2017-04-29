/* globals describe, it, before */
var should = require("should");

describe("clu", () => {
	var clu = require("../clu");
	describe(".createCluster()", () => {

		it("should exist", () => {
			should.exist(clu.createCluster);
		});

		it("should throw without any parameters", () => {
			((() => {
				clu.createCluster();
			})).should.throwError(/not enough parameters/);
		});

		it("should throw if exec option is not set", () => {
			((() => {
				clu.createCluster({foo: "bar"});
			})).should.throwError(/needs to be specified/);
		});


		it("should throw if exec file does not exist", () => {
			((() => {
				clu.createCluster({exec: "typo.js"});
			})).should.throwError(/not found/);
		});

		it("should run with valid exec option", done => {
			((() => {
				clu.createCluster({
					exec: __dirname + "/../example/app",
					silent: true,
					cli: false,
					workers: 2
				});
				clu.cluster.once("listening", () => {
					done();
				});
			})).should.not.throw();
		});

	});

	describe(".use()", () => {
		it("should throw if plugin does not exist", () => {
			((() => {
				clu.use(clu.typo());
			})).should.throw();
		});
	});

	describe(".scaleUp()", () => {
		it("should scale up", done => {
			clu.scaleUp(2, () => {
				var status = clu.status();
				should(status.workers.active).be.equal(4);

				done();
			});
		});

		it("should throw if scaling negative", () => {
			((() => {
				clu.scaleUp(-2);
			})).should.throwError(/cannot start/);
		});
	});

	describe(".scaleDown()", () => {
		it("should scale down", done => {
			clu.scaleDown(2, () => {
				var status = clu.status();
				should(status.workers.active).be.equal(2);
				done();
			});
		});

		it("should throw if scaling negative", () => {
			((() => {
				clu.scaleDown(-2);
			})).should.throwError(/cannot stop/);
		});

		it("should throw if it cannot stop enough workers", () => {
			((() => {
				clu.scaleDown(200);
			})).should.throwError(/not enough/);
		});
	});

	describe(".scaleTo()", () => {
		it("should be able to scale up", done => {
			clu.scaleTo(4, () => {
				var status = clu.status();
				should(status.workers.active).be.equal(4);

				done();
			});
		});

		it("should be able to scale down", done => {
			clu.scaleTo(3, () => {
				var status = clu.status();
				should(status.workers.active).be.equal(3);

				done();
			});
		});

		it("should throw if scaling negative", () => {
			((() => {
				clu.scaleTo(-2);
			})).should.throwError(/cannot scale below 0/);
		});
	});

	describe(".status()", () => {
		it("should return a status like object", () => {
			var status = clu.status();

			status.should.have.properties("workers", "master");
			status.master.uptime.should.be.above(0);
			status.workers.averageUptime.should.be.above(0);
			status.workers.total.should.equal(3);
		});
	});

	describe(".stopWorkers()", () => {
		it("should stop all workers", done => {
			clu.stopWorkers(() => {
					var status = clu.status();
					should(status.workers.active).be.equal(0);
					done();
				}, 100);
		});
	});
});
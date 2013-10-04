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

	});

	describe(".use()", function(){
		it("should throw if plugin does not exist", function(){
			(function(){
				clu.use(clu.typo());
			}).should.throw();
		});
	});
});
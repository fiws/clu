/* globals describe, it, before */
var should = require("should");

describe("cli", function(){
	describe("require", function(){

		it("should throw if master is not running", function(){
			(function(){
				require("../cli");
			}).should.throw(/not running/);
		});

	});

});
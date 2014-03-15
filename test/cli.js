/* globals describe, it, before */
var should = require("should");

describe("cli", function(){
	describe("require", function(){

		// will not throw anyway because there are not enough paramters
		it("should NOT throw if master is not running", function(){
			// command line tools should not *throw* for simple stuff like that (?)
			(function(){
				require("../cli");
			}).should.not.throw();
		});

	});

});
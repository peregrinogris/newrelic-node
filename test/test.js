var newrelic = require( "../newrelic-node.js" );

var should = require('should'),
    log = require("node-logging"),
    sys = require('util'),
    http = require('http'), 
    request = require('request'),
    exec = require('child_process').exec;


var server = http.createServer(function(request, response) {
	response.writeHead(200, {});
	response.end();
 	server.emit('message', request, response);
}).listen(8087);

var serverError = http.createServer(function(request, response) {
	response.writeHead(500, {});
	response.end();
 	serverError.emit('message', request, response);
}).listen(8088);


function DateFmt() {
  this.dateMarkers = { 
     d:['getDate',function(v) { return ("0"+v).substr(-2,2)}], 
         m:['getMonth',function(v) { return ("0"+v).substr(-2,2)}],
         n:['getMonth',function(v) {
             var mthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
             return mthNames[v];
             }],
         w:['getDay',function(v) {
             var dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
             return dayNames[v];
             }],
         y:['getFullYear'],
         H:['getHours',function(v) { return ("0"+v).substr(-2,2)}],
         M:['getMinutes',function(v) { return ("0"+v).substr(-2,2)}],
         S:['getSeconds',function(v) { return ("0"+v).substr(-2,2)}],
         i:['toISOString',null]
  };

  this.format = function(date, fmt) {
    var dateMarkers = this.dateMarkers
    var dateTxt = fmt.replace(/%(.)/g, function(m, p){
    var rv = date[(dateMarkers[p])[0]]()

    if ( dateMarkers[p][1] != null ) rv = dateMarkers[p][1](rv)

    return rv
  });

  return dateTxt
  }
}

    
describe("manual logs" ,function(){
   afterEach(function(done){
	server.removeAllListeners('message');
	done();	
   });



   it("controla que se lanze el proceso java",function(done){
	exec("ps -efa | grep java | grep Monitor | grep -v grep",  function (error, stdout, stderr) {
                should.not.exist(error);
                "".should.equal(stderr);
                stdout.should.include("Monitor");
		done()
	});
    })
    
    it("controla que el proceso java este escuchando en el puerto",function(done){
	this.timeout(5000);
	//duermo 1 segundo para q levanta el server
	exec("sleep 3 && netstat -tpan | grep LISTEN | grep 9990",  function (error, stdout, stderr) {
                stdout.should.include("9990");
		done()
	});
    })
     	
    it("envio de mensaje a proceso java",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{URI_WEB_TRANSACTION:200},path:"/test", httpStatus:200, httpMethod:"GET"});
	//termina de implementar
	done()
	});


    it("envio de mensaje por request",function(done){
    	this.timeout(5000);
    	http.createServer(function(request, response) {
    		response.writeHead(200, {});
    	 	newrelic.logRequest(request, response, 200);
    	 	newrelic.logRequest(request, response, 200);
    	 	newrelic.logRequest(request, response, 200);
    	 	setTimeout(function() {
    			done();	
    	 	}, 2000);
    	}).listen(8085);
    	   request({
                url:"http://127.0.0.1:8085/ping",
                method:"GET",
                jar: false
            },function(error,response,body){
            })
	});
	
	
    it("envio de error",function(done){
    	this.timeout(5000);
    	http.createServer(function(request, response) {
    		response.writeHead(500, {});
    	 	newrelic.logRequestError("Un error", request, response, 200);
    	 	setTimeout(function() {
    			done();	
    	 	}, 2000);
    	}).listen(8086);
    	   request({
                url:"http://127.0.0.1:8086/pingError",
                method:"GET",
                jar: false
            },function(error,response,body){
            })
	});
	
    it("logRequestWithMessage",function(done){
    	serverError.on('message', function(request, response) {
	    	newrelic.logRequestWithMessage(request, response, 23, "Un mensaje loco");
		done();
    	});

    	   request({
                url:"http://127.0.0.1:8088/logRequestWithMessage",
                method:"GET",
                jar: false
            },function(error,response,body){
            })
	});


    it("log WEB_TRANSACTION_EXTERNAL_ALL",function(done){
    	server.on('message', function(request, response) {
	    	newrelic.logWebTransactionExternalAll(request, response, 200);
		done();
    	});

    	   request({
                url:"http://127.0.0.1:8087/ping",
                method:"GET",
                jar: false
            },function(error,response,body){
            })
	});


    it("buffer muy grande no descarta nensages",function(done){
    	this.timeout(2000);
	var j = 0;
	newrelic.BUFFER_SIZE = 200000000000;
	newrelic.on('buffer_full', function () {
		should.fail("Nunca deberia ser llamado");
		
	});
    	server.on('message', function(req, res) {
		newrelic.logWebTransactionExternalAll(req, res, 200);
		j++;
		if (j > 1000)
			done();
		else
			request({
	        	        url:"http://127.0.0.1:8087/ping",
	        	        method:"GET",
	        	        jar: false
	        	    },function(error,res,body){
	            });
    		});
	request({
       	        url:"http://127.0.0.1:8087/ping",
       	        method:"GET",
       	        jar: false
       	    },function(error,response,body){
         });

	});

    it("envio de mensaje con timespent en date",function(done){
	this.timeout(2000);
	var fmt = new DateFmt();
	var v = fmt.format(new Date(),"[%d/%n/%y:%H:%M:%S -0300]");
	newrelic.log({timespent:{URI_WEB_TRANSACTION: v}, path:"/test", httpStatus:201, httpMethod:"GET"});
	//termina de implementar
	done()
	});

	//newrelic.log({timespent:{URI_WEB_TRANSACTION: "[04/Oct/2012:08:21:00 -0300]" [02/Nov/2012:14:40:16 -3000]}, path:"/test", httpStatus:201, httpMethod:"GET"});


   it("envio de mensaje con timespent en date en formato incorrecto",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{URI_WEB_TRANSACTION: "[31/Aug/2012:15:23:06 AASDASD"}, path:"/test", httpStatus:201, httpMethod:"GET"});
	//termina de implementar
	done()
	});


    it("logue de tiempo usando el tiempo en epoch",function(done){
	this.timeout(2000);
	var milliseconds = ((new Date).getTime() - 2500)*1000;
	newrelic.log({timespent:{URI_WEB_TRANSACTION: milliseconds}, path:"/testepoch", httpStatus:200, httpMethod:"GET"});
	//termina de implementar
	done()
	});

    it("custom metrics contadores",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{URI_WEB_TRANSACTION:200}, path:"/test", httpStatus:201, httpMethod:"GET", custom_metric: [{name:"TestCounter", type: "counter", value:10 }]});
	//termina de implementar
	done()
	});

    it("custom metrics contador con string en value",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{URI_WEB_TRANSACTION:200}, path:"/test", httpStatus:201, httpMethod:"GET", custom_metric: [{name:"TestCounter", type: "counter", value:"miss" }]});
	newrelic.log({timespent:{URI_WEB_TRANSACTION:200}, path:"/test", httpStatus:201, httpMethod:"GET", custom_metric: [{name:"TestCounter", type: "counter", value:"hit" }]});
	//termina de implementar
	done()
	});

    it("1000 custom metrics contadores",function(done){
	this.timeout(20000);
	for (var i = 0; i < 100; i++ )
		newrelic.log({timespent:{URI_WEB_TRANSACTION:200}, path:"/1000custommetriccontadoes", httpStatus:201, httpMethod:"GET", custom_metric: [{name:"HIT", type: "counter", value:1 }, {name:"MISS", type: "counter", value:2 }]});
	
	//termina de implementar
	done()
	});

    it("1000 custom metrics tiempo",function(done){
	this.timeout(20000);
	for (var i = 0; i < 100; i++ )
		newrelic.log({timespent:{URI_WEB_TRANSACTION:200}, path:"/1000custommetricstiempo", httpStatus:201, httpMethod:"GET", custom_metric: [{name:"tiempo", type: "time", value:1 }]});
	
	//termina de implementar
	done()
	});

    it("1000 custom metrics tiempo1",function(done){
	this.timeout(20000);
	for (var i = 0; i < 100; i++ )
		newrelic.log({timespent:{URI_WEB_TRANSACTION:200}, path:"/1000custommetricstiempo1", httpStatus:201, httpMethod:"GET", custom_metric: [{name:"tiempo1", type: "time", value:20 }]});
	
	//termina de implementar
	done()
	});

    it("envio de queue_timea",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{QUEUE_TIME:80},path:"/queuetime", httpStatus:200, httpMethod:"GET"});
	//termina de implementar
	done()
	});

    it("envio de Database/allWeb",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{"Database/allWeb":80},path:"/DatabaseallWeb", httpStatus:200, httpMethod:"GET"});
	//termina de implementar
	done()
	});

    it("envio de Solr/allWeb",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{"Solr/allWeb":80},path:"/testSolrallWeb", httpStatus:200, httpMethod:"GET"});
	//termina de implementar
	done()
	});

    it("un calls",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{URI_WEB_TRANSACTION:80},path:"/calls", httpStatus:200, httpMethod:"GET", calls:1});
	//termina de implementar
	done()
	});

    it("1000 calls",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{URI_WEB_TRANSACTION:80},path:"/1000calls", httpStatus:200, httpMethod:"GET", calls:1000});
	//termina de implementar
	done()
	});

    it("custom metrics contadores + calls",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{URI_WEB_TRANSACTION:120}, path:"/TestCounterCalls", httpStatus:201, httpMethod:"GET", custom_metric: [{name:"TestCounterCalls", type: "counter", value:10 }],  calls: 1000});
	//termina de implementar
	done()
	});

    it("test path sin barra",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{URI_WEB_TRANSACTION:120}, path:"sinbarra", httpStatus:200, httpMethod:"GET"});
	//termina de implementar
	done()
	});

    it("test path con barra",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{URI_WEB_TRANSACTION:120}, path:"/conbarra", httpStatus:200, httpMethod:"GET"});
	//termina de implementar
	done()
	});


});

var express = require('express');
var app = express();

// simple logger
app.use(newrelic.express);
app.listen(3000);
app.get('/express/:status/:sleep', function(req, res){	
		setTimeout(function () {
			res.writeHead(parseInt(req.param('status')), { "status" : req.param('status'), "sleep" : req.param('sleep')});
			res.end();
		}, req.param('sleep'));
});


describe("express integration" ,function(){
    it("test with express status 200", function(done){
	this.timeout(5000);

	request({
       	        url:"http://127.0.0.1:3000/express/200/1000",
       	        method:"GET",
       	        jar: false
       	    },function(error,response,body){
		should.not.exist(error);
		done();
		
         });

	});

    it("test with express status 500", function(done){
	this.timeout(6000);

	request({
       	        url:"http://127.0.0.1:3000/express/500/5000",
       	        method:"GET",
       	        jar: false
       	    },function(error,response,body){
		should.not.exist(error);
		done();
		
         });

	});


})


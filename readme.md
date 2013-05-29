Agente de newrelic para node.

## Instalación
	npm install newrelic-node

## Configuración
Editar el archivo newrelic/newrelic.yml con la license_key y app_name de la aplicación correspondiente.

## Use con Express:
	var newrelic = require( "newrelic-node" );
	app.use(newrelic.express);	

## Uso manual:
	var newrelic = require( "newrelic-node" );
	var startDate = new Date();
	
	newrelic.logRequest(request, response, Date.now()-startDate.getTime());
	o
	newrelic.log({timespent:{"URI_WEB_TRANSACTION":Date.now()-startDate.getTime()}, 
		path:"/test", httpStatus:200, httpMethod:"GET"});
	o
	newrelic.log({timespent:{"URI_WEB_TRANSACTION":Date.now()-startDate.getTime(), WEB_TRANSACTION_EXTERNAL_ALL: 1000}}, }
		path:"/test", httpStatus:200, httpMethod:"GET"});
	o
	newrelic.log({timespent:{"URI_WEB_TRANSACTION":Date.now()-startDate.getTime()}, 
		path:"/test", httpStatus:200, httpMethod:"GET", calls:100}); //simula 100 request
	
## Loguear errores manualmente:
	var newrelic = require( "newrelic-node" );
	newrelic.logRequestError("Un mensaje de error", request, response, timespent);
	o
	newrelic.log({timespent:{"URI_WEB_TRANSACTION":12}, error: "Mensaje de error", 
		path:"/error", httpStatus:500, httpMethod:"GET"}});		

## Custom Metrics:
	var newrelic = require( "newrelic-node" );
	newrelic.log({timespent:{URI_WEB_TRANSACTION:5}, path:"/test", httpStatus:201, httpMethod:"GET", 
		custom_metric:[{name:"tiempo", type: "time", value:1 }, {name:"tiempo", type: "counter", value:1000 }]});

Las custom metrics son de tipo "counter" o "time". Las mismas se pueden graficar en una custom view como /CUSTOM/name.

## Tipos de timespent:
- External/allWeb

- WebTransaction/Uri

- WebFrontend/QueueTime

- Database/allWeb

- Solr/allWeb

Cada timespent es independiente en el dashboard de newrelic, se pueden enviar varios concatenados en el mismo mensaje.

## Formato de Json:
	{timespent:
		{type_timespent:(number|double|date), type_timespent:(number|double|date)},
		path:string, 
		httpStatus:number, 
		httpMethod:string, 
		custom_metric:[
			{name:string, type:counter, value:(numbre|double|string) }, 
			{name:string, type:time, value:(number|double) }
		],
		calls: number}

## Entorno de desarrollo:
Para que no levante el proceso en entorno de desarrollo se puede usar:
	NODE_ENV=development node app.js

## Requisitos:
JAVA 1.6

## Como funciona?
Como newrelic no tiene soporte nativo para nodejs, lo que hace el modulo es levantar un proceso java que loguea en newrelic. El proceso java usa MINA para comunicarse con nodejs.

## Herramientas usadas:
	Mina (mina.apache.org)



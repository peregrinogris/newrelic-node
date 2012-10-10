Agente de newrelic para node.

## Instalación
	npm install newrelic-node

## Configuración
Editar el archivo newrelic/newrelic.yml con la license_key y app_name de la aplicación correspondiente.

## Uso:
	var newrelic = require( "newrelic-node" );
	
	newrelic.logRequest(request, response, timespent);
	o
	newrelic.log({timespent:{"URI_WEB_TRANSACTION":5000}, path:"/test", httpStatus:200, httpMethod:"GET"});
	o
	newrelic.log({timespent:{"URI_WEB_TRANSACTION":5000, WEB_TRANSACTION_EXTERNAL_ALL: 1000}}, path:"/test", httpStatus:200, httpMethod:"GET"});
	o
	newrelic.log({timespent:{"URI_WEB_TRANSACTION":100}, path:"/test", httpStatus:200, httpMethod:"GET", calls:100}); //simula 100 request
	
## Loguear errores:
	var newrelic = require( "newrelic-node" );
	newrelic.logRequestError("Un mensaje de error", request, response, timespent);
	o
	newrelic.log({timespent:{"URI_WEB_TRANSACTION":12}, error: "Mensaje de error", path:"/error", httpStatus:500, httpMethod:"GET"}});		

## Custom Metrics:
	var newrelic = require( "newrelic-node" );
	newrelic.log({timespent:{URI_WEB_TRANSACTION:5}, path:"/test", httpStatus:201, httpMethod:"GET", custom_metric:[{name:"tiempo", type: "time", value:1 }, {name:"tiempo", type: "counter", value:1000 }]});

Las custom metrics son de tipo "counter" o "time". Las mismas se pueden graficar en una custom view como /CUSTOM/name.

## Tipos de timespent:
- WEB_TRANSACTION_EXTERNAL_ALL o External/allWeb

- URI_WEB_TRANSACTION o WebTransaction/Uri

- QUEUE_TIME o WebFrontend/QueueTime

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
			{name:string, type:string, value:(numbre|double) }, 
			{name:string, type:string, value:(number|double) }
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



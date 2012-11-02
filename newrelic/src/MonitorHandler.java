import java.text.DecimalFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Collections;
import java.util.Date;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.atomic.AtomicLong;

import org.apache.mina.core.service.IoHandlerAdapter;
import org.apache.mina.core.session.IoSession;
import org.apache.mina.transport.socket.SocketSessionConfig;

import com.google.common.collect.Maps;
import com.newrelic.agent.Agent;
import com.newrelic.agent.MetricNames;
import com.newrelic.agent.MetricSpec;
import com.newrelic.agent.errors.HttpTracedError;
import com.newrelic.agent.errors.ThrowableError;
import com.newrelic.agent.stats.StatsEngine;
import com.newrelic.agent.tracers.RequestDispatcherTracer;
import com.newrelic.org.json.simple.JSONArray;
import com.newrelic.org.json.simple.JSONObject;
import com.newrelic.org.json.simple.parser.JSONParser;

/**
 * Created by: Matias Rege
 */
public class MonitorHandler extends IoHandlerAdapter {
	private static final StatsEngine StatsEngine = Agent.instance().getDefaultRPMService().getStatsEngine();
	private boolean debug;
	private AtomicLong operations = new AtomicLong(0);
	private long lastexec = 0;
	private AtomicLong procTime = new AtomicLong(0);
	private Timer timer;
	private int buffer;
	private SimpleDateFormat sdf = new SimpleDateFormat("[dd/MMM/yyyy:HH:mm:ss Z]"); 

	public void setBuffer(int buffer) {
		this.buffer = buffer;
	}

	public void exceptionCaught(IoSession session, Throwable t) throws Exception {
		t.printStackTrace();
		session.close(true);
	}

	public void messageReceived(IoSession session, Object msg) throws Exception {
		long begin = System.currentTimeMillis();
		operations.getAndIncrement();
		try {
			if (debug)
				System.out.println(msg.toString());
			JSONObject json = (JSONObject)new JSONParser().parse(msg.toString());
							
			JSONObject timespent = (JSONObject) json.get("timespent");
			int calls = json.containsKey("calls") ? ((Long)json.get("calls")).intValue() : 1;
			
			if(timespent != null){
				String pathTmp = json.containsKey("path") ? (String)json.get("path") : "-";
				String path = !pathTmp.startsWith("/") ? "/"+pathTmp: pathTmp;
				String method = json.containsKey("httpMethod") ? (String)json.get("httpMethod") : "-";
				long status = json.containsKey("httpStatus") ? (Long)json.get("httpStatus") : 999;
				long totaltime = 0;
	
				for (Object key : timespent.keySet()) {
					Object timeObj = timespent.get(key);
					Long time = 0L;
					
					if (timeObj instanceof Double) {
						time = (long) (((Double) timeObj)*1000);					
					} else if (timeObj instanceof Long) {
						Long t = (Long)timeObj;
						//si el numero es muy grande, entonces asume que el time esta en epoch y es el tiempo de inicio del request.
						if (t > 1000000000) {
							time = begin - (t/1000);
						} else {
							time = t;
						}
					} else if (timeObj instanceof String) {
						try {
							synchronized (sdf) {
								Date requestTime = sdf.parse((String) timeObj);
								time = begin - requestTime.getTime();
							}
						} catch (ParseException e) {
							reportParserError(msg.toString(), e);
							return;
						}				
					}
					
					totaltime += time;
					for (int i = 0; i < calls; i++) {
						if ("WEB_TRANSACTION_EXTERNAL_ALL".equals(key) || "External/allWeb".equals(key)) {
							StatsEngine.getResponseTimeStats("External/allWeb").recordResponseTime(time);							
						} else if ("URI_WEB_TRANSACTION".equals(key) || "WebTransaction/Uri".equals(key)) {
							StatsEngine.getResponseTimeStats("WebTransaction/Uri"+ path).recordResponseTime(time);					
							StatsEngine.getApdexStats(MetricSpec.lookup(MetricNames.APDEX + "/Uri" + path)).recordApdexResponseTime(time);
						} else {
							StatsEngine.getResponseTimeStats((String)key).recordResponseTime(time);
						} 
					}
				}
				
				for (int i = 0; i < calls; i++) {
					StatsEngine.getResponseTimeStats(MetricSpec.DISPATCHER).recordResponseTime(totaltime);
					StatsEngine.getApdexStats(MetricSpec.APDEX).recordApdexResponseTime(totaltime);
				}
			    
				boolean failed = ((status < 200) || (status > 399));
				if (failed) {
					for (int i = 0; i < calls; i++) {
						reportAppError(msg.toString(), status, path, method, timespent);
					}
				}
			}
		    
		    JSONArray customMetrics = (JSONArray) json.get("custom_metric");
			if (customMetrics != null) {
				for (Object key : customMetrics) {
					JSONObject metric = (JSONObject)key;
							
					String name = (String) metric.get("name");
					String type = (String) metric.get("type");
					Object value = metric.get("value");
					if (type.equals("counter")) {
						if (value instanceof Double) {
							StatsEngine.getStats("/Custom/"+name).incrementCallCount(((Double)value).intValue()*calls);					
						} else if (value instanceof Long) {
							StatsEngine.getStats("/Custom/"+name).incrementCallCount(((Long)value).intValue()*calls);
						} else if (value instanceof String) {
							StatsEngine.getStats("/Custom/"+name+"/"+value).incrementCallCount(calls);
						} else {						
							reportParserError("Custom metric value no reconocible: "+msg.toString());
						}
					}
					
					if (type.equals("time")) {
						if (value instanceof Double) {
							for (int i = 0; i < calls; i++) {
								StatsEngine.getResponseTimeStats("/Custom/"+name).recordResponseTime(((Double)value).intValue());
							}
						} else if (value instanceof Long) {
							for (int i = 0; i < calls; i++) {
								StatsEngine.getResponseTimeStats("/Custom/"+name).recordResponseTime(((Long)value).intValue());
							}
						} else if (value instanceof String) {
							reportParserError("Custom metric value no reconocible: "+msg.toString());
						}
					}
				}
			}
		} catch (Throwable t) {
			if (debug)
				t.printStackTrace();
			reportParserError(msg.toString(), t);
		}

		procTime.getAndAdd(System.currentTimeMillis() - begin);

	}

	private void reportParserError(String message) {
		reportParserError(message, new Throwable());		
	}

	public void sessionCreated(IoSession session) throws Exception {
		((SocketSessionConfig) session.getConfig() ).setReceiveBufferSize( buffer );
		if (timer == null) {
			synchronized (this) {
				if (timer == null) {
					timer = new Timer("Timer-MonitorHandler", true);
					timer.schedule(new Stats(),30000,30000);
				}
			}
		}
	}

	private static void reportAppError(String logLine, long status, String path, String method, JSONObject timespent) {
		Map<String, Object> errorParams = Maps.newHashMap();
		errorParams.put(RequestDispatcherTracer.REQUEST_PARAMETERS_PARAMETER_NAME, Collections.EMPTY_MAP);
		errorParams.put("Status", (int)status);
		errorParams.put("Method", method);
		errorParams.put("Timespent", timespent.toJSONString());
		errorParams.put("Log Line", logLine);
		Agent.instance().getDefaultRPMService().getErrorService().reportError(new HttpTracedError(path,
				(int)status,"HTTP - " + status,path,errorParams,System.currentTimeMillis()));
	}

	private void reportParserError(String logLine, Throwable t) {
		Map<String, Object> errorParams = Maps.newHashMap();
		errorParams.put(RequestDispatcherTracer.REQUEST_PARAMETERS_PARAMETER_NAME, Collections.EMPTY_MAP);
		errorParams.put("Log Line", logLine);
		Agent.instance().getDefaultRPMService().getErrorService().reportError(new ThrowableError("NodeMonitor",t,
				"NodeMonitor",errorParams,System.currentTimeMillis()));
	}

	public void setDebug(boolean debug) {
		this.debug = debug;	
	}	
	
	public void setFormatDate(String format) {
		sdf = new SimpleDateFormat(format); 
	}	
	

	
	public class Stats extends TimerTask {
		private DecimalFormat dformat = new DecimalFormat("#####.00");
	
		public Stats() {}

		@Override
		public void run() {
			long now = System.currentTimeMillis();
			long time = now - lastexec;
			long op = operations.getAndSet(0);
			long pt = procTime.getAndSet(0);
			float throughputMilis = (float)op/time;

			StringBuilder sb = new StringBuilder();
			sb.append("Throughput: ");
			sb.append(dformat.format(throughputMilis*1000D));
			sb.append(" op/seg, operations: ");
			sb.append(op);
			sb.append(" operations , procTime: ");
			sb.append(pt);
			sb.append(" ms");

			lastexec = now;
			System.out.println(sb.toString());
		}
	}
	
	private void mai() {
		System.out.println(System.currentTimeMillis());
	}
}


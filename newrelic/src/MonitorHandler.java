import java.util.Collections;
import java.util.Map;
import java.util.Set;

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
import com.newrelic.org.json.simple.JSONObject;
import com.newrelic.org.json.simple.parser.JSONParser;

/**
 * Created by: Matias Rege
 */
public class MonitorHandler extends IoHandlerAdapter {
	private static final StatsEngine StatsEngine = Agent.instance().getDefaultRPMService().getStatsEngine();
	private boolean debug;
	
	public void exceptionCaught(IoSession session, Throwable t) throws Exception {
		t.printStackTrace();
		session.close(true);
	}

	public void messageReceived(IoSession session, Object msg) throws Exception {
		try {
			JSONObject json = (JSONObject)new JSONParser().parse(msg.toString());
			
			String path = json.containsKey("path") ? (String)json.get("path") : "-";
			String method = json.containsKey("httpMethod") ? (String)json.get("httpMethod") : "-";
			long status = json.containsKey("httpStatus") ? (Long)json.get("httpStatus") : 999;
			long totaltime = 0;
			
						
			JSONObject timespent = (JSONObject) json.get("timespent");
			
			for (Object key : timespent.keySet()) {
				Object timeObj = timespent.get(key);
				Long time;
				
				if (timeObj instanceof Double) {
					time = (long) (((Double) timeObj)*1000);					
				} else
					time = (Long)timeObj;
				
				totaltime += time;
				
				if ("WEB_TRANSACTION_EXTERNAL_ALL".equals(key)) {
					StatsEngine.getResponseTimeStats(MetricSpec.WEB_TRANSACTION_EXTERNAL_ALL).recordResponseTime(time);
				} if ("URI_WEB_TRANSACTION".equals(key)) {
					StatsEngine.getResponseTimeStats(MetricNames.URI_WEB_TRANSACTION + '/' + path).recordResponseTime(time);					
					StatsEngine.getApdexStats(MetricSpec.lookup(MetricNames.APDEX + "/Uri/" + path)).recordApdexResponseTime(time);
				}
				
							
			}
			
			StatsEngine.getResponseTimeStats(MetricSpec.DISPATCHER).recordResponseTime(totaltime);
		    StatsEngine.getApdexStats(MetricSpec.APDEX).recordApdexResponseTime(totaltime);
		    
		    for (Map.Entry<Object, Object> entry : (Set<Map.Entry<Object, Object>>)timespent.entrySet()) {
			}
		   
			boolean failed = ((status < 200) || (status > 399));
			if (failed) {
				reportAppError(msg.toString(), status, path, method, timespent);
				return;
			}
		} catch (Throwable t) {
			if (debug)
				t.printStackTrace();
			reportParserError(msg.toString(), t);
		}

	}

	public void sessionCreated(IoSession session) throws Exception {
		((SocketSessionConfig) session.getConfig() ).setReceiveBufferSize( 2048 );
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

}


import java.util.Collection;
import java.util.Map;

import com.google.common.collect.ImmutableMultimap;
import com.google.common.collect.Multimap;

public class QueryString {
		private final Multimap<String, String> paramMap;

	    public QueryString(String queryString) {
	        ImmutableMultimap.Builder<String, String> builder = new ImmutableMultimap.Builder<String, String>();

	        if ((queryString != null) && (!queryString.isEmpty())) {
	            String[] nvPairs = queryString.split("&");
	            for (String nvPair : nvPairs) {
	                String key;
	                String value = "";

	                int equalPos = nvPair.indexOf('=');
	                if (equalPos > 1) {
	                    key = nvPair.substring(0, equalPos);
	                    value = nvPair.substring(equalPos + 1);
	                }
	                else {
	                    key = nvPair;
	                }

	                builder.put(key, value);
	            }
	        }

	        paramMap = builder.build();
	    }

	    public Collection<String> getParameters(String name) {
	        return paramMap.get(name);
	    }

	    public String getFirstParameter(String name) {
	        Collection<String> values = paramMap.get(name);
	        return (values.isEmpty() ? null : values.iterator().next());
	    }

	    public Map asMap() {
	        return paramMap.asMap();
	    }

	    @Override
	    public String toString() {
	        final StringBuilder sb = new StringBuilder();
	        sb.append("QueryString");
	        sb.append("{paramMap=").append(paramMap);
	        sb.append('}');
	        return sb.toString();
	    }
	}
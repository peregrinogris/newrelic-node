import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.Charset;

import org.apache.mina.common.ByteBuffer;
import org.apache.mina.common.IoAcceptor;
import org.apache.mina.common.SimpleByteBufferAllocator;
import org.apache.mina.filter.codec.ProtocolCodecFilter;
import org.apache.mina.filter.codec.textline.TextLineCodecFactory;
import org.apache.mina.transport.socket.nio.SocketAcceptor;
import org.apache.mina.transport.socket.nio.SocketAcceptorConfig;

import com.newrelic.agent.MetricNames;
import com.newrelic.agent.MetricSpec;

/**
 * Created by: Matias Rege
 */
public class Monitor implements Runnable {
	private static final int PORT = 9999;
	
	private Monitor() throws IOException {
		ByteBuffer.setUseDirectBuffers(false);
		ByteBuffer.setAllocator(new SimpleByteBufferAllocator());

		IoAcceptor acceptor = new SocketAcceptor();

		SocketAcceptorConfig cfg = new SocketAcceptorConfig();
		cfg.getFilterChain().addLast("codec", new ProtocolCodecFilter(new TextLineCodecFactory(Charset.forName("UTF-8"))));

		acceptor.bind(new InetSocketAddress(PORT), new MonitorHandler(), cfg);
		System.out.println("Server started.");
	}

	public static void main(String[] args) throws IOException {
		System.out.println(MetricSpec.OTHER_TRANSACTION_EXTERNAL_ALL);
		new Monitor().run();
	}

	public void run() {

	}
}


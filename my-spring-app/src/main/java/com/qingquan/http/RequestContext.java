package com.qingquan.http;

import java.net.URI;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public class RequestContext {

    private final URI uri;
    private final String method;
    private final Map<String, String> headers;
    private final byte[] body;

    public RequestContext(URI uri, String method, Map<String, String> headers, byte[] body) {
        this.uri = uri;
        this.method = method;
        this.headers = new LinkedHashMap<>(headers != null ? headers : Map.of());
        this.body = body != null ? body : new byte[0];
    }

    public URI getUri() {
        return uri;
    }

    public String getMethod() {
        return method;
    }

    public Map<String, String> getHeaders() {
        return Collections.unmodifiableMap(headers);
    }

    public byte[] getBody() {
        return body;
    }

    public void setHeader(String name, String value) {
        headers.put(name, value);
    }

    public String getHeader(String name) {
        return headers.get(name);
    }
}

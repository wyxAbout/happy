package com.qingquan.http;

import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class ApiEndpoint {

    private final Map<String, Endpoint> registry = new LinkedHashMap<>();

    public ApiEndpoint register(String name, String method, String path) {
        registry.put(name, new Endpoint(name, method, path));
        return this;
    }

    public Endpoint get(String name) {
        return registry.get(name);
    }

    public Map<String, Endpoint> getAll() {
        return Collections.unmodifiableMap(registry);
    }

    public static class Endpoint {
        private final String name;
        private final String method;
        private final String path;

        Endpoint(String name, String method, String path) {
            this.name = name;
            this.method = method;
            this.path = path;
        }

        public String getName() {
            return name;
        }

        public String getMethod() {
            return method;
        }

        public String getPath() {
            return path;
        }

        @Override
        public String toString() {
            return method + " " + path;
        }
    }
}

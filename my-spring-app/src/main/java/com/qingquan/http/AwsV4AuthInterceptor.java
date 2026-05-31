package com.qingquan.http;

import com.qingquan.util.AwsV4Signer;

import java.util.UUID;
import java.util.function.Supplier;

public class AwsV4AuthInterceptor implements RequestInterceptor {

    private final String appId;
    private final Supplier<String> apiKeySupplier;
    private final String serverName;

    public AwsV4AuthInterceptor(String appId, Supplier<String> apiKeySupplier, String serverName) {
        this.appId = appId;
        this.apiKeySupplier = apiKeySupplier;
        this.serverName = serverName;
    }

    @Override
    public void intercept(RequestContext context) {
        String apiKey = apiKeySupplier.get();
        String nonce = UUID.randomUUID().toString();

        AwsV4Signer.SignedRequest signed = AwsV4Signer.sign(
                appId, apiKey,
                context.getUri(), context.getMethod(),
                nonce, serverName,
                context.getBody()
        );

        for (var entry : signed.getHeaders().entrySet()) {
            context.setHeader(entry.getKey(), entry.getValue());
        }
    }

    @Override
    public int order() {
        return 0;
    }
}

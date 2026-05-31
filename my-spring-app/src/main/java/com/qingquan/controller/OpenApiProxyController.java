package com.qingquan.controller;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Deprecated
public class OpenApiProxyController {

    @Deprecated(forRemoval = true)
    public OpenApiProxyController() {
        log.warn("OpenApiProxyController is deprecated, use OpenApiService for typed API calls");
    }
}

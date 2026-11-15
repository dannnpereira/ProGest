package com.progest.Backend_api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final ErpAuthInterceptor erpAuthInterceptor;

    public WebConfig(ErpAuthInterceptor erpAuthInterceptor) {
        this.erpAuthInterceptor = erpAuthInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(erpAuthInterceptor).addPathPatterns("/api/erp/**");
    }
}

package com.progest.Backend_api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final ErpAuthInterceptor erpAuthInterceptor;
    private final ClienteAuthInterceptor clienteAuthInterceptor;

    public WebConfig(ErpAuthInterceptor erpAuthInterceptor, ClienteAuthInterceptor clienteAuthInterceptor) {
        this.erpAuthInterceptor = erpAuthInterceptor;
        this.clienteAuthInterceptor = clienteAuthInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Painel de gestão: token do usuário do ERP
        registry.addInterceptor(erpAuthInterceptor).addPathPatterns("/api/erp/**");
        // Área do cliente no site (perfil e pedidos): token do cliente
        registry.addInterceptor(clienteAuthInterceptor).addPathPatterns("/api/conta/**");
    }
}

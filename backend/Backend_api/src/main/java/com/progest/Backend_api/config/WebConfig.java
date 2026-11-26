package com.progest.Backend_api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    /** Rotas antigas que exigem login de administrador do ERP */
    public static final String[] ROTAS_ANTIGAS = {
            "/api/financeiro", "/api/financeiro/**",
            "/api/clientes", "/api/clientes/**",
            "/api/pedidos", "/api/pedidos/**",
            "/api/workflow", "/api/workflow/**",
    };

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
        // Rotas antigas (anteriores ao ERP atual): nenhuma tela usa, mas expõem dados de
        // clientes e do financeiro. Ficam só para o administrador logado no ERP.
        registry.addInterceptor(erpAuthInterceptor).addPathPatterns(ROTAS_ANTIGAS);
        // Área do cliente no site (perfil e pedidos): token do cliente
        registry.addInterceptor(clienteAuthInterceptor).addPathPatterns("/api/conta/**");
    }
}

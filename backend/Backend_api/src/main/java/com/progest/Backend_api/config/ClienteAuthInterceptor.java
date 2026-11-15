package com.progest.Backend_api.config;

import com.progest.Backend_api.services.SessaoClienteService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

// Área do cliente do site (/api/conta/**): exige o token da sessão do cliente.
@Component
public class ClienteAuthInterceptor implements HandlerInterceptor {

    public static final String ATRIBUTO_CLIENTE = "clienteLogado";

    private final SessaoClienteService sessoes;

    public ClienteAuthInterceptor(SessaoClienteService sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        var cliente = sessoes.clienteDoToken(ErpAuthInterceptor.tokenDe(request));
        if (cliente.isEmpty()) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\":\"Sessão expirada. Entre novamente.\"}");
            return false;
        }
        request.setAttribute(ATRIBUTO_CLIENTE, cliente.get());
        return true;
    }
}

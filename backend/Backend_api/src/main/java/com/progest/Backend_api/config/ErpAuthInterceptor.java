package com.progest.Backend_api.config;

import com.progest.Backend_api.services.SessaoErpService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

// Barra qualquer chamada para /api/erp/** sem um token de sessao valido.
// Toda rota nova do ERP que ficar debaixo de /api/erp/ ja nasce protegida.
@Component
public class ErpAuthInterceptor implements HandlerInterceptor {

    public static final String ATRIBUTO_USUARIO = "usuarioErp";

    private final SessaoErpService sessoes;

    public ErpAuthInterceptor(SessaoErpService sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        // Pre-flight do navegador (CORS) nao carrega o token
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        var usuario = sessoes.usuarioDoToken(tokenDe(request));
        if (usuario.isEmpty()) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\":\"Sessão expirada. Entre novamente.\"}");
            return false;
        }

        request.setAttribute(ATRIBUTO_USUARIO, usuario.get());
        return true;
    }

    public static String tokenDe(HttpServletRequest request) {
        String cabecalho = request.getHeader("Authorization");
        if (cabecalho != null && cabecalho.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return cabecalho.substring(7).trim();
        }
        return null;
    }
}

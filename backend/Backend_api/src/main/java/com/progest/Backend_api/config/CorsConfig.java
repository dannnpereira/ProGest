package com.progest.Backend_api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

/**
 * Libera a API para sites em outro dominio (ex.: front na Vercel chamando o backend
 * no Render direto). Os dominios vem de CORS_ORIGENS, separados por virgula, e
 * aceitam curinga: https://*.vercel.app
 * Sem CORS_ORIGENS nada e liberado (o padrao seguro).
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] origens;

    public CorsConfig(@Value("${progest.cors.origens:}") String origens) {
        this.origens = Arrays.stream(origens.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (origens.length == 0) {
            return;
        }
        registry.addMapping("/api/**")
                .allowedOriginPatterns(origens)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "Authorization")
                .maxAge(3600);
    }
}

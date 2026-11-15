package com.progest.Backend_api.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// "Health check": o Render (e quem estiver testando) usa para saber se o backend subiu.
@RestController
public class SaudeController {

    @GetMapping("/api/saude")
    public Map<String, String> saude() {
        return Map.of("status", "ok");
    }
}

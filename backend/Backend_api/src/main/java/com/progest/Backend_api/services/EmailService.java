package com.progest.Backend_api.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/**
 * Envio de e-mails do site (hoje só o link de nova senha). Usa, nesta ordem:
 * <ol>
 *   <li><b>API da Brevo</b> (BREVO_API_KEY): envia por HTTPS. É o que funciona no Render gratuito,
 *       que bloqueia as portas de SMTP (25, 465 e 587).</li>
 *   <li><b>SMTP</b> (MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD): no computador ou em
 *       servidores que liberam SMTP (EC2, Render pago).</li>
 *   <li>Nenhum dos dois: nada é enviado. O administrador ainda gera o link pelo ERP.</li>
 * </ol>
 * O remetente é MAIL_FROM (na Brevo, precisa ser um remetente confirmado na conta).
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    private final ObjectProvider<JavaMailSender> mailSender;
    private final RestClient http;
    private final String brevoApiKey;
    private final String host;
    private final String remetente;
    private final String nomeRemetente;
    private final boolean logarLink;

    @Autowired
    public EmailService(ObjectProvider<JavaMailSender> mailSender,
                        @Value("${progest.email.brevo-api-key:}") String brevoApiKey,
                        @Value("${spring.mail.host:}") String host,
                        @Value("${progest.email.remetente:}") String remetente,
                        @Value("${progest.email.remetente-nome:Amaral Alambrados}") String nomeRemetente,
                        @Value("${progest.senha.logar-link:false}") boolean logarLink) {
        this(mailSender, RestClient.builder(), brevoApiKey, host, remetente, nomeRemetente, logarLink);
    }

    /** Para os testes: recebe o RestClient.Builder (que pode ser ligado a um servidor de mentira). */
    EmailService(ObjectProvider<JavaMailSender> mailSender, RestClient.Builder http,
                 String brevoApiKey, String host, String remetente, String nomeRemetente, boolean logarLink) {
        this.mailSender = mailSender;
        this.http = http.build();
        this.brevoApiKey = brevoApiKey == null ? "" : brevoApiKey.trim();
        this.host = host == null ? "" : host.trim();
        this.remetente = remetente == null ? "" : remetente.trim();
        this.nomeRemetente = nomeRemetente == null || nomeRemetente.isBlank() ? "Amaral Alambrados" : nomeRemetente.trim();
        this.logarLink = logarLink;
    }

    public boolean usaBrevo() {
        return !brevoApiKey.isEmpty() && !remetente.isEmpty();
    }

    public boolean usaSmtp() {
        return !host.isEmpty() && mailSender.getIfAvailable() != null;
    }

    public boolean configurado() {
        return usaBrevo() || usaSmtp();
    }

    /** Manda o link de nova senha. Falhas só vão para o log: a resposta ao site é sempre a mesma. */
    public void enviarLinkDeSenha(String para, String nome, String link, long minutos) {
        String assunto = "Amaral Alambrados: crie uma nova senha";
        String texto = """
                Olá, %s.

                Recebemos um pedido para criar uma nova senha na sua conta do site da Amaral Alambrados.
                Para continuar, abra o link abaixo (ele vale por %d minutos e só pode ser usado uma vez):

                %s

                Se não foi você, ignore este e-mail: sua senha atual continua valendo.

                Amaral Alambrados
                (15) 3231-4537
                """.formatted(primeiroNome(nome), minutos, link);

        if (usaBrevo()) {
            enviarPelaBrevo(para, nome, assunto, texto);
        } else if (usaSmtp()) {
            enviarPorSmtp(para, assunto, texto);
        } else if (logarLink) {
            log.info("E-mail não configurado. Link de nova senha para {}: {}", para, link);
        } else {
            if (!brevoApiKey.isEmpty()) {
                log.warn("BREVO_API_KEY definida, mas falta MAIL_FROM (remetente confirmado na Brevo): e-mail não enviado.");
            } else {
                log.warn("E-mail não configurado (BREVO_API_KEY ou MAIL_HOST): e-mail de nova senha não enviado.");
            }
        }
    }

    private void enviarPelaBrevo(String para, String nome, String assunto, String texto) {
        Map<String, Object> corpo = Map.of(
                "sender", Map.of("name", nomeRemetente, "email", remetente),
                "to", List.of(nome == null || nome.isBlank() ? Map.of("email", para) : Map.of("email", para, "name", nome)),
                "replyTo", Map.of("email", remetente, "name", nomeRemetente),
                "subject", assunto,
                "textContent", texto);
        try {
            http.post()
                    .uri(BREVO_URL)
                    .header("api-key", brevoApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(corpo)
                    .retrieve()
                    .toBodilessEntity();
            log.info("E-mail de nova senha enviado pela Brevo.");
        } catch (RestClientException e) {
            log.error("Falha ao enviar o e-mail de nova senha pela Brevo: {}", e.getMessage());
        }
    }

    private void enviarPorSmtp(String para, String assunto, String texto) {
        SimpleMailMessage msg = new SimpleMailMessage();
        if (!remetente.isEmpty()) {
            msg.setFrom(remetente);
        }
        msg.setTo(para);
        msg.setSubject(assunto);
        msg.setText(texto);
        try {
            mailSender.getObject().send(msg);
            log.info("E-mail de nova senha enviado por SMTP.");
        } catch (MailException e) {
            log.error("Falha ao enviar o e-mail de nova senha por SMTP: {}", e.getMessage());
        }
    }

    private static String primeiroNome(String nome) {
        if (nome == null || nome.isBlank()) {
            return "cliente";
        }
        return nome.trim().split("\\s+")[0];
    }
}

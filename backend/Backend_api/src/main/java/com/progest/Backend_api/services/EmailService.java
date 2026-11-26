package com.progest.Backend_api.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Envio de e-mails do site (hoje só o link de nova senha).
 * O SMTP vem das variáveis MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD e MAIL_FROM.
 * Sem MAIL_HOST nada é enviado: o administrador ainda pode gerar o link pelo ERP.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String host;
    private final String remetente;
    private final boolean logarLink;

    public EmailService(ObjectProvider<JavaMailSender> mailSender,
                        @Value("${spring.mail.host:}") String host,
                        @Value("${progest.email.remetente:}") String remetente,
                        @Value("${progest.senha.logar-link:false}") boolean logarLink) {
        this.mailSender = mailSender;
        this.host = host;
        this.remetente = remetente;
        this.logarLink = logarLink;
    }

    public boolean configurado() {
        return !host.isBlank() && mailSender.getIfAvailable() != null;
    }

    /** Manda o link de nova senha. Falhas só vão para o log: a resposta ao site é sempre a mesma. */
    public void enviarLinkDeSenha(String para, String nome, String link, long minutos) {
        if (!configurado()) {
            if (logarLink) {
                log.info("SMTP não configurado. Link de nova senha para {}: {}", para, link);
            } else {
                log.warn("SMTP não configurado (MAIL_HOST): e-mail de nova senha não enviado.");
            }
            return;
        }
        SimpleMailMessage msg = new SimpleMailMessage();
        if (!remetente.isBlank()) {
            msg.setFrom(remetente);
        }
        msg.setTo(para);
        msg.setSubject("Amaral Alambrados: crie uma nova senha");
        msg.setText("""
                Olá, %s.

                Recebemos um pedido para criar uma nova senha na sua conta do site da Amaral Alambrados.
                Para continuar, abra o link abaixo (ele vale por %d minutos e só pode ser usado uma vez):

                %s

                Se não foi você, ignore este e-mail: sua senha atual continua valendo.

                Amaral Alambrados
                (15) 3231-4537
                """.formatted(primeiroNome(nome), minutos, link));
        try {
            mailSender.getObject().send(msg);
        } catch (MailException e) {
            log.error("Falha ao enviar o e-mail de nova senha: {}", e.getMessage());
        }
    }

    private static String primeiroNome(String nome) {
        if (nome == null || nome.isBlank()) {
            return "cliente";
        }
        return nome.trim().split("\\s+")[0];
    }
}

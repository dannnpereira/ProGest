package com.progest.Backend_api.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

// Envio do e-mail de nova senha: API da Brevo (Render gratuito bloqueia SMTP), SMTP ou nada
class EmailServiceTests {

    private static final String LINK = "https://site.teste/redefinir-senha?token=abc";

    private RestClient.Builder builder;
    private MockRestServiceServer brevo;
    private JavaMailSender smtp;
    private ObjectProvider<JavaMailSender> provedorSmtp;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void preparar() {
        builder = RestClient.builder();
        brevo = MockRestServiceServer.bindTo(builder).build();
        smtp = mock(JavaMailSender.class);
        provedorSmtp = mock(ObjectProvider.class);
        when(provedorSmtp.getIfAvailable()).thenReturn(smtp);
        when(provedorSmtp.getObject()).thenReturn(smtp);
    }

    private EmailService servico(String chaveBrevo, String hostSmtp, String remetente) {
        return new EmailService(provedorSmtp, builder, chaveBrevo, hostSmtp, remetente, "Amaral Alambrados", false);
    }

    @Test
    void comChaveDaBrevoEnviaPelaApiHttps() {
        brevo.expect(requestTo(EmailService.BREVO_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("api-key", "chave-123"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.sender.email").value("amaral@gmail.com"))
                .andExpect(jsonPath("$.sender.name").value("Amaral Alambrados"))
                .andExpect(jsonPath("$.to[0].email").value("maria@teste.com"))
                .andExpect(jsonPath("$.to[0].name").value("Maria Teste"))
                .andExpect(jsonPath("$.subject").value("Amaral Alambrados: crie uma nova senha"))
                .andExpect(jsonPath("$.textContent", containsString(LINK)))
                .andExpect(jsonPath("$.textContent", containsString("Olá, Maria.")))
                .andExpect(jsonPath("$.textContent", containsString("30 minutos")))
                .andRespond(withSuccess("{\"messageId\":\"<1@brevo>\"}", MediaType.APPLICATION_JSON));

        servico("chave-123", "", "amaral@gmail.com").enviarLinkDeSenha("maria@teste.com", "Maria Teste", LINK, 30);

        brevo.verify();
    }

    @Test
    void brevoTemPrioridadeSobreOSmtp() {
        brevo.expect(requestTo(EmailService.BREVO_URL)).andRespond(withSuccess());

        EmailService s = servico("chave-123", "smtp.gmail.com", "amaral@gmail.com");
        assertTrue(s.usaBrevo());
        s.enviarLinkDeSenha("maria@teste.com", "Maria", LINK, 30);

        brevo.verify();
        verify(smtp, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void erroDaBrevoNaoDerrubaOPedido() {
        brevo.expect(requestTo(EmailService.BREVO_URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertDoesNotThrow(() -> servico("chave-errada", "", "amaral@gmail.com")
                .enviarLinkDeSenha("maria@teste.com", "Maria", LINK, 30));
        brevo.verify();
    }

    @Test
    void semRemetenteABrevoNaoEUsada() {
        EmailService s = servico("chave-123", "", "");
        assertFalse(s.usaBrevo());
        assertFalse(s.configurado());

        s.enviarLinkDeSenha("maria@teste.com", "Maria", LINK, 30);
        brevo.verify(); // nenhuma chamada esperada
    }

    @Test
    void semBrevoUsaOSmtp() {
        EmailService s = servico("", "smtp.gmail.com", "amaral@gmail.com");
        assertFalse(s.usaBrevo());
        assertTrue(s.usaSmtp());

        s.enviarLinkDeSenha("maria@teste.com", "Maria Teste", LINK, 30);

        ArgumentCaptor<SimpleMailMessage> msg = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(smtp).send(msg.capture());
        assertArrayEquals(new String[] {"maria@teste.com"}, msg.getValue().getTo());
        assertEquals("amaral@gmail.com", msg.getValue().getFrom());
        assertTrue(msg.getValue().getText().contains(LINK));
    }

    @Test
    void semNadaConfiguradoNaoEnviaNada() {
        EmailService s = servico("", "", "");
        assertFalse(s.configurado());

        s.enviarLinkDeSenha("maria@teste.com", "Maria", LINK, 30);

        brevo.verify();
        verify(smtp, never()).send(any(SimpleMailMessage.class));
    }
}

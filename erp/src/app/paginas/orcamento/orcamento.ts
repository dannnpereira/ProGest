import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { Icone } from '../../shared/icone';
import { Orcamento as ValoresOrcamento, PedidoOrcamento, ProdutosService } from '../../core/produtos.service';
import { ClienteErp, ClientesService, LinkSenha, mensagemDeErro } from '../../core/clientes.service';
import { AvisosService } from '../../core/avisos.service';
import { SessaoService } from '../../core/sessao.service';
import { Categoria, Produto } from '../../core/modelos';
import {
  cpfValido, emailValido, mascaraCep, mascaraCpf, mascaraTelefone, somenteDigitos, telefoneValido,
} from '../../core/documentos';
import { abrirPdfOrcamento } from '../../core/orcamento-pdf';
import { doisDigitos, isoDia, moeda, num } from '../../core/formato';

/** cpf: puxa um cliente já cadastrado; novo: cria a conta dele; avulso: só o orçamento */
type ModoCliente = 'cpf' | 'novo' | 'avulso';

const VALIDADE_DIAS = 7;

interface EnderecoViaCep {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

@Component({
  selector: 'app-orcamento',
  imports: [Icone],
  templateUrl: './orcamento.html',
  styleUrl: './orcamento.css',
})
export class Orcamento {
  protected svc = inject(ProdutosService);
  private clientesSvc = inject(ClientesService);
  private avisos = inject(AvisosService);
  private sessao = inject(SessaoService);
  private http = inject(HttpClient);

  protected readonly moeda = moeda;
  protected readonly num = num;
  protected readonly mascaraCpf = mascaraCpf;
  protected readonly mascaraTelefone = mascaraTelefone;
  protected readonly mascaraCepFn = mascaraCep;

  // ---------- 1. Cliente ----------
  protected modo = signal<ModoCliente>('cpf');
  protected cliente = signal<ClienteErp | null>(null);

  // Buscar por CPF
  protected bCpf = signal('');
  protected buscando = signal(false);
  protected erroBusca = signal('');
  /** CPF buscado que não tem cadastro (oferece criar a conta) */
  protected naoEncontrado = signal('');

  // Nova conta (mesmos campos do cadastro do site)
  protected nNome = signal('');
  protected nCpf = signal('');
  protected nTelefone = signal('');
  protected nEmail = signal('');
  protected nSenha = signal('');
  protected verSenha = signal(false);
  protected tentouCriar = signal(false);
  protected criando = signal(false);
  protected erroConta = signal('');

  // Link de nova senha (cliente esqueceu a senha do site)
  protected linkSenha = signal<LinkSenha | null>(null);
  protected gerandoLink = signal(false);
  protected erroLink = signal('');

  protected erros = computed(() => ({
    nome: this.nNome().trim().length < 3,
    cpf: !cpfValido(this.nCpf()),
    telefone: !telefoneValido(this.nTelefone()),
    email: !emailValido(this.nEmail()),
    senha: this.nSenha().length < 8 || this.nSenha().length > 72,
  }));
  protected contaInvalida = computed(() => Object.values(this.erros()).some(Boolean));

  // ---------- 2. Especificação (mesmas opções do configurador do site) ----------
  private daCategoria(c: Categoria, chaves: Set<string | undefined>): Produto[] {
    return this.svc.ativos().filter(p => p.categoria === c && chaves.has(p.chave));
  }
  protected arames = computed(() => this.daCategoria('ARAME', new Set(this.svc.telasNoSite().map(t => t.arame))));
  protected malhas = computed(() => this.daCategoria('MALHA', new Set(
    this.svc.telasNoSite().filter(t => t.arame === this.arame()).map(t => t.malha ?? undefined))));
  protected tratamentos = computed(() => this.daCategoria('TRATAMENTO', new Set(
    this.svc.telasNoSite().filter(t => t.arame === this.arame() && t.malha === this.malha()).map(t => t.tratamento))));

  protected arame = linkedSignal<Produto[], string>({
    source: () => this.arames(), computation: (l, antes) => manterOuPrimeira(l, antes?.value),
  });
  protected malha = linkedSignal<Produto[], string>({
    source: () => this.malhas(), computation: (l, antes) => manterOuPrimeira(l, antes?.value),
  });
  protected tratamento = linkedSignal<Produto[], string>({
    source: () => this.tratamentos(), computation: (l, antes) => manterOuPrimeira(l, antes?.value),
  });
  protected comprimento = signal(50);
  protected altura = signal(2);

  // ---------- 3. Entrega ----------
  protected entrega = signal(false);
  protected cep = signal('');
  protected numero = signal('');
  protected complemento = signal('');
  protected endereco = signal<EnderecoViaCep | null>(null);
  protected erroCep = signal('');
  protected cepCompleto = computed(() => somenteDigitos(this.cep()).length === 8);

  // ---------- Valores (calculados pela API, iguais ao site) ----------
  protected valores = signal<ValoresOrcamento | null>(null);
  protected erroValores = signal('');
  protected calculando = signal(true);

  private pedido = computed<PedidoOrcamento | null>(() => {
    // Recalcula se a tabela de preços chegar/mudar
    this.svc.precos();
    this.svc.regras();
    if (!this.arame() || !this.malha() || !this.tratamento()) return null;
    return {
      arame: this.arame(), malha: this.malha(), tratamento: this.tratamento(),
      alturaM: this.altura() || 0, comprimentoM: this.comprimento() || 0,
      entrega: this.entrega(),
      cep: this.entrega() && this.cepCompleto() ? somenteDigitos(this.cep()) : null,
    };
  });

  /** O que ainda falta para salvar o PDF (vazio = pode salvar) */
  protected pendencia = computed(() => {
    if (this.modo() === 'cpf' && !this.cliente()) return 'Busque o cliente pelo CPF ou escolha "Sem cadastro".';
    if (this.modo() === 'novo' && !this.cliente()) return 'Crie a conta do cliente ou escolha "Sem cadastro".';
    if (this.entrega() && !this.cepCompleto()) return 'Informe o CEP da obra para calcular o frete.';
    if (!this.valores()) return this.erroValores() || 'Aguarde o cálculo dos valores.';
    return '';
  });

  protected nomeProduto = (chave: string) => this.svc.produtos().find(p => p.chave === chave)?.nome ?? chave;

  constructor() {
    toObservable(this.pedido).pipe(
      debounceTime(300),
      switchMap(pedido => {
        if (!pedido) return of({ o: null, erro: 'Nenhuma tela disponível na tabela de preços.' });
        this.calculando.set(true);
        return this.svc.orcar(pedido).pipe(
          map(o => ({ o, erro: '' })),
          catchError((e: HttpErrorResponse) => of({
            o: null,
            erro: e.status === 400 ? (e.error?.message ?? 'Confira altura e comprimento.')
              : e.status === 422 ? 'Esta combinação não tem preço na tabela (ou um produto está inativo).'
              : 'Não foi possível calcular agora. Tente de novo.',
          })),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe(({ o, erro }) => {
      this.valores.set(o);
      this.erroValores.set(erro);
      this.calculando.set(false);
    });

    // Endereço pelo CEP (ViaCEP), só para mostrar e sair no PDF; o frete vem da API
    toObservable(this.cep).pipe(
      map(c => somenteDigitos(c)),
      debounceTime(300),
      switchMap(c => {
        if (c.length !== 8) return of(null);
        return this.http.get<EnderecoViaCep>(`https://viacep.com.br/ws/${c}/json/`).pipe(
          catchError(() => of({ erro: 'falha' } as EnderecoViaCep)),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe(e => {
      this.endereco.set(e && !e.erro ? e : null);
      this.erroCep.set(!e ? '' : e.erro === 'falha'
        ? 'Não foi possível buscar o endereço agora. O frete continua sendo calculado.'
        : e.erro ? 'CEP não encontrado. Confira o número.' : '');
    });
  }

  // ---------- Ações do cliente ----------

  trocarModo(m: ModoCliente): void {
    this.modo.set(m);
    this.cliente.set(null);
    this.limparLinkSenha();
    this.erroBusca.set('');
    this.erroConta.set('');
  }

  async buscar(): Promise<void> {
    this.erroBusca.set('');
    this.naoEncontrado.set('');
    if (!cpfValido(this.bCpf())) {
      this.erroBusca.set('CPF inválido. Confira os números.');
      return;
    }
    this.buscando.set(true);
    try {
      const c = await this.clientesSvc.buscarPorCpf(this.bCpf());
      if (c) this.cliente.set(c);
      else this.naoEncontrado.set(this.bCpf());
    } catch (e) {
      this.erroBusca.set(mensagemDeErro(e, 'Não foi possível buscar o cliente agora.'));
    } finally {
      this.buscando.set(false);
    }
  }

  /** CPF sem cadastro: abre "Novo cliente" já com o CPF preenchido */
  criarParaCpf(): void {
    const cpf = this.naoEncontrado();
    this.trocarModo('novo');
    this.nCpf.set(cpf);
    this.naoEncontrado.set('');
  }

  /** Cliente encontrado sem conta (só fez pedido): leva os dados para criar a senha */
  criarContaParaEncontrado(): void {
    const c = this.cliente();
    if (!c) return;
    this.trocarModo('novo');
    this.nNome.set(c.nome);
    this.nCpf.set(mascaraCpf(c.cpf));
    this.nTelefone.set(c.telefone ? mascaraTelefone(c.telefone) : '');
    this.nEmail.set(c.email ?? '');
  }

  async criarConta(): Promise<void> {
    this.tentouCriar.set(true);
    this.erroConta.set('');
    if (this.contaInvalida()) return;
    this.criando.set(true);
    try {
      const c = await this.clientesSvc.cadastrar({
        nome: this.nNome(), cpf: this.nCpf(), telefone: this.nTelefone(),
        email: this.nEmail(), senha: this.nSenha(),
      });
      this.cliente.set(c);
      this.nSenha.set(''); // não fica guardada na tela
      this.tentouCriar.set(false);
      this.avisos.mostrar({ texto: `Conta criada. ${c.nome} já pode entrar no site com o e-mail e a senha.` });
    } catch (e) {
      this.erroConta.set(mensagemDeErro(e, 'Não foi possível criar a conta agora.'));
    } finally {
      this.criando.set(false);
    }
  }

  private limparLinkSenha(): void {
    this.linkSenha.set(null);
    this.erroLink.set('');
  }

  /** Cliente esqueceu a senha do site: gera o link para mandar a ele */
  async gerarLinkSenha(): Promise<void> {
    const c = this.cliente();
    if (!c?.temConta || this.gerandoLink()) return;
    this.erroLink.set('');
    this.gerandoLink.set(true);
    try {
      this.linkSenha.set(await this.clientesSvc.gerarLinkSenha(c.id));
    } catch (e) {
      this.erroLink.set(mensagemDeErro(e, 'Não foi possível gerar o link agora.'));
    } finally {
      this.gerandoLink.set(false);
    }
  }

  async copiarLinkSenha(): Promise<void> {
    const l = this.linkSenha();
    if (!l) return;
    try {
      await navigator.clipboard.writeText(l.link);
      this.avisos.mostrar({ texto: 'Link copiado. Mande para o cliente; ele vale por 24 horas e só pode ser usado uma vez.' });
    } catch {
      this.erroLink.set('Não foi possível copiar. Selecione o link e copie com Ctrl+C.');
    }
  }

  /** "27/11/2026 às 14:30" no horário do navegador */
  protected dataHora(iso: string): string {
    const d = new Date(iso);
    const dia = d.toLocaleDateString('pt-BR');
    const h = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dia} às ${h}`;
  }

  /** WhatsApp do cliente com o link pronto na mensagem */
  whatsappLinkSenha(): string | null {
    const c = this.cliente();
    const l = this.linkSenha();
    const fone = c?.telefone?.replace(/\D/g, '');
    if (!c || !l || !fone) return null;
    const nome = c.nome.trim().split(/\s+/)[0];
    const msg = `Olá, ${nome}! Aqui é da Amaral Alambrados. Para criar uma nova senha no nosso site, `
      + `abra este link (vale por 24 horas e só pode ser usado uma vez): ${l.link}`;
    return `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`;
  }

  /** Volta para escolher outro cliente, no mesmo modo */
  trocarCliente(): void {
    this.cliente.set(null);
    this.limparLinkSenha();
    if (this.modo() === 'novo') {
      for (const s of [this.nNome, this.nCpf, this.nTelefone, this.nEmail, this.nSenha]) s.set('');
    }
  }

  // ---------- PDF ----------

  salvarPdf(): void {
    const v = this.valores();
    if (this.pendencia() || !v) return;
    const c = this.modo() === 'avulso' ? null : this.cliente();
    const e = this.endereco();
    const ok = abrirPdfOrcamento({
      numero: novoNumero(),
      emitidoEm: new Date(),
      validadeDias: VALIDADE_DIAS,
      emitidoPor: this.sessao.usuario()?.nome ?? 'Administrador',
      cliente: c ? { nome: c.nome, cpf: c.cpf, telefone: c.telefone, email: c.email } : null,
      arame: this.nomeProduto(this.arame()),
      malha: this.nomeProduto(this.malha()),
      tratamento: this.nomeProduto(this.tratamento()),
      alturaM: this.altura(),
      comprimentoM: this.comprimento(),
      entrega: this.entrega()
        ? { cep: mascaraCep(this.cep()), endereco: e ? this.textoEndereco(e) : null }
        : null,
      valores: v,
    });
    if (!ok) this.avisos.mostrar({ texto: 'O navegador bloqueou a janela do PDF. Permita pop-ups para este site.' });
  }

  protected textoEndereco(e: EnderecoViaCep): string {
    const rua = [e.logradouro, this.numero().trim() && `nº ${this.numero().trim()}`, this.complemento().trim()]
      .filter(Boolean).join(', ');
    const cidade = [e.bairro, e.localidade && `${e.localidade}/${e.uf}`].filter(Boolean).join(' - ');
    return [rua, cidade].filter(Boolean).join(' - ');
  }

  // ---------- Entradas ----------

  texto(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  numeroDe(e: Event): number {
    return parseFloat(this.texto(e).replace(',', '.'));
  }

  /** Aplica a máscara no campo e devolve o valor mascarado */
  mascarar(e: Event, fn: (v: string) => string): string {
    const input = e.target as HTMLInputElement;
    input.value = fn(input.value);
    return input.value;
  }
}

function manterOuPrimeira(lista: Produto[], escolhida: string | undefined): string {
  return lista.some(p => p.chave === escolhida) ? escolhida! : lista[0]?.chave ?? '';
}

/** ORC-20261119-4821 */
function novoNumero(): string {
  const rand = doisDigitos(Math.floor(Math.random() * 100)) + doisDigitos(Math.floor(Math.random() * 100));
  return `ORC-${isoDia().replace(/-/g, '')}-${rand}`;
}

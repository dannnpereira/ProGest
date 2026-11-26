// Dados de exemplo baseados na prototipação (Telas 3 a 6).
// Os horários são gerados em relação a "agora" para a tela parecer viva na apresentação.
// Pedidos e produtos já vêm da API; aqui ficam só os valores padrão de produtos.

import { Produto, RegrasOrcamento } from './modelos';

export const PRODUTOS_EXEMPLO = (): Produto[] => [
  { id: 1, categoria: 'ARAME', nome: 'Fio 12 (2,77 mm)', descricao: 'BWG 12 • Alta resistência', unidade: 'M2', valor: 18, ativo: true, chave: 'FIO_12' },
  { id: 2, categoria: 'ARAME', nome: 'Fio 14 (2,10 mm)', descricao: 'BWG 14 • Padrão comercial', unidade: 'M2', valor: 14, ativo: true, chave: 'FIO_14' },
  { id: 3, categoria: 'MALHA', nome: 'Malha 2" (50 mm)', descricao: 'Losangular padrão quadra', unidade: 'M2', valor: 0, ativo: true, chave: 'MALHA_2' },
  { id: 4, categoria: 'MALHA', nome: 'Malha 3" (75 mm)', descricao: 'Losangular abertura larga', unidade: 'M2', valor: 0, ativo: true, chave: 'MALHA_3' },
  { id: 5, categoria: 'TRATAMENTO', nome: 'Galvanizada a fogo', descricao: 'Zinco pesado NBR 6331', unidade: 'M2', valor: 0, ativo: true, chave: 'GALVANIZADA' },
  { id: 6, categoria: 'TRATAMENTO', nome: 'Revestida em PVC', descricao: 'Proteção ultravioleta verde/azul/cinza', unidade: 'M2', valor: 4, ativo: true, chave: 'PVC' },
  { id: 7, categoria: 'ACESSORIOS', nome: 'Acessórios de fixação (mourões e fixadores)', descricao: 'Kit catracas, parafusos e grampos', unidade: 'METRO_LINEAR', valor: 3.5, ativo: true, chave: 'ACESSORIOS' },
];

export const REGRAS_EXEMPLO = (): RegrasOrcamento => ({ descontoAVistaPct: 5, parcelasMax: 10 });

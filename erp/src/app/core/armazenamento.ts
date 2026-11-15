// Guarda o estado do ERP no navegador para a demonstração não perder o que foi feito
// ao recarregar a página. Quando as telas passarem a usar a API, isto deixa de ser usado.
const PREFIXO = 'progest-erp:';

export function ler<T>(chave: string, padrao: () => T): T {
  try {
    const bruto = localStorage.getItem(PREFIXO + chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao();
  } catch {
    return padrao();
  }
}

export function gravar<T>(chave: string, valor: T): void {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    // armazenamento indisponível: segue só em memória
  }
}

export function limparTudo(): void {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIXO))
      .forEach(k => localStorage.removeItem(k));
  } catch {
    // nada a fazer
  }
}

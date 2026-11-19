// CPF, telefone e e-mail com as mesmas regras do cadastro do site (tela de login).

export const somenteDigitos = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '');

export function cpfValido(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += +cpf[i] * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === +cpf[9] && digito(10) === +cpf[10];
}

/** 52998224725 -> 529.982.247-25 (aceita parcial, para usar enquanto digita) */
export function mascaraCpf(valor: string): string {
  return somenteDigitos(valor).slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** 15999990000 -> (15) 99999-0000 (aceita parcial) */
export function mascaraTelefone(valor: string): string {
  let v = somenteDigitos(valor).slice(0, 11);
  if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  else if (v.length > 2) v = v.replace(/(\d{2})(\d*)/, '($1) $2');
  return v;
}

export const telefoneValido = (v: string) => /^\(\d{2}\) \d{4,5}-\d{4}$/.test(v.trim());

// Mesmo formato aceito pela API (algo@dominio.ext, com acentos e "+")
export const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** 18090390 -> 18090-390 (aceita parcial) */
export function mascaraCep(valor: string): string {
  return somenteDigitos(valor).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

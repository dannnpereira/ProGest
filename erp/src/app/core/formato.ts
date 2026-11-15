const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR');
const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export const moeda = (v: number) => brl.format(v);
export const num = (v: number, casas = 0) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v);
export const inteiro = (v: number) => numero.format(v);
export const moedaCompacta = (v: number) => 'R$ ' + compacto.format(v);
export const doisDigitos = (v: number) => String(v).padStart(2, '0');

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
  'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** "2026-10" -> "Outubro/2026" */
export function nomeMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[m - 1]}/${a}`;
}

/** "2026-10" -> "OUT" */
export function mesCurto(mes: string): string {
  const m = Number(mes.split('-')[1]);
  return MESES[m - 1].slice(0, 3).toUpperCase();
}

/** yyyy-mm-dd -> dd/mm/aaaa */
export function data(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** yyyy-mm-dd -> dd/mm */
export function diaMes(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}`;
}

export function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** "há 28 min", "há 1h 05min", "há 2 dias" */
export function haQuanto(iso: string, agora = Date.now()): string {
  const min = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60000));
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h ${doisDigitos(min % 60)}min`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
}

export function mesmoDia(a: string | Date, b: string | Date = new Date()): boolean {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** Data local no formato yyyy-mm-dd */
export function isoDia(d = new Date()): string {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

export function isoMes(d = new Date()): string {
  return isoDia(d).slice(0, 7);
}

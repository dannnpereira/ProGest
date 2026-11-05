import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FreteService {
  private cepOrigem = '18090390'; // Fábrica em Sorocaba

  // Calcula o frete de forma dinâmica e proporcional à distância do caminho mais rápido
  calcularFretePorCep(cepDestino: string): Observable<any> {
    const distanciaKm = this.obterDistanciaRotaMaisRapida(cepDestino);
    
    // 1. Combustível proporcional aos quilómetros reais da rota
    const custoCombustivel = distanciaKm * 1.45; 
    
    // 2. Pedágio proporcional e dinâmico:
    // Cidades locais/vizinhanças (< 25 km) não passam por autoestradas com portagens.
    // Para distâncias superiores, o valor escala proporcionalmente ao percurso em rodovia.
    let pedagios = 0.00;
    if (distanciaKm > 25) {
      pedagios = distanciaKm * 0.75; // Fator proporcional por km rodado em vias concessionadas
    }

    // 3. Taxa base de logística e manuseamento
    const taxaBase = 50.00;
    const custoTotal = custoCombustivel + pedagios + taxaBase;

    return of({
      distanciaKm,
      custoCombustivel: Number(custoCombustivel.toFixed(2)),
      pedagios: Number(pedagios.toFixed(2)),
      custoTotal: Number(custoTotal.toFixed(2))
    });
  }

  // Simula a consulta à API de roteamento para encontrar o caminho mais rápido
  private obterDistanciaRotaMaisRapida(cep: string): number {
    const cepLimpo = cep.replace(/\D/g, '');
    const prefixo = parseInt(cepLimpo.substring(0, 3));

    // Simulação inteligente baseada nas faixas de CEP da região de Sorocaba e arredores:
    if (prefixo === 180) {
      return 10; // Percursos urbanos em Sorocaba (sem portagem)
    } else if (prefixo === 181) {
      return 22; // Cidades vizinhas próximas (ex: Votorantim / Araçoiaba - sem portagem relevante)
    } else if (prefixo === 182) {
      return 48; // Itapetininga (rota com ajuste proporcional de portagem)
    } else if (prefixo === 133) {
      return 60; // Região de Itu / Salto
    }
    
    // Distância padrão para destinos mais distantes no estado
    return 95; 
  }
}
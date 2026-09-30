import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FreteService {

  // Dados base para o cálculo (você pode ajustar conforme os valores reais)
  private readonly precoLitroGasolina = 5.80; // R$ por litro
  private readonly consumoKmPorLitro = 8;     // Caminhão/Veículo faz 8 km/L
  private readonly custoPedagioPor100Km = 45.00; // Média de pedágios

  constructor() { }

  /**
   * Calcula o custo de frete com base na distância em quilômetros
   * @param distanciaKm Distância de ida e volta ou apenas ida
   */
  calcularFrete(distanciaKm: number) {
    if (!distanciaKm || distanciaKm <= 0) {
      return { custoTotal: 0, litrosConsumidos: 0, custoCombustivel: 0, pedagios: 0 };
    }

    // Litros gastos na viagem (considerando ida e volta)
    const distanciaTotal = distanciaKm * 2;
    const litrosConsumidos = distanciaTotal / this.consumoKmPorLitro;
    const custoCombustivel = litrosConsumidos * this.precoLitroGasolina;

    // Estimativa de pedágios proporcional à distância
    const pedagios = (distanciaTotal / 100) * this.custoPedagioPor100Km;

    // Custo total do frete técnico
    const custoTotal = custoCombustivel + pedagios;

    return {
      custoTotal: Number(custoTotal.toFixed(2)),
      litrosConsumidos: Number(litrosConsumidos.toFixed(2)),
      custoCombustivel: Number(custoCombustivel.toFixed(2)),
      pedagios: Number(pedagios.toFixed(2))
    };
  }
}
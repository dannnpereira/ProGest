import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FreteService {
  private readonly precoLitroGasolina = 5.80; 
  private readonly consumoKmPorLitro = 8;     
  private readonly pedagioPor100Km = 45.00; 

  constructor() { }

  /**
   * Calcula o frete com base na distância real em quilômetros obtida do Google Maps
   */
  calcularFreteComDistancia(distanciaKm: number) {
    if (!distanciaKm || distanciaKm <= 0) {
      return { custoTotal: 0, litrosConsumidos: 0, custoCombustivel: 0, pedagios: 0, distanciaKm: 0 };
    }

    // Considera ida e volta para a entrega técnica da fábrica
    const distanciaTotal = distanciaKm * 2;
    const litrosConsumidos = distanciaTotal / this.consumoKmPorLitro;
    const custoCombustivel = litrosConsumidos * this.precoLitroGasolina;
    const pedagios = (distanciaTotal / 100) * this.pedagioPor100Km;
    const custoTotal = custoCombustivel + pedagios;

    return {
      custoTotal: Number(custoTotal.toFixed(2)),
      litrosConsumidos: Number(litrosConsumidos.toFixed(2)),
      custoCombustivel: Number(custoCombustivel.toFixed(2)),
      pedagios: Number(pedagios.toFixed(2)),
      distanciaKm: Number(distanciaKm.toFixed(1))
    };
  
  }

}


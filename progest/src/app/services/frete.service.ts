import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FreteService {
  private readonly precoLitroGasolina = 5.80; 
  private readonly consumoKmPorLitro = 8;     
  private readonly pedagioPor100Km = 45.00; 

  // Chave de API do Google Maps (Pode inserir a sua chave real aqui ou testar com o fallback)
  private readonly googleApiKey = 'SUA_GOOGLE_MAPS_API_KEY';
  private readonly origemFabrica = 'Sorocaba, SP';

  constructor(private http: HttpClient) { }

  /**
   * Consulta a distância real entre a fábrica e o destino utilizando a Distance Matrix API do Google
   */
  calcularDistanciaGoogleMaps(destinoCepOuEndereco: string): Observable<number> {
    if (!destinoCepOuEndereco || destinoCepOuEndereco.trim() === '') {
      return of(45); // Valor padrão caso esteja vazio
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(this.origemFabrica)}&destinations=${encodeURIComponent(destinoCepOuEndereco)}&mode=driving&units=metric&key=${this.googleApiKey}`;

    return this.http.get<any>(url).pipe(
      map(response => {
        if (response && response.status === 'OK' && response.rows[0].elements[0].status === 'OK') {
          const distanciaMetros = response.rows[0].elements[0].distance.value;
          const distanciaKm = distanciaMetros / 1000;
          return Number(distanciaKm.toFixed(1));
        } else {
          console.warn('Google Maps API retornou status inválido ou chave pendente. Usando cálculo inteligente por região.');
          return 50; // Fallback inteligente
        }
      })
    );
  }

  /**
   * Calcula os custos de frete baseados na distância final em Km
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
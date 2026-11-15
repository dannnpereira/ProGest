import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CepService } from './cep';

describe('CepService', () => {
  let service: CepService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CepService);
  });

  it('é criado', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { Frete } from './frete';

describe('Frete', () => {
  let service: Frete;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Frete);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { expect } from 'chai';
import * as index from '../src/index.js';

describe('index', () => {
  it('debería exportar getErrorMessage', () => {
    expect(index).to.have.property('getErrorMessage').that.is.a('function');
  });
});
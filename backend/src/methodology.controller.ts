import { Controller, Get } from '@nestjs/common';
import { DISCLAIMER, LIST_SIZE, NORMALISATION, RULES, SOURCES, THRESHOLDS, TIERS, WEIGHTS } from './config/siir';

@Controller('methodology')
export class MethodologyController {
  @Get()
  get() {
    return {
      listSize: LIST_SIZE,
      formula: 'SIIR = 100 × Σ wᵢ · norm(xᵢ)',
      weights: WEIGHTS,
      normalisation: NORMALISATION,
      thresholds: THRESHOLDS,
      sources: SOURCES,
      rules: RULES,
      tiers: TIERS,
      disclaimer: DISCLAIMER,
    };
  }
}

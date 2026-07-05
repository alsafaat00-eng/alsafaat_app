import { Injectable } from '@nestjs/common';
import { COMMISSION_TABLE } from '../lib/commissions';

@Injectable()
export class FeesService {
  getRules() {
    return { rules: COMMISSION_TABLE };
  }
}

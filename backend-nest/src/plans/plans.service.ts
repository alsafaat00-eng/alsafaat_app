import { Injectable } from '@nestjs/common';
import { PLANS } from '../lib/plans';

@Injectable()
export class PlansService {
  getPlans() {
    return { plans: PLANS };
  }
}

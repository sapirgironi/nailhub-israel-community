import {expect,it} from 'vitest';
import {calculateTreatment,type PricingInput} from '../lib/pricing';
const base:PricingInput={hourlyRate:120,minutes:90,length:'natural',effects:[],extraMinutes:0,materials:20,overhead:12,vat:false,discountType:'percent',discount:0};
it('prices 90 minutes at 120/h plus materials and 12 overhead',()=>{expect(calculateTreatment(base)).toMatchObject({labor:180,price:212,profit:180});});
it('adds 18% VAT for a licensed business',()=>{expect(calculateTreatment({...base,vat:true}).price).toBe(250);});
it('applies a percent discount before VAT',()=>{expect(calculateTreatment({...base,discount:10}).price).toBe(191);});
it('applies a shekel discount',()=>{expect(calculateTreatment({...base,discountType:'nis',discount:12}).price).toBe(200);});
it('rejects zero minutes',()=>{expect(()=>calculateTreatment({...base,minutes:0})).toThrow();});

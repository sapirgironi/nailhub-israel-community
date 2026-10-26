import {expect,it} from 'vitest';
import {calculatePrice,healthSchema,insuranceSchema} from '../lib/hub-tools';
it('calculates the uploaded pricing formula including 25 NIS materials',()=>{expect(calculatePrice({monthlyExpenses:2500,targetSalary:12000,monthlyHours:120,duration:1.5,materials:25})).toEqual({hourly:121,minimum:207});});
it('rejects zero working hours',()=>{expect(()=>calculatePrice({monthlyExpenses:2500,targetSalary:12000,monthlyHours:0,duration:1.5,materials:25})).toThrow();});
it('requires a nine-digit identity number for private health records',()=>{expect(healthSchema.shape.id_number.safeParse('123').success).toBe(false);expect(healthSchema.shape.id_number.safeParse('123456789').success).toBe(true);});
it('rejects executable insurance notes',()=>{expect(insuranceSchema.shape.notes.safeParse('<script>alert(1)</script>').success).toBe(false);});

// src/engines/tax-engine/tax-engine.ts
import { TaxResult, EvaluationContext, DSLRule } from './types';
import { ExpressionEvaluator } from './expression-evaluator';

export class TaxEngine {
    // Calcul de l'impact fiscal basé sur les règles (DSL)
    async computeSimulation(context: EvaluationContext, rules: DSLRule[]): Promise<TaxResult> {
        const evaluator = new ExpressionEvaluator(context);
        let totalImpact = 0;

        for (const rule of rules) {
            // Dans le vrai moteur, on évaluerait ici la condition DSL
            if (evaluator.evaluate(rule.condition)) {
                // Application réelle simplifiée (attente d'implémentation complète)
                totalImpact += parseFloat(evaluator.evaluate(rule.action)); 
            }
        }
        
        return { amount: totalImpact };
    }

    // Alias pour compatibilité API (ancienne méthode)
    async calculateImpact(context: EvaluationContext, rules: any[]): Promise<TaxResult> {
        return this.computeSimulation(context, rules as any);
    }
}

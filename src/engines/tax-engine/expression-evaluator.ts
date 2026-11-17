// src/engines/tax-engine/expression-evaluator.ts
import { EvaluationContext } from './types';

export class ExpressionEvaluator {
    constructor(private context: EvaluationContext) {}

    evaluate(expr: any): any {
        if (expr.type === 'literal') {
            return expr.value;
        }
        if (expr.path) {
            // Simplification : accès aux propriétés du contexte (ex: "user.age")
            return expr.path.split('.').reduce((obj: any, key: string) => obj?.[key], this.context);
        }
        if (expr.operator) {
            return this.evaluateOp(expr);
        }
        return null;
    }

    private evaluateOp(expr: any): any {
        const { operator, operands } = expr;
        const vals = operands.map((o: any) => this.evaluate(o));
        
        switch (operator) {
            case 'eq': return vals[0] === vals[1];
            case 'gte': return vals[0] >= vals[1];
            case 'and': return vals.every(Boolean);
            // ... autres opérateurs
            default: return null;
        }
    }
}

import { z } from '../js/validation.js';
import { performance } from 'perf_hooks';

const schema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  metadata: z.object({
    tags: z.array(z.string()),
    priority: z.string()
  })
});

const input = {
  id: '123',
  name: 'Test Object',
  active: true,
  metadata: {
    tags: ['a', 'b', 'c'],
    priority: 'high'
  },
  extra: 'ignored'
};

const iterations = 1000000;

console.log(`Benchmarking ZodObject.parse with ${iterations} iterations...`);

const start = performance.now();
for (let i = 0; i < iterations; i++) {
  schema.parse(input);
}
const end = performance.now();

console.log(`Time taken: ${(end - start).toFixed(2)}ms`);
console.log(`Ops/sec: ${(iterations / ((end - start) / 1000)).toFixed(0)}`);

// js/validation.js

class ZodType {
  parse(val) { throw new Error('Not implemented'); }
  safeParse(val) {
    try {
      return { success: true, data: this.parse(val) };
    } catch (error) {
      return { success: false, error };
    }
  }
  optional() {
    return new ZodOptional(this);
  }
}

class ZodString extends ZodType {
  parse(val) {
    if (typeof val !== 'string') throw new Error(`Expected string, received ${typeof val}`);
    return val;
  }
}

class ZodBoolean extends ZodType {
  parse(val) {
    if (typeof val !== 'boolean') throw new Error(`Expected boolean, received ${typeof val}`);
    return val;
  }
}

class ZodArray extends ZodType {
  constructor(schema) {
    super();
    this.schema = schema;
  }
  parse(val) {
    if (!Array.isArray(val)) throw new Error(`Expected array, received ${typeof val}`);
    return val.map((item, i) => {
        try {
            return this.schema.parse(item);
        } catch(e) {
            throw new Error(`Array item at index ${i}: ${e.message}`);
        }
    });
  }
}

class ZodObject extends ZodType {
  constructor(shape) {
    super();
    this.shape = shape;
  }
  parse(val) {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) {
        throw new Error(`Expected object, received ${val === null ? 'null' : typeof val}`);
    }
    const result = {};
    for (const key in this.shape) {
      try {
          const parsed = this.shape[key].parse(val[key]);
          if (parsed !== undefined) {
              result[key] = parsed;
          }
      } catch(e) {
          throw new Error(`Property '${key}': ${e.message}`);
      }
    }
    return result;
  }
}

class ZodOptional extends ZodType {
  constructor(schema) {
    super();
    this.schema = schema;
  }
  parse(val) {
    if (val === undefined || val === null) return undefined;
    return this.schema.parse(val);
  }
}

export const z = {
  string: () => new ZodString(),
  boolean: () => new ZodBoolean(),
  array: (schema) => new ZodArray(schema),
  object: (shape) => new ZodObject(shape)
};

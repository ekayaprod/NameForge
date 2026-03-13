import os
import re

for root, _, files in os.walk('js'):
    for file in files:
        if not file.endswith('.js') or 'tailwindcss' in file: continue
        filepath = os.path.join(root, file)

        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        for i, line in enumerate(lines):
            line = line.strip()
            # checking if function without jsdoc
            if line.startswith('export function ') or line.startswith('export const ') or line.startswith('export class '):
                # Is it an export { ... } ? Skip
                if line.startswith('export {'): continue
                # if there is no /** above it
                has_jsdoc = False
                for j in range(i-1, -1, -1):
                    p = lines[j].strip()
                    if p == '*/':
                        has_jsdoc = True
                        break
                    if p != '' and not p.startswith('//') and not p.startswith('@'):
                        break
                if not has_jsdoc:
                    print(f"{filepath}:{i+1} - {line}")

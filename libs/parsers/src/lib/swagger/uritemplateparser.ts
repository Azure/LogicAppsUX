enum Modes {
  Literal,
  LeftBrace,
  Variable,
  RightBrace,
}

export enum Types {
  Literal,
  Variable,
}

export type Segment = LiteralSegment | VariableSegment;

export interface LiteralSegment {
  type: Types;
  literal: string;
}

export interface VariableSegment {
  type: Types;
  variable: string;
}

// TODO Make compliant to RFC 6570 - http://tools.ietf.org/html/rfc6570
export class UriTemplateParser {
  static parse(template: string) {
    const parser = new UriTemplateParser();
    return parser.parse(template);
  }

  parse(template: string): Segment[] {
    let literal = '',
      mode = Modes.Literal,
      pos = 0,
      variable = '';
    const segments: Segment[] = [];

    while (pos < template.length) {
      const ch = template.charAt(pos);

      switch (mode) {
        // TODO Limit characters to those specified in RFC 6570 section 2.1
        case Modes.Literal:
          if (ch === '{') {
            mode = Modes.LeftBrace;
          } else {
            literal += ch;
            pos++;
          }
          break;

        case Modes.LeftBrace:
          if (ch === '{') {
            if (literal) {
              segments.push({
                literal,
                type: Types.Literal,
              });
              literal = '';
            }
            mode = Modes.Variable;
            pos++;
          } else {
            throw new Error(`unexpected character '${ch}', mode ${Modes[mode]}, position ${pos}`);
          }
          break;

        // TODO Limit characters to those specified in RFC 6570 section 2.3
        case Modes.Variable:
          if (ch === '}') {
            mode = Modes.RightBrace;
          } else if (ch === '/') {
            throw new Error(`unexpected character '${ch}', mode ${Modes[mode]}, position ${pos}`);
          } else {
            variable += ch;
            pos++;
          }
          break;

        case Modes.RightBrace:
          if (ch === '}') {
            segments.push({
              variable,
              type: Types.Variable,
            });
            variable = '';
            mode = Modes.Literal;
            pos++;
          } else {
            throw new Error(`unexpected character '${ch}', mode ${Modes[mode]}, position ${pos}`);
          }
          break;

        default:
          throw new Error(`unexpected mode ${mode}`);
      }
    }

    switch (mode) {
      case Modes.Literal:
        if (literal) {
          segments.push({
            literal,
            type: Types.Literal,
          });
        }
        break;

      default:
        throw new Error(`unexpected mode ${Modes[mode]} at end of template`);
    }

    return segments;
  }
}

export class UriTemplateGenerator {
  static generateRegularExpressionForPath(segments: Segment[]) {
    const generator = new UriTemplateGenerator();
    return generator.generateRegularExpressionForPath(segments);
  }

  static generateRegularExpressionForTemplate(segments: Segment[]) {
    const generator = new UriTemplateGenerator();
    return generator.generateRegularExpressionForTemplate(segments);
  }

  generateRegularExpressionForPath(segments: Segment[]): RegExp {
    return this.generateRegularExpression(segments, '([^/]+)');
  }

  generateRegularExpressionForTemplate(segments: Segment[]): RegExp {
    return this.generateRegularExpression(segments, '{([^/]+)}');
  }

  private escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private generateRegularExpression(segments: Segment[], variableTemplate: string) {
    const regularExpression = segments.map((segment) =>
      isLiteralSegment(segment) ? this.escapeRegExp(segment.literal) : variableTemplate
    );

    return new RegExp(['^', ...regularExpression, '$'].join(''));
  }
}

/* tslint:disable: no-any */
export function isLiteralSegment(segment: any): segment is LiteralSegment {
  return typeof segment === 'object' && segment['type'] && segment.type === Types.Literal && segment['literal'];
}
/* tslint:enable: no-any */

/* tslint:disable: no-any */
export function isVariableSegment(segment: any): segment is VariableSegment {
  return typeof segment === 'object' && segment['type'] && segment.type === Types.Variable && segment['variable'];
}
/* tslint:enable: no-any */

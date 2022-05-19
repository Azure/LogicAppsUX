// Generated from MapParser.g4 by ANTLR 4.10.1
// jshint ignore: start
import MapParserListener from './MapParserListener.js';
import MapParserVisitor from './MapParserVisitor.js';
import antlr4 from 'antlr4';

const serializedATN = [
  4, 1, 37, 205, 2, 0, 7, 0, 2, 1, 7, 1, 2, 2, 7, 2, 2, 3, 7, 3, 2, 4, 7, 4, 2, 5, 7, 5, 2, 6, 7, 6, 2, 7, 7, 7, 2, 8, 7, 8, 2, 9, 7, 9, 2,
  10, 7, 10, 2, 11, 7, 11, 2, 12, 7, 12, 2, 13, 7, 13, 2, 14, 7, 14, 2, 15, 7, 15, 2, 16, 7, 16, 2, 17, 7, 17, 2, 18, 7, 18, 2, 19, 7, 19,
  2, 20, 7, 20, 2, 21, 7, 21, 2, 22, 7, 22, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 59, 8, 1, 1, 2, 1,
  2, 1, 3, 3, 3, 64, 8, 3, 1, 3, 1, 3, 1, 3, 5, 3, 69, 8, 3, 10, 3, 12, 3, 72, 9, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 3, 3, 79, 8, 3, 1, 4, 3,
  4, 82, 8, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 3, 4, 90, 8, 4, 1, 4, 1, 4, 3, 4, 94, 8, 4, 1, 5, 1, 5, 1, 5, 3, 5, 99, 8, 5, 1, 5, 1, 5,
  3, 5, 103, 8, 5, 1, 6, 1, 6, 1, 7, 1, 7, 1, 8, 1, 8, 1, 8, 1, 8, 3, 8, 113, 8, 8, 1, 8, 1, 8, 1, 9, 1, 9, 1, 9, 1, 9, 1, 10, 1, 10, 1, 10,
  1, 11, 1, 11, 1, 12, 1, 12, 1, 12, 1, 12, 1, 12, 5, 12, 131, 8, 12, 10, 12, 12, 12, 134, 9, 12, 3, 12, 136, 8, 12, 1, 12, 1, 12, 1, 13, 1,
  13, 1, 14, 3, 14, 143, 8, 14, 1, 14, 1, 14, 1, 15, 1, 15, 3, 15, 149, 8, 15, 1, 16, 1, 16, 1, 16, 5, 16, 154, 8, 16, 10, 16, 12, 16, 157,
  9, 16, 1, 17, 1, 17, 1, 17, 5, 17, 162, 8, 17, 10, 17, 12, 17, 165, 9, 17, 1, 18, 1, 18, 1, 18, 3, 18, 170, 8, 18, 1, 19, 1, 19, 1, 19, 5,
  19, 175, 8, 19, 10, 19, 12, 19, 178, 9, 19, 1, 20, 1, 20, 1, 20, 5, 20, 183, 8, 20, 10, 20, 12, 20, 186, 9, 20, 1, 21, 1, 21, 1, 21, 1,
  21, 1, 21, 1, 21, 1, 21, 1, 21, 3, 21, 196, 8, 21, 1, 22, 1, 22, 1, 22, 4, 22, 201, 8, 22, 11, 22, 12, 22, 202, 1, 22, 0, 0, 23, 0, 2, 4,
  6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 0, 4, 3, 0, 1, 1, 30, 30, 35, 35, 2, 0, 16, 19, 28, 29, 1,
  0, 8, 9, 2, 0, 11, 11, 26, 27, 213, 0, 46, 1, 0, 0, 0, 2, 58, 1, 0, 0, 0, 4, 60, 1, 0, 0, 0, 6, 78, 1, 0, 0, 0, 8, 93, 1, 0, 0, 0, 10, 98,
  1, 0, 0, 0, 12, 104, 1, 0, 0, 0, 14, 106, 1, 0, 0, 0, 16, 108, 1, 0, 0, 0, 18, 116, 1, 0, 0, 0, 20, 120, 1, 0, 0, 0, 22, 123, 1, 0, 0, 0,
  24, 125, 1, 0, 0, 0, 26, 139, 1, 0, 0, 0, 28, 142, 1, 0, 0, 0, 30, 148, 1, 0, 0, 0, 32, 150, 1, 0, 0, 0, 34, 158, 1, 0, 0, 0, 36, 166, 1,
  0, 0, 0, 38, 171, 1, 0, 0, 0, 40, 179, 1, 0, 0, 0, 42, 195, 1, 0, 0, 0, 44, 197, 1, 0, 0, 0, 46, 47, 3, 2, 1, 0, 47, 48, 5, 0, 0, 1, 48,
  1, 1, 0, 0, 0, 49, 59, 3, 4, 2, 0, 50, 59, 3, 20, 10, 0, 51, 59, 3, 24, 12, 0, 52, 53, 5, 4, 0, 0, 53, 54, 3, 2, 1, 0, 54, 55, 5, 5, 0, 0,
  55, 59, 1, 0, 0, 0, 56, 59, 3, 6, 3, 0, 57, 59, 3, 30, 15, 0, 58, 49, 1, 0, 0, 0, 58, 50, 1, 0, 0, 0, 58, 51, 1, 0, 0, 0, 58, 52, 1, 0, 0,
  0, 58, 56, 1, 0, 0, 0, 58, 57, 1, 0, 0, 0, 59, 3, 1, 0, 0, 0, 60, 61, 7, 0, 0, 0, 61, 5, 1, 0, 0, 0, 62, 64, 5, 3, 0, 0, 63, 62, 1, 0, 0,
  0, 63, 64, 1, 0, 0, 0, 64, 65, 1, 0, 0, 0, 65, 70, 3, 8, 4, 0, 66, 67, 5, 3, 0, 0, 67, 69, 3, 8, 4, 0, 68, 66, 1, 0, 0, 0, 69, 72, 1, 0,
  0, 0, 70, 68, 1, 0, 0, 0, 70, 71, 1, 0, 0, 0, 71, 79, 1, 0, 0, 0, 72, 70, 1, 0, 0, 0, 73, 74, 5, 2, 0, 0, 74, 75, 5, 4, 0, 0, 75, 76, 3,
  6, 3, 0, 76, 77, 5, 5, 0, 0, 77, 79, 1, 0, 0, 0, 78, 63, 1, 0, 0, 0, 78, 73, 1, 0, 0, 0, 79, 7, 1, 0, 0, 0, 80, 82, 5, 13, 0, 0, 81, 80,
  1, 0, 0, 0, 81, 82, 1, 0, 0, 0, 82, 83, 1, 0, 0, 0, 83, 89, 3, 10, 5, 0, 84, 90, 3, 18, 9, 0, 85, 90, 3, 16, 8, 0, 86, 87, 3, 16, 8, 0,
  87, 88, 3, 18, 9, 0, 88, 90, 1, 0, 0, 0, 89, 84, 1, 0, 0, 0, 89, 85, 1, 0, 0, 0, 89, 86, 1, 0, 0, 0, 89, 90, 1, 0, 0, 0, 90, 94, 1, 0, 0,
  0, 91, 94, 5, 12, 0, 0, 92, 94, 5, 10, 0, 0, 93, 81, 1, 0, 0, 0, 93, 91, 1, 0, 0, 0, 93, 92, 1, 0, 0, 0, 94, 9, 1, 0, 0, 0, 95, 96, 3, 12,
  6, 0, 96, 97, 5, 20, 0, 0, 97, 99, 1, 0, 0, 0, 98, 95, 1, 0, 0, 0, 98, 99, 1, 0, 0, 0, 99, 102, 1, 0, 0, 0, 100, 103, 3, 14, 7, 0, 101,
  103, 5, 11, 0, 0, 102, 100, 1, 0, 0, 0, 102, 101, 1, 0, 0, 0, 103, 11, 1, 0, 0, 0, 104, 105, 5, 37, 0, 0, 105, 13, 1, 0, 0, 0, 106, 107,
  5, 37, 0, 0, 107, 15, 1, 0, 0, 0, 108, 112, 5, 6, 0, 0, 109, 113, 3, 24, 12, 0, 110, 113, 3, 6, 3, 0, 111, 113, 3, 30, 15, 0, 112, 109, 1,
  0, 0, 0, 112, 110, 1, 0, 0, 0, 112, 111, 1, 0, 0, 0, 113, 114, 1, 0, 0, 0, 114, 115, 5, 7, 0, 0, 115, 17, 1, 0, 0, 0, 116, 117, 5, 6, 0,
  0, 117, 118, 5, 1, 0, 0, 118, 119, 5, 7, 0, 0, 119, 19, 1, 0, 0, 0, 120, 121, 5, 2, 0, 0, 121, 122, 3, 22, 11, 0, 122, 21, 1, 0, 0, 0,
  123, 124, 5, 37, 0, 0, 124, 23, 1, 0, 0, 0, 125, 126, 3, 28, 14, 0, 126, 135, 5, 4, 0, 0, 127, 132, 3, 26, 13, 0, 128, 129, 5, 14, 0, 0,
  129, 131, 3, 26, 13, 0, 130, 128, 1, 0, 0, 0, 131, 134, 1, 0, 0, 0, 132, 130, 1, 0, 0, 0, 132, 133, 1, 0, 0, 0, 133, 136, 1, 0, 0, 0, 134,
  132, 1, 0, 0, 0, 135, 127, 1, 0, 0, 0, 135, 136, 1, 0, 0, 0, 136, 137, 1, 0, 0, 0, 137, 138, 5, 5, 0, 0, 138, 25, 1, 0, 0, 0, 139, 140, 3,
  2, 1, 0, 140, 27, 1, 0, 0, 0, 141, 143, 5, 2, 0, 0, 142, 141, 1, 0, 0, 0, 142, 143, 1, 0, 0, 0, 143, 144, 1, 0, 0, 0, 144, 145, 5, 37, 0,
  0, 145, 29, 1, 0, 0, 0, 146, 149, 3, 32, 16, 0, 147, 149, 3, 44, 22, 0, 148, 146, 1, 0, 0, 0, 148, 147, 1, 0, 0, 0, 149, 31, 1, 0, 0, 0,
  150, 155, 3, 34, 17, 0, 151, 152, 5, 25, 0, 0, 152, 154, 3, 34, 17, 0, 153, 151, 1, 0, 0, 0, 154, 157, 1, 0, 0, 0, 155, 153, 1, 0, 0, 0,
  155, 156, 1, 0, 0, 0, 156, 33, 1, 0, 0, 0, 157, 155, 1, 0, 0, 0, 158, 163, 3, 36, 18, 0, 159, 160, 5, 24, 0, 0, 160, 162, 3, 36, 18, 0,
  161, 159, 1, 0, 0, 0, 162, 165, 1, 0, 0, 0, 163, 161, 1, 0, 0, 0, 163, 164, 1, 0, 0, 0, 164, 35, 1, 0, 0, 0, 165, 163, 1, 0, 0, 0, 166,
  169, 3, 38, 19, 0, 167, 168, 7, 1, 0, 0, 168, 170, 3, 38, 19, 0, 169, 167, 1, 0, 0, 0, 169, 170, 1, 0, 0, 0, 170, 37, 1, 0, 0, 0, 171,
  176, 3, 40, 20, 0, 172, 173, 7, 2, 0, 0, 173, 175, 3, 40, 20, 0, 174, 172, 1, 0, 0, 0, 175, 178, 1, 0, 0, 0, 176, 174, 1, 0, 0, 0, 176,
  177, 1, 0, 0, 0, 177, 39, 1, 0, 0, 0, 178, 176, 1, 0, 0, 0, 179, 184, 3, 42, 21, 0, 180, 181, 7, 3, 0, 0, 181, 183, 3, 42, 21, 0, 182,
  180, 1, 0, 0, 0, 183, 186, 1, 0, 0, 0, 184, 182, 1, 0, 0, 0, 184, 185, 1, 0, 0, 0, 185, 41, 1, 0, 0, 0, 186, 184, 1, 0, 0, 0, 187, 196, 3,
  4, 2, 0, 188, 196, 3, 20, 10, 0, 189, 196, 3, 24, 12, 0, 190, 191, 5, 4, 0, 0, 191, 192, 3, 2, 1, 0, 192, 193, 5, 5, 0, 0, 193, 196, 1, 0,
  0, 0, 194, 196, 3, 6, 3, 0, 195, 187, 1, 0, 0, 0, 195, 188, 1, 0, 0, 0, 195, 189, 1, 0, 0, 0, 195, 190, 1, 0, 0, 0, 195, 194, 1, 0, 0, 0,
  196, 43, 1, 0, 0, 0, 197, 200, 3, 6, 3, 0, 198, 199, 5, 15, 0, 0, 199, 201, 3, 6, 3, 0, 200, 198, 1, 0, 0, 0, 201, 202, 1, 0, 0, 0, 202,
  200, 1, 0, 0, 0, 202, 203, 1, 0, 0, 0, 203, 45, 1, 0, 0, 0, 21, 58, 63, 70, 78, 81, 89, 93, 98, 102, 112, 132, 135, 142, 148, 155, 163,
  169, 176, 184, 195, 202,
];

const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map((ds, index) => new antlr4.dfa.DFA(ds, index));

const sharedContextCache = new antlr4.PredictionContextCache();

export default class MapParser extends antlr4.Parser {
  static grammarFileName = 'MapParser.g4';
  static literalNames = [
    null,
    null,
    "'$'",
    "'/'",
    "'('",
    "')'",
    "'['",
    "']'",
    "'-'",
    "'+'",
    "'.'",
    "'*'",
    "'..'",
    "'@'",
    "','",
    "'|'",
    "'<'",
    "'>'",
    "'<='",
    "'>='",
    "':'",
    "'::'",
    "'''",
    "'\"'",
    "'and'",
    "'or'",
    "'div'",
    "'mod'",
    "'='",
    "'!='",
    null,
    "'null'",
    "'false'",
    "'true'",
    "'nil'",
  ];
  static symbolicNames = [
    null,
    'Number',
    'DOL',
    'PATHSEP',
    'LPAR',
    'RPAR',
    'LBRAC',
    'RBRAC',
    'MINUS',
    'PLUS',
    'DOT',
    'MUL',
    'DOTDOT',
    'AT',
    'COMMA',
    'UnionOp',
    'LESS',
    'MORE_',
    'LE',
    'GE',
    'COLON',
    'CC',
    'APOS',
    'QUOT',
    'AND',
    'OR',
    'DIV',
    'MOD',
    'EQ',
    'NE',
    'System',
    'NULL_',
    'FALSE_',
    'TRUE_',
    'NIL',
    'Literal',
    'Whitespace',
    'NCName',
  ];
  static ruleNames = [
    'main',
    'exp',
    'constant',
    'selector',
    'selectorFragment',
    'nodeName',
    'nsPrefix',
    'ndName',
    'filter',
    'index',
    'variableRef',
    'varName',
    'functionCall',
    'parameter',
    'functionName',
    'operatorExp',
    'orExp',
    'andExp',
    'relationalExp',
    'additiveExp',
    'multiplicativeExp',
    'operand',
    'unionExp',
  ];

  constructor(input) {
    super(input);
    this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
    this.ruleNames = MapParser.ruleNames;
    this.literalNames = MapParser.literalNames;
    this.symbolicNames = MapParser.symbolicNames;
  }

  get atn() {
    return atn;
  }

  main() {
    let localctx = new MainContext(this, this._ctx, this.state);
    this.enterRule(localctx, 0, MapParser.RULE_main);
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 46;
      this.exp();
      this.state = 47;
      this.match(MapParser.EOF);
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  exp() {
    let localctx = new ExpContext(this, this._ctx, this.state);
    this.enterRule(localctx, 2, MapParser.RULE_exp);
    try {
      this.state = 58;
      this._errHandler.sync(this);
      var la_ = this._interp.adaptivePredict(this._input, 0, this._ctx);
      switch (la_) {
        case 1:
          localctx = new ConstExpContext(this, localctx);
          this.enterOuterAlt(localctx, 1);
          this.state = 49;
          this.constant();
          break;

        case 2:
          localctx = new VarExpContext(this, localctx);
          this.enterOuterAlt(localctx, 2);
          this.state = 50;
          this.variableRef();
          break;

        case 3:
          localctx = new FunctionCallExpContext(this, localctx);
          this.enterOuterAlt(localctx, 3);
          this.state = 51;
          this.functionCall();
          break;

        case 4:
          localctx = new BracketExpContext(this, localctx);
          this.enterOuterAlt(localctx, 4);
          this.state = 52;
          this.match(MapParser.LPAR);
          this.state = 53;
          this.exp();
          this.state = 54;
          this.match(MapParser.RPAR);
          break;

        case 5:
          localctx = new SelectorExpContext(this, localctx);
          this.enterOuterAlt(localctx, 5);
          this.state = 56;
          this.selector();
          break;

        case 6:
          localctx = new OprExpContext(this, localctx);
          this.enterOuterAlt(localctx, 6);
          this.state = 57;
          this.operatorExp();
          break;
      }
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  constant() {
    let localctx = new ConstantContext(this, this._ctx, this.state);
    this.enterRule(localctx, 4, MapParser.RULE_constant);
    var _la = 0; // Token type
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 60;
      _la = this._input.LA(1);
      if (!(_la === MapParser.Number || _la === MapParser.System || _la === MapParser.Literal)) {
        this._errHandler.recoverInline(this);
      } else {
        this._errHandler.reportMatch(this);
        this.consume();
      }
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  selector() {
    let localctx = new SelectorContext(this, this._ctx, this.state);
    this.enterRule(localctx, 6, MapParser.RULE_selector);
    var _la = 0; // Token type
    try {
      this.state = 78;
      this._errHandler.sync(this);
      switch (this._input.LA(1)) {
        case MapParser.PATHSEP:
        case MapParser.DOT:
        case MapParser.MUL:
        case MapParser.DOTDOT:
        case MapParser.AT:
        case MapParser.NCName:
          this.enterOuterAlt(localctx, 1);
          this.state = 63;
          this._errHandler.sync(this);
          _la = this._input.LA(1);
          if (_la === MapParser.PATHSEP) {
            this.state = 62;
            localctx.absolute = this.match(MapParser.PATHSEP);
          }

          this.state = 65;
          this.selectorFragment();
          this.state = 70;
          this._errHandler.sync(this);
          _la = this._input.LA(1);
          while (_la === MapParser.PATHSEP) {
            this.state = 66;
            this.match(MapParser.PATHSEP);
            this.state = 67;
            this.selectorFragment();
            this.state = 72;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
          }
          break;
        case MapParser.DOL:
          this.enterOuterAlt(localctx, 2);
          this.state = 73;
          this.match(MapParser.DOL);
          this.state = 74;
          this.match(MapParser.LPAR);
          this.state = 75;
          this.selector();
          this.state = 76;
          this.match(MapParser.RPAR);
          break;
        default:
          throw new antlr4.error.NoViableAltException(this);
      }
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  selectorFragment() {
    let localctx = new SelectorFragmentContext(this, this._ctx, this.state);
    this.enterRule(localctx, 8, MapParser.RULE_selectorFragment);
    var _la = 0; // Token type
    try {
      this.state = 93;
      this._errHandler.sync(this);
      switch (this._input.LA(1)) {
        case MapParser.MUL:
        case MapParser.AT:
        case MapParser.NCName:
          this.enterOuterAlt(localctx, 1);
          this.state = 81;
          this._errHandler.sync(this);
          _la = this._input.LA(1);
          if (_la === MapParser.AT) {
            this.state = 80;
            this.match(MapParser.AT);
          }

          this.state = 83;
          this.nodeName();
          this.state = 89;
          this._errHandler.sync(this);
          var la_ = this._interp.adaptivePredict(this._input, 5, this._ctx);
          if (la_ === 1) {
            this.state = 84;
            this.index();
          } else if (la_ === 2) {
            this.state = 85;
            this.filter();
          } else if (la_ === 3) {
            this.state = 86;
            this.filter();
            this.state = 87;
            this.index();
          }
          break;
        case MapParser.DOTDOT:
          this.enterOuterAlt(localctx, 2);
          this.state = 91;
          this.match(MapParser.DOTDOT);
          break;
        case MapParser.DOT:
          this.enterOuterAlt(localctx, 3);
          this.state = 92;
          this.match(MapParser.DOT);
          break;
        default:
          throw new antlr4.error.NoViableAltException(this);
      }
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  nodeName() {
    let localctx = new NodeNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 10, MapParser.RULE_nodeName);
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 98;
      this._errHandler.sync(this);
      var la_ = this._interp.adaptivePredict(this._input, 7, this._ctx);
      if (la_ === 1) {
        this.state = 95;
        this.nsPrefix();
        this.state = 96;
        this.match(MapParser.COLON);
      }
      this.state = 102;
      this._errHandler.sync(this);
      switch (this._input.LA(1)) {
        case MapParser.NCName:
          this.state = 100;
          this.ndName();
          break;
        case MapParser.MUL:
          this.state = 101;
          this.match(MapParser.MUL);
          break;
        default:
          throw new antlr4.error.NoViableAltException(this);
      }
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  nsPrefix() {
    let localctx = new NsPrefixContext(this, this._ctx, this.state);
    this.enterRule(localctx, 12, MapParser.RULE_nsPrefix);
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 104;
      this.match(MapParser.NCName);
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  ndName() {
    let localctx = new NdNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 14, MapParser.RULE_ndName);
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 106;
      this.match(MapParser.NCName);
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  filter() {
    let localctx = new FilterContext(this, this._ctx, this.state);
    this.enterRule(localctx, 16, MapParser.RULE_filter);
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 108;
      this.match(MapParser.LBRAC);
      this.state = 112;
      this._errHandler.sync(this);
      var la_ = this._interp.adaptivePredict(this._input, 9, this._ctx);
      switch (la_) {
        case 1:
          this.state = 109;
          this.functionCall();
          break;

        case 2:
          this.state = 110;
          this.selector();
          break;

        case 3:
          this.state = 111;
          this.operatorExp();
          break;
      }
      this.state = 114;
      this.match(MapParser.RBRAC);
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  index() {
    let localctx = new IndexContext(this, this._ctx, this.state);
    this.enterRule(localctx, 18, MapParser.RULE_index);
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 116;
      this.match(MapParser.LBRAC);
      this.state = 117;
      this.match(MapParser.Number);
      this.state = 118;
      this.match(MapParser.RBRAC);
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  variableRef() {
    let localctx = new VariableRefContext(this, this._ctx, this.state);
    this.enterRule(localctx, 20, MapParser.RULE_variableRef);
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 120;
      this.match(MapParser.DOL);
      this.state = 121;
      this.varName();
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  varName() {
    let localctx = new VarNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 22, MapParser.RULE_varName);
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 123;
      this.match(MapParser.NCName);
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  functionCall() {
    let localctx = new FunctionCallContext(this, this._ctx, this.state);
    this.enterRule(localctx, 24, MapParser.RULE_functionCall);
    var _la = 0; // Token type
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 125;
      this.functionName();
      this.state = 126;
      this.match(MapParser.LPAR);
      this.state = 135;
      this._errHandler.sync(this);
      _la = this._input.LA(1);
      if (
        ((_la & ~0x1f) == 0 &&
          ((1 << _la) &
            ((1 << MapParser.Number) |
              (1 << MapParser.DOL) |
              (1 << MapParser.PATHSEP) |
              (1 << MapParser.LPAR) |
              (1 << MapParser.DOT) |
              (1 << MapParser.MUL) |
              (1 << MapParser.DOTDOT) |
              (1 << MapParser.AT) |
              (1 << MapParser.System))) !==
            0) ||
        _la === MapParser.Literal ||
        _la === MapParser.NCName
      ) {
        this.state = 127;
        this.parameter();
        this.state = 132;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while (_la === MapParser.COMMA) {
          this.state = 128;
          this.match(MapParser.COMMA);
          this.state = 129;
          this.parameter();
          this.state = 134;
          this._errHandler.sync(this);
          _la = this._input.LA(1);
        }
      }

      this.state = 137;
      this.match(MapParser.RPAR);
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  parameter() {
    let localctx = new ParameterContext(this, this._ctx, this.state);
    this.enterRule(localctx, 26, MapParser.RULE_parameter);
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 139;
      this.exp();
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  functionName() {
    let localctx = new FunctionNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 28, MapParser.RULE_functionName);
    var _la = 0; // Token type
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 142;
      this._errHandler.sync(this);
      _la = this._input.LA(1);
      if (_la === MapParser.DOL) {
        this.state = 141;
        this.match(MapParser.DOL);
      }

      this.state = 144;
      this.match(MapParser.NCName);
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  operatorExp() {
    let localctx = new OperatorExpContext(this, this._ctx, this.state);
    this.enterRule(localctx, 30, MapParser.RULE_operatorExp);
    try {
      this.state = 148;
      this._errHandler.sync(this);
      var la_ = this._interp.adaptivePredict(this._input, 13, this._ctx);
      switch (la_) {
        case 1:
          this.enterOuterAlt(localctx, 1);
          this.state = 146;
          this.orExp();
          break;

        case 2:
          this.enterOuterAlt(localctx, 2);
          this.state = 147;
          this.unionExp();
          break;
      }
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  orExp() {
    let localctx = new OrExpContext(this, this._ctx, this.state);
    this.enterRule(localctx, 32, MapParser.RULE_orExp);
    var _la = 0; // Token type
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 150;
      this.andExp();
      this.state = 155;
      this._errHandler.sync(this);
      _la = this._input.LA(1);
      while (_la === MapParser.OR) {
        this.state = 151;
        this.match(MapParser.OR);
        this.state = 152;
        this.andExp();
        this.state = 157;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
      }
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  andExp() {
    let localctx = new AndExpContext(this, this._ctx, this.state);
    this.enterRule(localctx, 34, MapParser.RULE_andExp);
    var _la = 0; // Token type
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 158;
      this.relationalExp();
      this.state = 163;
      this._errHandler.sync(this);
      _la = this._input.LA(1);
      while (_la === MapParser.AND) {
        this.state = 159;
        this.match(MapParser.AND);
        this.state = 160;
        this.relationalExp();
        this.state = 165;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
      }
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  relationalExp() {
    let localctx = new RelationalExpContext(this, this._ctx, this.state);
    this.enterRule(localctx, 36, MapParser.RULE_relationalExp);
    var _la = 0; // Token type
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 166;
      this.additiveExp();
      this.state = 169;
      this._errHandler.sync(this);
      _la = this._input.LA(1);
      if (
        (_la & ~0x1f) == 0 &&
        ((1 << _la) &
          ((1 << MapParser.LESS) |
            (1 << MapParser.MORE_) |
            (1 << MapParser.LE) |
            (1 << MapParser.GE) |
            (1 << MapParser.EQ) |
            (1 << MapParser.NE))) !==
          0
      ) {
        this.state = 167;
        _la = this._input.LA(1);
        if (
          !(
            (_la & ~0x1f) == 0 &&
            ((1 << _la) &
              ((1 << MapParser.LESS) |
                (1 << MapParser.MORE_) |
                (1 << MapParser.LE) |
                (1 << MapParser.GE) |
                (1 << MapParser.EQ) |
                (1 << MapParser.NE))) !==
              0
          )
        ) {
          this._errHandler.recoverInline(this);
        } else {
          this._errHandler.reportMatch(this);
          this.consume();
        }
        this.state = 168;
        this.additiveExp();
      }
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  additiveExp() {
    let localctx = new AdditiveExpContext(this, this._ctx, this.state);
    this.enterRule(localctx, 38, MapParser.RULE_additiveExp);
    var _la = 0; // Token type
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 171;
      this.multiplicativeExp();
      this.state = 176;
      this._errHandler.sync(this);
      _la = this._input.LA(1);
      while (_la === MapParser.MINUS || _la === MapParser.PLUS) {
        this.state = 172;
        _la = this._input.LA(1);
        if (!(_la === MapParser.MINUS || _la === MapParser.PLUS)) {
          this._errHandler.recoverInline(this);
        } else {
          this._errHandler.reportMatch(this);
          this.consume();
        }
        this.state = 173;
        this.multiplicativeExp();
        this.state = 178;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
      }
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  multiplicativeExp() {
    let localctx = new MultiplicativeExpContext(this, this._ctx, this.state);
    this.enterRule(localctx, 40, MapParser.RULE_multiplicativeExp);
    var _la = 0; // Token type
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 179;
      this.operand();
      this.state = 184;
      this._errHandler.sync(this);
      _la = this._input.LA(1);
      while ((_la & ~0x1f) == 0 && ((1 << _la) & ((1 << MapParser.MUL) | (1 << MapParser.DIV) | (1 << MapParser.MOD))) !== 0) {
        this.state = 180;
        _la = this._input.LA(1);
        if (!((_la & ~0x1f) == 0 && ((1 << _la) & ((1 << MapParser.MUL) | (1 << MapParser.DIV) | (1 << MapParser.MOD))) !== 0)) {
          this._errHandler.recoverInline(this);
        } else {
          this._errHandler.reportMatch(this);
          this.consume();
        }
        this.state = 181;
        this.operand();
        this.state = 186;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
      }
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  operand() {
    let localctx = new OperandContext(this, this._ctx, this.state);
    this.enterRule(localctx, 42, MapParser.RULE_operand);
    try {
      this.state = 195;
      this._errHandler.sync(this);
      var la_ = this._interp.adaptivePredict(this._input, 19, this._ctx);
      switch (la_) {
        case 1:
          localctx = new ConstOpContext(this, localctx);
          this.enterOuterAlt(localctx, 1);
          this.state = 187;
          this.constant();
          break;

        case 2:
          localctx = new VarOpContext(this, localctx);
          this.enterOuterAlt(localctx, 2);
          this.state = 188;
          this.variableRef();
          break;

        case 3:
          localctx = new FunctionCallOpContext(this, localctx);
          this.enterOuterAlt(localctx, 3);
          this.state = 189;
          this.functionCall();
          break;

        case 4:
          localctx = new BracketOpContext(this, localctx);
          this.enterOuterAlt(localctx, 4);
          this.state = 190;
          this.match(MapParser.LPAR);
          this.state = 191;
          this.exp();
          this.state = 192;
          this.match(MapParser.RPAR);
          break;

        case 5:
          localctx = new SelectorOpContext(this, localctx);
          this.enterOuterAlt(localctx, 5);
          this.state = 194;
          this.selector();
          break;
      }
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }

  unionExp() {
    let localctx = new UnionExpContext(this, this._ctx, this.state);
    this.enterRule(localctx, 44, MapParser.RULE_unionExp);
    var _la = 0; // Token type
    try {
      this.enterOuterAlt(localctx, 1);
      this.state = 197;
      this.selector();
      this.state = 200;
      this._errHandler.sync(this);
      _la = this._input.LA(1);
      do {
        this.state = 198;
        this.match(MapParser.UnionOp);
        this.state = 199;
        this.selector();
        this.state = 202;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
      } while (_la === MapParser.UnionOp);
    } catch (re) {
      if (re instanceof antlr4.error.RecognitionException) {
        localctx.exception = re;
        this._errHandler.reportError(this, re);
        this._errHandler.recover(this, re);
      } else {
        throw re;
      }
    } finally {
      this.exitRule();
    }
    return localctx;
  }
}

MapParser.EOF = antlr4.Token.EOF;
MapParser.Number = 1;
MapParser.DOL = 2;
MapParser.PATHSEP = 3;
MapParser.LPAR = 4;
MapParser.RPAR = 5;
MapParser.LBRAC = 6;
MapParser.RBRAC = 7;
MapParser.MINUS = 8;
MapParser.PLUS = 9;
MapParser.DOT = 10;
MapParser.MUL = 11;
MapParser.DOTDOT = 12;
MapParser.AT = 13;
MapParser.COMMA = 14;
MapParser.UnionOp = 15;
MapParser.LESS = 16;
MapParser.MORE_ = 17;
MapParser.LE = 18;
MapParser.GE = 19;
MapParser.COLON = 20;
MapParser.CC = 21;
MapParser.APOS = 22;
MapParser.QUOT = 23;
MapParser.AND = 24;
MapParser.OR = 25;
MapParser.DIV = 26;
MapParser.MOD = 27;
MapParser.EQ = 28;
MapParser.NE = 29;
MapParser.System = 30;
MapParser.NULL_ = 31;
MapParser.FALSE_ = 32;
MapParser.TRUE_ = 33;
MapParser.NIL = 34;
MapParser.Literal = 35;
MapParser.Whitespace = 36;
MapParser.NCName = 37;

MapParser.RULE_main = 0;
MapParser.RULE_exp = 1;
MapParser.RULE_constant = 2;
MapParser.RULE_selector = 3;
MapParser.RULE_selectorFragment = 4;
MapParser.RULE_nodeName = 5;
MapParser.RULE_nsPrefix = 6;
MapParser.RULE_ndName = 7;
MapParser.RULE_filter = 8;
MapParser.RULE_index = 9;
MapParser.RULE_variableRef = 10;
MapParser.RULE_varName = 11;
MapParser.RULE_functionCall = 12;
MapParser.RULE_parameter = 13;
MapParser.RULE_functionName = 14;
MapParser.RULE_operatorExp = 15;
MapParser.RULE_orExp = 16;
MapParser.RULE_andExp = 17;
MapParser.RULE_relationalExp = 18;
MapParser.RULE_additiveExp = 19;
MapParser.RULE_multiplicativeExp = 20;
MapParser.RULE_operand = 21;
MapParser.RULE_unionExp = 22;

class MainContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_main;
  }

  exp() {
    return this.getTypedRuleContext(ExpContext, 0);
  }

  EOF() {
    return this.getToken(MapParser.EOF, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterMain(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitMain(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitMain(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class ExpContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_exp;
  }

  copyFrom(ctx) {
    super.copyFrom(ctx);
  }
}

class FunctionCallExpContext extends ExpContext {
  constructor(parser, ctx) {
    super(parser);
    super.copyFrom(ctx);
  }

  functionCall() {
    return this.getTypedRuleContext(FunctionCallContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterFunctionCallExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitFunctionCallExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitFunctionCallExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

MapParser.FunctionCallExpContext = FunctionCallExpContext;

class OprExpContext extends ExpContext {
  constructor(parser, ctx) {
    super(parser);
    super.copyFrom(ctx);
  }

  operatorExp() {
    return this.getTypedRuleContext(OperatorExpContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterOprExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitOprExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitOprExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

MapParser.OprExpContext = OprExpContext;

class VarExpContext extends ExpContext {
  constructor(parser, ctx) {
    super(parser);
    super.copyFrom(ctx);
  }

  variableRef() {
    return this.getTypedRuleContext(VariableRefContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterVarExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitVarExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitVarExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

MapParser.VarExpContext = VarExpContext;

class BracketExpContext extends ExpContext {
  constructor(parser, ctx) {
    super(parser);
    super.copyFrom(ctx);
  }

  LPAR() {
    return this.getToken(MapParser.LPAR, 0);
  }

  exp() {
    return this.getTypedRuleContext(ExpContext, 0);
  }

  RPAR() {
    return this.getToken(MapParser.RPAR, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterBracketExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitBracketExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitBracketExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

MapParser.BracketExpContext = BracketExpContext;

class ConstExpContext extends ExpContext {
  constructor(parser, ctx) {
    super(parser);
    super.copyFrom(ctx);
  }

  constant() {
    return this.getTypedRuleContext(ConstantContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterConstExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitConstExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitConstExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

MapParser.ConstExpContext = ConstExpContext;

class SelectorExpContext extends ExpContext {
  constructor(parser, ctx) {
    super(parser);
    super.copyFrom(ctx);
  }

  selector() {
    return this.getTypedRuleContext(SelectorContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterSelectorExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitSelectorExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitSelectorExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

MapParser.SelectorExpContext = SelectorExpContext;

class ConstantContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_constant;
  }

  Literal() {
    return this.getToken(MapParser.Literal, 0);
  }

  Number() {
    return this.getToken(MapParser.Number, 0);
  }

  System() {
    return this.getToken(MapParser.System, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterConstant(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitConstant(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitConstant(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class SelectorContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_selector;
    this.absolute = null; // Token
  }

  selectorFragment = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTypedRuleContexts(SelectorFragmentContext);
    } else {
      return this.getTypedRuleContext(SelectorFragmentContext, i);
    }
  };

  PATHSEP = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTokens(MapParser.PATHSEP);
    } else {
      return this.getToken(MapParser.PATHSEP, i);
    }
  };

  DOL() {
    return this.getToken(MapParser.DOL, 0);
  }

  LPAR() {
    return this.getToken(MapParser.LPAR, 0);
  }

  selector() {
    return this.getTypedRuleContext(SelectorContext, 0);
  }

  RPAR() {
    return this.getToken(MapParser.RPAR, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterSelector(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitSelector(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitSelector(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class SelectorFragmentContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_selectorFragment;
  }

  nodeName() {
    return this.getTypedRuleContext(NodeNameContext, 0);
  }

  AT() {
    return this.getToken(MapParser.AT, 0);
  }

  index() {
    return this.getTypedRuleContext(IndexContext, 0);
  }

  filter() {
    return this.getTypedRuleContext(FilterContext, 0);
  }

  DOTDOT() {
    return this.getToken(MapParser.DOTDOT, 0);
  }

  DOT() {
    return this.getToken(MapParser.DOT, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterSelectorFragment(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitSelectorFragment(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitSelectorFragment(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class NodeNameContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_nodeName;
  }

  ndName() {
    return this.getTypedRuleContext(NdNameContext, 0);
  }

  MUL() {
    return this.getToken(MapParser.MUL, 0);
  }

  nsPrefix() {
    return this.getTypedRuleContext(NsPrefixContext, 0);
  }

  COLON() {
    return this.getToken(MapParser.COLON, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterNodeName(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitNodeName(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitNodeName(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class NsPrefixContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_nsPrefix;
  }

  NCName() {
    return this.getToken(MapParser.NCName, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterNsPrefix(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitNsPrefix(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitNsPrefix(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class NdNameContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_ndName;
  }

  NCName() {
    return this.getToken(MapParser.NCName, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterNdName(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitNdName(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitNdName(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class FilterContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_filter;
  }

  LBRAC() {
    return this.getToken(MapParser.LBRAC, 0);
  }

  RBRAC() {
    return this.getToken(MapParser.RBRAC, 0);
  }

  functionCall() {
    return this.getTypedRuleContext(FunctionCallContext, 0);
  }

  selector() {
    return this.getTypedRuleContext(SelectorContext, 0);
  }

  operatorExp() {
    return this.getTypedRuleContext(OperatorExpContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterFilter(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitFilter(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitFilter(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class IndexContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_index;
  }

  LBRAC() {
    return this.getToken(MapParser.LBRAC, 0);
  }

  Number() {
    return this.getToken(MapParser.Number, 0);
  }

  RBRAC() {
    return this.getToken(MapParser.RBRAC, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterIndex(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitIndex(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitIndex(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class VariableRefContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_variableRef;
  }

  DOL() {
    return this.getToken(MapParser.DOL, 0);
  }

  varName() {
    return this.getTypedRuleContext(VarNameContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterVariableRef(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitVariableRef(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitVariableRef(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class VarNameContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_varName;
  }

  NCName() {
    return this.getToken(MapParser.NCName, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterVarName(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitVarName(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitVarName(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class FunctionCallContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_functionCall;
  }

  functionName() {
    return this.getTypedRuleContext(FunctionNameContext, 0);
  }

  LPAR() {
    return this.getToken(MapParser.LPAR, 0);
  }

  RPAR() {
    return this.getToken(MapParser.RPAR, 0);
  }

  parameter = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTypedRuleContexts(ParameterContext);
    } else {
      return this.getTypedRuleContext(ParameterContext, i);
    }
  };

  COMMA = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTokens(MapParser.COMMA);
    } else {
      return this.getToken(MapParser.COMMA, i);
    }
  };

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterFunctionCall(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitFunctionCall(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitFunctionCall(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class ParameterContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_parameter;
  }

  exp() {
    return this.getTypedRuleContext(ExpContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterParameter(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitParameter(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitParameter(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class FunctionNameContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_functionName;
  }

  NCName() {
    return this.getToken(MapParser.NCName, 0);
  }

  DOL() {
    return this.getToken(MapParser.DOL, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterFunctionName(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitFunctionName(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitFunctionName(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class OperatorExpContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_operatorExp;
  }

  orExp() {
    return this.getTypedRuleContext(OrExpContext, 0);
  }

  unionExp() {
    return this.getTypedRuleContext(UnionExpContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterOperatorExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitOperatorExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitOperatorExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class OrExpContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_orExp;
  }

  andExp = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTypedRuleContexts(AndExpContext);
    } else {
      return this.getTypedRuleContext(AndExpContext, i);
    }
  };

  OR = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTokens(MapParser.OR);
    } else {
      return this.getToken(MapParser.OR, i);
    }
  };

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterOrExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitOrExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitOrExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class AndExpContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_andExp;
  }

  relationalExp = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTypedRuleContexts(RelationalExpContext);
    } else {
      return this.getTypedRuleContext(RelationalExpContext, i);
    }
  };

  AND = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTokens(MapParser.AND);
    } else {
      return this.getToken(MapParser.AND, i);
    }
  };

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterAndExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitAndExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitAndExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class RelationalExpContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_relationalExp;
  }

  additiveExp = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTypedRuleContexts(AdditiveExpContext);
    } else {
      return this.getTypedRuleContext(AdditiveExpContext, i);
    }
  };

  LESS() {
    return this.getToken(MapParser.LESS, 0);
  }

  MORE_() {
    return this.getToken(MapParser.MORE_, 0);
  }

  LE() {
    return this.getToken(MapParser.LE, 0);
  }

  GE() {
    return this.getToken(MapParser.GE, 0);
  }

  EQ() {
    return this.getToken(MapParser.EQ, 0);
  }

  NE() {
    return this.getToken(MapParser.NE, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterRelationalExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitRelationalExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitRelationalExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class AdditiveExpContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_additiveExp;
  }

  multiplicativeExp = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTypedRuleContexts(MultiplicativeExpContext);
    } else {
      return this.getTypedRuleContext(MultiplicativeExpContext, i);
    }
  };

  PLUS = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTokens(MapParser.PLUS);
    } else {
      return this.getToken(MapParser.PLUS, i);
    }
  };

  MINUS = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTokens(MapParser.MINUS);
    } else {
      return this.getToken(MapParser.MINUS, i);
    }
  };

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterAdditiveExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitAdditiveExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitAdditiveExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class MultiplicativeExpContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_multiplicativeExp;
  }

  operand = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTypedRuleContexts(OperandContext);
    } else {
      return this.getTypedRuleContext(OperandContext, i);
    }
  };

  MUL = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTokens(MapParser.MUL);
    } else {
      return this.getToken(MapParser.MUL, i);
    }
  };

  DIV = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTokens(MapParser.DIV);
    } else {
      return this.getToken(MapParser.DIV, i);
    }
  };

  MOD = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTokens(MapParser.MOD);
    } else {
      return this.getToken(MapParser.MOD, i);
    }
  };

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterMultiplicativeExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitMultiplicativeExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitMultiplicativeExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

class OperandContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_operand;
  }

  copyFrom(ctx) {
    super.copyFrom(ctx);
  }
}

class VarOpContext extends OperandContext {
  constructor(parser, ctx) {
    super(parser);
    super.copyFrom(ctx);
  }

  variableRef() {
    return this.getTypedRuleContext(VariableRefContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterVarOp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitVarOp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitVarOp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

MapParser.VarOpContext = VarOpContext;

class FunctionCallOpContext extends OperandContext {
  constructor(parser, ctx) {
    super(parser);
    super.copyFrom(ctx);
  }

  functionCall() {
    return this.getTypedRuleContext(FunctionCallContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterFunctionCallOp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitFunctionCallOp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitFunctionCallOp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

MapParser.FunctionCallOpContext = FunctionCallOpContext;

class BracketOpContext extends OperandContext {
  constructor(parser, ctx) {
    super(parser);
    super.copyFrom(ctx);
  }

  LPAR() {
    return this.getToken(MapParser.LPAR, 0);
  }

  exp() {
    return this.getTypedRuleContext(ExpContext, 0);
  }

  RPAR() {
    return this.getToken(MapParser.RPAR, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterBracketOp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitBracketOp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitBracketOp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

MapParser.BracketOpContext = BracketOpContext;

class SelectorOpContext extends OperandContext {
  constructor(parser, ctx) {
    super(parser);
    super.copyFrom(ctx);
  }

  selector() {
    return this.getTypedRuleContext(SelectorContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterSelectorOp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitSelectorOp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitSelectorOp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

MapParser.SelectorOpContext = SelectorOpContext;

class ConstOpContext extends OperandContext {
  constructor(parser, ctx) {
    super(parser);
    super.copyFrom(ctx);
  }

  constant() {
    return this.getTypedRuleContext(ConstantContext, 0);
  }

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterConstOp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitConstOp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitConstOp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

MapParser.ConstOpContext = ConstOpContext;

class UnionExpContext extends antlr4.ParserRuleContext {
  constructor(parser, parent, invokingState) {
    if (parent === undefined) {
      parent = null;
    }
    if (invokingState === undefined || invokingState === null) {
      invokingState = -1;
    }
    super(parent, invokingState);
    this.parser = parser;
    this.ruleIndex = MapParser.RULE_unionExp;
  }

  selector = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTypedRuleContexts(SelectorContext);
    } else {
      return this.getTypedRuleContext(SelectorContext, i);
    }
  };

  UnionOp = function (i) {
    if (i === undefined) {
      i = null;
    }
    if (i === null) {
      return this.getTokens(MapParser.UnionOp);
    } else {
      return this.getToken(MapParser.UnionOp, i);
    }
  };

  enterRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.enterUnionExp(this);
    }
  }

  exitRule(listener) {
    if (listener instanceof MapParserListener) {
      listener.exitUnionExp(this);
    }
  }

  accept(visitor) {
    if (visitor instanceof MapParserVisitor) {
      return visitor.visitUnionExp(this);
    } else {
      return visitor.visitChildren(this);
    }
  }
}

MapParser.MainContext = MainContext;
MapParser.ExpContext = ExpContext;
MapParser.ConstantContext = ConstantContext;
MapParser.SelectorContext = SelectorContext;
MapParser.SelectorFragmentContext = SelectorFragmentContext;
MapParser.NodeNameContext = NodeNameContext;
MapParser.NsPrefixContext = NsPrefixContext;
MapParser.NdNameContext = NdNameContext;
MapParser.FilterContext = FilterContext;
MapParser.IndexContext = IndexContext;
MapParser.VariableRefContext = VariableRefContext;
MapParser.VarNameContext = VarNameContext;
MapParser.FunctionCallContext = FunctionCallContext;
MapParser.ParameterContext = ParameterContext;
MapParser.FunctionNameContext = FunctionNameContext;
MapParser.OperatorExpContext = OperatorExpContext;
MapParser.OrExpContext = OrExpContext;
MapParser.AndExpContext = AndExpContext;
MapParser.RelationalExpContext = RelationalExpContext;
MapParser.AdditiveExpContext = AdditiveExpContext;
MapParser.MultiplicativeExpContext = MultiplicativeExpContext;
MapParser.OperandContext = OperandContext;
MapParser.UnionExpContext = UnionExpContext;

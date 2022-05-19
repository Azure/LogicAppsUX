// Generated from c:\Users\t-jennlee\source\repos\logic_apps_designer\libs\data-mapper\src\lib\parser\definition\MapLexer.g4 by ANTLR 4.8
import org.antlr.v4.runtime.Lexer;
import org.antlr.v4.runtime.CharStream;
import org.antlr.v4.runtime.Token;
import org.antlr.v4.runtime.TokenStream;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.atn.*;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.misc.*;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast"})
public class MapLexer extends Lexer {
	static { RuntimeMetaData.checkVersion("4.8", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
		new PredictionContextCache();
	public static final int
		Number=1, DOL=2, PATHSEP=3, LPAR=4, RPAR=5, LBRAC=6, RBRAC=7, MINUS=8, 
		PLUS=9, DOT=10, MUL=11, DOTDOT=12, AT=13, COMMA=14, UnionOp=15, LESS=16, 
		MORE_=17, LE=18, GE=19, COLON=20, CC=21, APOS=22, QUOT=23, AND=24, OR=25, 
		DIV=26, MOD=27, EQ=28, NE=29, System=30, NULL_=31, FALSE_=32, TRUE_=33, 
		NIL=34, Literal=35, Whitespace=36, NCName=37;
	public static String[] channelNames = {
		"DEFAULT_TOKEN_CHANNEL", "HIDDEN"
	};

	public static String[] modeNames = {
		"DEFAULT_MODE"
	};

	private static String[] makeRuleNames() {
		return new String[] {
			"Number", "DOL", "PATHSEP", "LPAR", "RPAR", "LBRAC", "RBRAC", "MINUS", 
			"PLUS", "DOT", "MUL", "DOTDOT", "AT", "COMMA", "UnionOp", "LESS", "MORE_", 
			"LE", "GE", "COLON", "CC", "APOS", "QUOT", "AND", "OR", "DIV", "MOD", 
			"EQ", "NE", "System", "NULL_", "FALSE_", "TRUE_", "NIL", "Literal", "Whitespace", 
			"NCName", "Digits", "NCNameStartChar", "NCNameChar"
		};
	}
	public static final String[] ruleNames = makeRuleNames();

	private static String[] makeLiteralNames() {
		return new String[] {
			null, null, "'$'", "'/'", "'('", "')'", "'['", "']'", "'-'", "'+'", "'.'", 
			"'*'", "'..'", "'@'", "','", "'|'", "'<'", "'>'", "'<='", "'>='", "':'", 
			"'::'", "'''", "'\"'", "'and'", "'or'", "'div'", "'mod'", "'='", "'!='", 
			null, "'null'", "'false'", "'true'", "'nil'"
		};
	}
	private static final String[] _LITERAL_NAMES = makeLiteralNames();
	private static String[] makeSymbolicNames() {
		return new String[] {
			null, "Number", "DOL", "PATHSEP", "LPAR", "RPAR", "LBRAC", "RBRAC", "MINUS", 
			"PLUS", "DOT", "MUL", "DOTDOT", "AT", "COMMA", "UnionOp", "LESS", "MORE_", 
			"LE", "GE", "COLON", "CC", "APOS", "QUOT", "AND", "OR", "DIV", "MOD", 
			"EQ", "NE", "System", "NULL_", "FALSE_", "TRUE_", "NIL", "Literal", "Whitespace", 
			"NCName"
		};
	}
	private static final String[] _SYMBOLIC_NAMES = makeSymbolicNames();
	public static final Vocabulary VOCABULARY = new VocabularyImpl(_LITERAL_NAMES, _SYMBOLIC_NAMES);

	/**
	 * @deprecated Use {@link #VOCABULARY} instead.
	 */
	@Deprecated
	public static final String[] tokenNames;
	static {
		tokenNames = new String[_SYMBOLIC_NAMES.length];
		for (int i = 0; i < tokenNames.length; i++) {
			tokenNames[i] = VOCABULARY.getLiteralName(i);
			if (tokenNames[i] == null) {
				tokenNames[i] = VOCABULARY.getSymbolicName(i);
			}

			if (tokenNames[i] == null) {
				tokenNames[i] = "<INVALID>";
			}
		}
	}

	@Override
	@Deprecated
	public String[] getTokenNames() {
		return tokenNames;
	}

	@Override

	public Vocabulary getVocabulary() {
		return VOCABULARY;
	}


	public MapLexer(CharStream input) {
		super(input);
		_interp = new LexerATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}

	@Override
	public String getGrammarFileName() { return "MapLexer.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public String[] getChannelNames() { return channelNames; }

	@Override
	public String[] getModeNames() { return modeNames; }

	@Override
	public ATN getATN() { return _ATN; }

	public static final String _serializedATN =
		"\3\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786\u5964\2\'\u00ea\b\1\4\2\t"+
		"\2\4\3\t\3\4\4\t\4\4\5\t\5\4\6\t\6\4\7\t\7\4\b\t\b\4\t\t\t\4\n\t\n\4\13"+
		"\t\13\4\f\t\f\4\r\t\r\4\16\t\16\4\17\t\17\4\20\t\20\4\21\t\21\4\22\t\22"+
		"\4\23\t\23\4\24\t\24\4\25\t\25\4\26\t\26\4\27\t\27\4\30\t\30\4\31\t\31"+
		"\4\32\t\32\4\33\t\33\4\34\t\34\4\35\t\35\4\36\t\36\4\37\t\37\4 \t \4!"+
		"\t!\4\"\t\"\4#\t#\4$\t$\4%\t%\4&\t&\4\'\t\'\4(\t(\4)\t)\3\2\5\2U\n\2\3"+
		"\2\3\2\3\2\5\2Z\n\2\5\2\\\n\2\3\2\3\2\5\2`\n\2\3\3\3\3\3\4\3\4\3\5\3\5"+
		"\3\6\3\6\3\7\3\7\3\b\3\b\3\t\3\t\3\n\3\n\3\13\3\13\3\f\3\f\3\r\3\r\3\r"+
		"\3\16\3\16\3\17\3\17\3\20\3\20\3\21\3\21\3\22\3\22\3\23\3\23\3\23\3\24"+
		"\3\24\3\24\3\25\3\25\3\26\3\26\3\26\3\27\3\27\3\30\3\30\3\31\3\31\3\31"+
		"\3\31\3\32\3\32\3\32\3\33\3\33\3\33\3\33\3\34\3\34\3\34\3\34\3\35\3\35"+
		"\3\36\3\36\3\36\3\37\3\37\3\37\3\37\5\37\u00aa\n\37\3 \3 \3 \3 \3 \3!"+
		"\3!\3!\3!\3!\3!\3\"\3\"\3\"\3\"\3\"\3#\3#\3#\3#\3$\3$\7$\u00c2\n$\f$\16"+
		"$\u00c5\13$\3$\3$\3$\7$\u00ca\n$\f$\16$\u00cd\13$\3$\5$\u00d0\n$\3%\6"+
		"%\u00d3\n%\r%\16%\u00d4\3%\3%\3&\3&\7&\u00db\n&\f&\16&\u00de\13&\3\'\6"+
		"\'\u00e1\n\'\r\'\16\'\u00e2\3(\3(\3)\3)\5)\u00e9\n)\2\2*\3\3\5\4\7\5\t"+
		"\6\13\7\r\b\17\t\21\n\23\13\25\f\27\r\31\16\33\17\35\20\37\21!\22#\23"+
		"%\24\'\25)\26+\27-\30/\31\61\32\63\33\65\34\67\359\36;\37= ?!A\"C#E$G"+
		"%I&K\'M\2O\2Q\2\3\2\6\3\2$$\3\2))\5\2\13\f\17\17\"\"\7\2/\60\62;\u00b9"+
		"\u00b9\u0302\u0371\u2041\u2042\3\21\2C\2\\\2a\2a\2c\2|\2\u00c2\2\u00d8"+
		"\2\u00da\2\u00f8\2\u00fa\2\u0301\2\u0372\2\u037f\2\u0381\2\u2001\2\u200e"+
		"\2\u200f\2\u2072\2\u2191\2\u2c02\2\u2ff1\2\u3003\2\ud801\2\uf902\2\ufdd1"+
		"\2\ufdf2\2\uffff\2\2\3\1\20\u00f4\2\3\3\2\2\2\2\5\3\2\2\2\2\7\3\2\2\2"+
		"\2\t\3\2\2\2\2\13\3\2\2\2\2\r\3\2\2\2\2\17\3\2\2\2\2\21\3\2\2\2\2\23\3"+
		"\2\2\2\2\25\3\2\2\2\2\27\3\2\2\2\2\31\3\2\2\2\2\33\3\2\2\2\2\35\3\2\2"+
		"\2\2\37\3\2\2\2\2!\3\2\2\2\2#\3\2\2\2\2%\3\2\2\2\2\'\3\2\2\2\2)\3\2\2"+
		"\2\2+\3\2\2\2\2-\3\2\2\2\2/\3\2\2\2\2\61\3\2\2\2\2\63\3\2\2\2\2\65\3\2"+
		"\2\2\2\67\3\2\2\2\29\3\2\2\2\2;\3\2\2\2\2=\3\2\2\2\2?\3\2\2\2\2A\3\2\2"+
		"\2\2C\3\2\2\2\2E\3\2\2\2\2G\3\2\2\2\2I\3\2\2\2\2K\3\2\2\2\3_\3\2\2\2\5"+
		"a\3\2\2\2\7c\3\2\2\2\te\3\2\2\2\13g\3\2\2\2\ri\3\2\2\2\17k\3\2\2\2\21"+
		"m\3\2\2\2\23o\3\2\2\2\25q\3\2\2\2\27s\3\2\2\2\31u\3\2\2\2\33x\3\2\2\2"+
		"\35z\3\2\2\2\37|\3\2\2\2!~\3\2\2\2#\u0080\3\2\2\2%\u0082\3\2\2\2\'\u0085"+
		"\3\2\2\2)\u0088\3\2\2\2+\u008a\3\2\2\2-\u008d\3\2\2\2/\u008f\3\2\2\2\61"+
		"\u0091\3\2\2\2\63\u0095\3\2\2\2\65\u0098\3\2\2\2\67\u009c\3\2\2\29\u00a0"+
		"\3\2\2\2;\u00a2\3\2\2\2=\u00a9\3\2\2\2?\u00ab\3\2\2\2A\u00b0\3\2\2\2C"+
		"\u00b6\3\2\2\2E\u00bb\3\2\2\2G\u00cf\3\2\2\2I\u00d2\3\2\2\2K\u00d8\3\2"+
		"\2\2M\u00e0\3\2\2\2O\u00e4\3\2\2\2Q\u00e8\3\2\2\2SU\7/\2\2TS\3\2\2\2T"+
		"U\3\2\2\2UV\3\2\2\2V[\5M\'\2WY\7\60\2\2XZ\5M\'\2YX\3\2\2\2YZ\3\2\2\2Z"+
		"\\\3\2\2\2[W\3\2\2\2[\\\3\2\2\2\\`\3\2\2\2]^\7\60\2\2^`\5M\'\2_T\3\2\2"+
		"\2_]\3\2\2\2`\4\3\2\2\2ab\7&\2\2b\6\3\2\2\2cd\7\61\2\2d\b\3\2\2\2ef\7"+
		"*\2\2f\n\3\2\2\2gh\7+\2\2h\f\3\2\2\2ij\7]\2\2j\16\3\2\2\2kl\7_\2\2l\20"+
		"\3\2\2\2mn\7/\2\2n\22\3\2\2\2op\7-\2\2p\24\3\2\2\2qr\7\60\2\2r\26\3\2"+
		"\2\2st\7,\2\2t\30\3\2\2\2uv\7\60\2\2vw\7\60\2\2w\32\3\2\2\2xy\7B\2\2y"+
		"\34\3\2\2\2z{\7.\2\2{\36\3\2\2\2|}\7~\2\2} \3\2\2\2~\177\7>\2\2\177\""+
		"\3\2\2\2\u0080\u0081\7@\2\2\u0081$\3\2\2\2\u0082\u0083\7>\2\2\u0083\u0084"+
		"\7?\2\2\u0084&\3\2\2\2\u0085\u0086\7@\2\2\u0086\u0087\7?\2\2\u0087(\3"+
		"\2\2\2\u0088\u0089\7<\2\2\u0089*\3\2\2\2\u008a\u008b\7<\2\2\u008b\u008c"+
		"\7<\2\2\u008c,\3\2\2\2\u008d\u008e\7)\2\2\u008e.\3\2\2\2\u008f\u0090\7"+
		"$\2\2\u0090\60\3\2\2\2\u0091\u0092\7c\2\2\u0092\u0093\7p\2\2\u0093\u0094"+
		"\7f\2\2\u0094\62\3\2\2\2\u0095\u0096\7q\2\2\u0096\u0097\7t\2\2\u0097\64"+
		"\3\2\2\2\u0098\u0099\7f\2\2\u0099\u009a\7k\2\2\u009a\u009b\7x\2\2\u009b"+
		"\66\3\2\2\2\u009c\u009d\7o\2\2\u009d\u009e\7q\2\2\u009e\u009f\7f\2\2\u009f"+
		"8\3\2\2\2\u00a0\u00a1\7?\2\2\u00a1:\3\2\2\2\u00a2\u00a3\7#\2\2\u00a3\u00a4"+
		"\7?\2\2\u00a4<\3\2\2\2\u00a5\u00aa\5? \2\u00a6\u00aa\5E#\2\u00a7\u00aa"+
		"\5C\"\2\u00a8\u00aa\5A!\2\u00a9\u00a5\3\2\2\2\u00a9\u00a6\3\2\2\2\u00a9"+
		"\u00a7\3\2\2\2\u00a9\u00a8\3\2\2\2\u00aa>\3\2\2\2\u00ab\u00ac\7p\2\2\u00ac"+
		"\u00ad\7w\2\2\u00ad\u00ae\7n\2\2\u00ae\u00af\7n\2\2\u00af@\3\2\2\2\u00b0"+
		"\u00b1\7h\2\2\u00b1\u00b2\7c\2\2\u00b2\u00b3\7n\2\2\u00b3\u00b4\7u\2\2"+
		"\u00b4\u00b5\7g\2\2\u00b5B\3\2\2\2\u00b6\u00b7\7v\2\2\u00b7\u00b8\7t\2"+
		"\2\u00b8\u00b9\7w\2\2\u00b9\u00ba\7g\2\2\u00baD\3\2\2\2\u00bb\u00bc\7"+
		"p\2\2\u00bc\u00bd\7k\2\2\u00bd\u00be\7n\2\2\u00beF\3\2\2\2\u00bf\u00c3"+
		"\7$\2\2\u00c0\u00c2\n\2\2\2\u00c1\u00c0\3\2\2\2\u00c2\u00c5\3\2\2\2\u00c3"+
		"\u00c1\3\2\2\2\u00c3\u00c4\3\2\2\2\u00c4\u00c6\3\2\2\2\u00c5\u00c3\3\2"+
		"\2\2\u00c6\u00d0\7$\2\2\u00c7\u00cb\7)\2\2\u00c8\u00ca\n\3\2\2\u00c9\u00c8"+
		"\3\2\2\2\u00ca\u00cd\3\2\2\2\u00cb\u00c9\3\2\2\2\u00cb\u00cc\3\2\2\2\u00cc"+
		"\u00ce\3\2\2\2\u00cd\u00cb\3\2\2\2\u00ce\u00d0\7)\2\2\u00cf\u00bf\3\2"+
		"\2\2\u00cf\u00c7\3\2\2\2\u00d0H\3\2\2\2\u00d1\u00d3\t\4\2\2\u00d2\u00d1"+
		"\3\2\2\2\u00d3\u00d4\3\2\2\2\u00d4\u00d2\3\2\2\2\u00d4\u00d5\3\2\2\2\u00d5"+
		"\u00d6\3\2\2\2\u00d6\u00d7\b%\2\2\u00d7J\3\2\2\2\u00d8\u00dc\5O(\2\u00d9"+
		"\u00db\5Q)\2\u00da\u00d9\3\2\2\2\u00db\u00de\3\2\2\2\u00dc\u00da\3\2\2"+
		"\2\u00dc\u00dd\3\2\2\2\u00ddL\3\2\2\2\u00de\u00dc\3\2\2\2\u00df\u00e1"+
		"\4\62;\2\u00e0\u00df\3\2\2\2\u00e1\u00e2\3\2\2\2\u00e2\u00e0\3\2\2\2\u00e2"+
		"\u00e3\3\2\2\2\u00e3N\3\2\2\2\u00e4\u00e5\t\6\2\2\u00e5P\3\2\2\2\u00e6"+
		"\u00e9\5O(\2\u00e7\u00e9\t\5\2\2\u00e8\u00e6\3\2\2\2\u00e8\u00e7\3\2\2"+
		"\2\u00e9R\3\2\2\2\17\2TY[_\u00a9\u00c3\u00cb\u00cf\u00d4\u00dc\u00e2\u00e8"+
		"\3\b\2\2";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}
// Generated from c:\Users\t-jennlee\source\repos\logic_apps_designer\libs\data-mapper\src\lib\parser\definition\MapParser.g4 by ANTLR 4.8
import org.antlr.v4.runtime.atn.*;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.misc.*;
import org.antlr.v4.runtime.tree.*;
import java.util.List;
import java.util.Iterator;
import java.util.ArrayList;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast"})
public class MapParser extends Parser {
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
	public static final int
		RULE_main = 0, RULE_exp = 1, RULE_constant = 2, RULE_selector = 3, RULE_selectorFragment = 4, 
		RULE_nodeName = 5, RULE_nsPrefix = 6, RULE_ndName = 7, RULE_filter = 8, 
		RULE_index = 9, RULE_variableRef = 10, RULE_varName = 11, RULE_functionCall = 12, 
		RULE_parameter = 13, RULE_functionName = 14, RULE_operatorExp = 15, RULE_orExp = 16, 
		RULE_andExp = 17, RULE_relationalExp = 18, RULE_additiveExp = 19, RULE_multiplicativeExp = 20, 
		RULE_operand = 21, RULE_unionExp = 22;
	private static String[] makeRuleNames() {
		return new String[] {
			"main", "exp", "constant", "selector", "selectorFragment", "nodeName", 
			"nsPrefix", "ndName", "filter", "index", "variableRef", "varName", "functionCall", 
			"parameter", "functionName", "operatorExp", "orExp", "andExp", "relationalExp", 
			"additiveExp", "multiplicativeExp", "operand", "unionExp"
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

	@Override
	public String getGrammarFileName() { return "MapParser.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public ATN getATN() { return _ATN; }

	public MapParser(TokenStream input) {
		super(input);
		_interp = new ParserATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}

	public static class MainContext extends ParserRuleContext {
		public ExpContext exp() {
			return getRuleContext(ExpContext.class,0);
		}
		public TerminalNode EOF() { return getToken(MapParser.EOF, 0); }
		public MainContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_main; }
	}

	public final MainContext main() throws RecognitionException {
		MainContext _localctx = new MainContext(_ctx, getState());
		enterRule(_localctx, 0, RULE_main);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(46);
			exp();
			setState(47);
			match(EOF);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class ExpContext extends ParserRuleContext {
		public ExpContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_exp; }
	 
		public ExpContext() { }
		public void copyFrom(ExpContext ctx) {
			super.copyFrom(ctx);
		}
	}
	public static class FunctionCallExpContext extends ExpContext {
		public FunctionCallContext functionCall() {
			return getRuleContext(FunctionCallContext.class,0);
		}
		public FunctionCallExpContext(ExpContext ctx) { copyFrom(ctx); }
	}
	public static class OprExpContext extends ExpContext {
		public OperatorExpContext operatorExp() {
			return getRuleContext(OperatorExpContext.class,0);
		}
		public OprExpContext(ExpContext ctx) { copyFrom(ctx); }
	}
	public static class VarExpContext extends ExpContext {
		public VariableRefContext variableRef() {
			return getRuleContext(VariableRefContext.class,0);
		}
		public VarExpContext(ExpContext ctx) { copyFrom(ctx); }
	}
	public static class BracketExpContext extends ExpContext {
		public TerminalNode LPAR() { return getToken(MapParser.LPAR, 0); }
		public ExpContext exp() {
			return getRuleContext(ExpContext.class,0);
		}
		public TerminalNode RPAR() { return getToken(MapParser.RPAR, 0); }
		public BracketExpContext(ExpContext ctx) { copyFrom(ctx); }
	}
	public static class ConstExpContext extends ExpContext {
		public ConstantContext constant() {
			return getRuleContext(ConstantContext.class,0);
		}
		public ConstExpContext(ExpContext ctx) { copyFrom(ctx); }
	}
	public static class SelectorExpContext extends ExpContext {
		public SelectorContext selector() {
			return getRuleContext(SelectorContext.class,0);
		}
		public SelectorExpContext(ExpContext ctx) { copyFrom(ctx); }
	}

	public final ExpContext exp() throws RecognitionException {
		ExpContext _localctx = new ExpContext(_ctx, getState());
		enterRule(_localctx, 2, RULE_exp);
		try {
			setState(58);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,0,_ctx) ) {
			case 1:
				_localctx = new ConstExpContext(_localctx);
				enterOuterAlt(_localctx, 1);
				{
				setState(49);
				constant();
				}
				break;
			case 2:
				_localctx = new VarExpContext(_localctx);
				enterOuterAlt(_localctx, 2);
				{
				setState(50);
				variableRef();
				}
				break;
			case 3:
				_localctx = new FunctionCallExpContext(_localctx);
				enterOuterAlt(_localctx, 3);
				{
				setState(51);
				functionCall();
				}
				break;
			case 4:
				_localctx = new BracketExpContext(_localctx);
				enterOuterAlt(_localctx, 4);
				{
				{
				setState(52);
				match(LPAR);
				setState(53);
				exp();
				setState(54);
				match(RPAR);
				}
				}
				break;
			case 5:
				_localctx = new SelectorExpContext(_localctx);
				enterOuterAlt(_localctx, 5);
				{
				setState(56);
				selector();
				}
				break;
			case 6:
				_localctx = new OprExpContext(_localctx);
				enterOuterAlt(_localctx, 6);
				{
				setState(57);
				operatorExp();
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class ConstantContext extends ParserRuleContext {
		public TerminalNode Literal() { return getToken(MapParser.Literal, 0); }
		public TerminalNode Number() { return getToken(MapParser.Number, 0); }
		public TerminalNode System() { return getToken(MapParser.System, 0); }
		public ConstantContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_constant; }
	}

	public final ConstantContext constant() throws RecognitionException {
		ConstantContext _localctx = new ConstantContext(_ctx, getState());
		enterRule(_localctx, 4, RULE_constant);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(60);
			_la = _input.LA(1);
			if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & ((1L << Number) | (1L << System) | (1L << Literal))) != 0)) ) {
			_errHandler.recoverInline(this);
			}
			else {
				if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
				_errHandler.reportMatch(this);
				consume();
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class SelectorContext extends ParserRuleContext {
		public Token absolute;
		public List<SelectorFragmentContext> selectorFragment() {
			return getRuleContexts(SelectorFragmentContext.class);
		}
		public SelectorFragmentContext selectorFragment(int i) {
			return getRuleContext(SelectorFragmentContext.class,i);
		}
		public List<TerminalNode> PATHSEP() { return getTokens(MapParser.PATHSEP); }
		public TerminalNode PATHSEP(int i) {
			return getToken(MapParser.PATHSEP, i);
		}
		public TerminalNode DOL() { return getToken(MapParser.DOL, 0); }
		public TerminalNode LPAR() { return getToken(MapParser.LPAR, 0); }
		public SelectorContext selector() {
			return getRuleContext(SelectorContext.class,0);
		}
		public TerminalNode RPAR() { return getToken(MapParser.RPAR, 0); }
		public SelectorContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_selector; }
	}

	public final SelectorContext selector() throws RecognitionException {
		SelectorContext _localctx = new SelectorContext(_ctx, getState());
		enterRule(_localctx, 6, RULE_selector);
		int _la;
		try {
			setState(78);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case PATHSEP:
			case DOT:
			case MUL:
			case DOTDOT:
			case AT:
			case NCName:
				enterOuterAlt(_localctx, 1);
				{
				setState(63);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==PATHSEP) {
					{
					setState(62);
					((SelectorContext)_localctx).absolute = match(PATHSEP);
					}
				}

				setState(65);
				selectorFragment();
				setState(70);
				_errHandler.sync(this);
				_la = _input.LA(1);
				while (_la==PATHSEP) {
					{
					{
					setState(66);
					match(PATHSEP);
					setState(67);
					selectorFragment();
					}
					}
					setState(72);
					_errHandler.sync(this);
					_la = _input.LA(1);
				}
				}
				break;
			case DOL:
				enterOuterAlt(_localctx, 2);
				{
				setState(73);
				match(DOL);
				setState(74);
				match(LPAR);
				setState(75);
				selector();
				setState(76);
				match(RPAR);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class SelectorFragmentContext extends ParserRuleContext {
		public NodeNameContext nodeName() {
			return getRuleContext(NodeNameContext.class,0);
		}
		public TerminalNode AT() { return getToken(MapParser.AT, 0); }
		public IndexContext index() {
			return getRuleContext(IndexContext.class,0);
		}
		public FilterContext filter() {
			return getRuleContext(FilterContext.class,0);
		}
		public TerminalNode DOTDOT() { return getToken(MapParser.DOTDOT, 0); }
		public TerminalNode DOT() { return getToken(MapParser.DOT, 0); }
		public SelectorFragmentContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_selectorFragment; }
	}

	public final SelectorFragmentContext selectorFragment() throws RecognitionException {
		SelectorFragmentContext _localctx = new SelectorFragmentContext(_ctx, getState());
		enterRule(_localctx, 8, RULE_selectorFragment);
		int _la;
		try {
			setState(93);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case MUL:
			case AT:
			case NCName:
				enterOuterAlt(_localctx, 1);
				{
				{
				setState(81);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==AT) {
					{
					setState(80);
					match(AT);
					}
				}

				setState(83);
				nodeName();
				setState(89);
				_errHandler.sync(this);
				switch ( getInterpreter().adaptivePredict(_input,5,_ctx) ) {
				case 1:
					{
					setState(84);
					index();
					}
					break;
				case 2:
					{
					setState(85);
					filter();
					}
					break;
				case 3:
					{
					setState(86);
					filter();
					setState(87);
					index();
					}
					break;
				}
				}
				}
				break;
			case DOTDOT:
				enterOuterAlt(_localctx, 2);
				{
				setState(91);
				match(DOTDOT);
				}
				break;
			case DOT:
				enterOuterAlt(_localctx, 3);
				{
				setState(92);
				match(DOT);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class NodeNameContext extends ParserRuleContext {
		public NdNameContext ndName() {
			return getRuleContext(NdNameContext.class,0);
		}
		public TerminalNode MUL() { return getToken(MapParser.MUL, 0); }
		public NsPrefixContext nsPrefix() {
			return getRuleContext(NsPrefixContext.class,0);
		}
		public TerminalNode COLON() { return getToken(MapParser.COLON, 0); }
		public NodeNameContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_nodeName; }
	}

	public final NodeNameContext nodeName() throws RecognitionException {
		NodeNameContext _localctx = new NodeNameContext(_ctx, getState());
		enterRule(_localctx, 10, RULE_nodeName);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(98);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,7,_ctx) ) {
			case 1:
				{
				setState(95);
				nsPrefix();
				setState(96);
				match(COLON);
				}
				break;
			}
			setState(102);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case NCName:
				{
				setState(100);
				ndName();
				}
				break;
			case MUL:
				{
				setState(101);
				match(MUL);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class NsPrefixContext extends ParserRuleContext {
		public TerminalNode NCName() { return getToken(MapParser.NCName, 0); }
		public NsPrefixContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_nsPrefix; }
	}

	public final NsPrefixContext nsPrefix() throws RecognitionException {
		NsPrefixContext _localctx = new NsPrefixContext(_ctx, getState());
		enterRule(_localctx, 12, RULE_nsPrefix);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(104);
			match(NCName);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class NdNameContext extends ParserRuleContext {
		public TerminalNode NCName() { return getToken(MapParser.NCName, 0); }
		public NdNameContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_ndName; }
	}

	public final NdNameContext ndName() throws RecognitionException {
		NdNameContext _localctx = new NdNameContext(_ctx, getState());
		enterRule(_localctx, 14, RULE_ndName);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(106);
			match(NCName);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class FilterContext extends ParserRuleContext {
		public TerminalNode LBRAC() { return getToken(MapParser.LBRAC, 0); }
		public TerminalNode RBRAC() { return getToken(MapParser.RBRAC, 0); }
		public FunctionCallContext functionCall() {
			return getRuleContext(FunctionCallContext.class,0);
		}
		public SelectorContext selector() {
			return getRuleContext(SelectorContext.class,0);
		}
		public OperatorExpContext operatorExp() {
			return getRuleContext(OperatorExpContext.class,0);
		}
		public FilterContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_filter; }
	}

	public final FilterContext filter() throws RecognitionException {
		FilterContext _localctx = new FilterContext(_ctx, getState());
		enterRule(_localctx, 16, RULE_filter);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(108);
			match(LBRAC);
			setState(112);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,9,_ctx) ) {
			case 1:
				{
				setState(109);
				functionCall();
				}
				break;
			case 2:
				{
				setState(110);
				selector();
				}
				break;
			case 3:
				{
				setState(111);
				operatorExp();
				}
				break;
			}
			setState(114);
			match(RBRAC);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class IndexContext extends ParserRuleContext {
		public TerminalNode LBRAC() { return getToken(MapParser.LBRAC, 0); }
		public TerminalNode Number() { return getToken(MapParser.Number, 0); }
		public TerminalNode RBRAC() { return getToken(MapParser.RBRAC, 0); }
		public IndexContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_index; }
	}

	public final IndexContext index() throws RecognitionException {
		IndexContext _localctx = new IndexContext(_ctx, getState());
		enterRule(_localctx, 18, RULE_index);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(116);
			match(LBRAC);
			setState(117);
			match(Number);
			setState(118);
			match(RBRAC);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class VariableRefContext extends ParserRuleContext {
		public TerminalNode DOL() { return getToken(MapParser.DOL, 0); }
		public VarNameContext varName() {
			return getRuleContext(VarNameContext.class,0);
		}
		public VariableRefContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_variableRef; }
	}

	public final VariableRefContext variableRef() throws RecognitionException {
		VariableRefContext _localctx = new VariableRefContext(_ctx, getState());
		enterRule(_localctx, 20, RULE_variableRef);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(120);
			match(DOL);
			setState(121);
			varName();
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class VarNameContext extends ParserRuleContext {
		public TerminalNode NCName() { return getToken(MapParser.NCName, 0); }
		public VarNameContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_varName; }
	}

	public final VarNameContext varName() throws RecognitionException {
		VarNameContext _localctx = new VarNameContext(_ctx, getState());
		enterRule(_localctx, 22, RULE_varName);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(123);
			match(NCName);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class FunctionCallContext extends ParserRuleContext {
		public FunctionNameContext functionName() {
			return getRuleContext(FunctionNameContext.class,0);
		}
		public TerminalNode LPAR() { return getToken(MapParser.LPAR, 0); }
		public TerminalNode RPAR() { return getToken(MapParser.RPAR, 0); }
		public List<ParameterContext> parameter() {
			return getRuleContexts(ParameterContext.class);
		}
		public ParameterContext parameter(int i) {
			return getRuleContext(ParameterContext.class,i);
		}
		public List<TerminalNode> COMMA() { return getTokens(MapParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(MapParser.COMMA, i);
		}
		public FunctionCallContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_functionCall; }
	}

	public final FunctionCallContext functionCall() throws RecognitionException {
		FunctionCallContext _localctx = new FunctionCallContext(_ctx, getState());
		enterRule(_localctx, 24, RULE_functionCall);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(125);
			functionName();
			setState(126);
			match(LPAR);
			setState(135);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if ((((_la) & ~0x3f) == 0 && ((1L << _la) & ((1L << Number) | (1L << DOL) | (1L << PATHSEP) | (1L << LPAR) | (1L << DOT) | (1L << MUL) | (1L << DOTDOT) | (1L << AT) | (1L << System) | (1L << Literal) | (1L << NCName))) != 0)) {
				{
				setState(127);
				parameter();
				setState(132);
				_errHandler.sync(this);
				_la = _input.LA(1);
				while (_la==COMMA) {
					{
					{
					setState(128);
					match(COMMA);
					setState(129);
					parameter();
					}
					}
					setState(134);
					_errHandler.sync(this);
					_la = _input.LA(1);
				}
				}
			}

			setState(137);
			match(RPAR);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class ParameterContext extends ParserRuleContext {
		public ExpContext exp() {
			return getRuleContext(ExpContext.class,0);
		}
		public ParameterContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_parameter; }
	}

	public final ParameterContext parameter() throws RecognitionException {
		ParameterContext _localctx = new ParameterContext(_ctx, getState());
		enterRule(_localctx, 26, RULE_parameter);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(139);
			exp();
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class FunctionNameContext extends ParserRuleContext {
		public TerminalNode NCName() { return getToken(MapParser.NCName, 0); }
		public TerminalNode DOL() { return getToken(MapParser.DOL, 0); }
		public FunctionNameContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_functionName; }
	}

	public final FunctionNameContext functionName() throws RecognitionException {
		FunctionNameContext _localctx = new FunctionNameContext(_ctx, getState());
		enterRule(_localctx, 28, RULE_functionName);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(142);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==DOL) {
				{
				setState(141);
				match(DOL);
				}
			}

			setState(144);
			match(NCName);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class OperatorExpContext extends ParserRuleContext {
		public OrExpContext orExp() {
			return getRuleContext(OrExpContext.class,0);
		}
		public UnionExpContext unionExp() {
			return getRuleContext(UnionExpContext.class,0);
		}
		public OperatorExpContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_operatorExp; }
	}

	public final OperatorExpContext operatorExp() throws RecognitionException {
		OperatorExpContext _localctx = new OperatorExpContext(_ctx, getState());
		enterRule(_localctx, 30, RULE_operatorExp);
		try {
			setState(148);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,13,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(146);
				orExp();
				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(147);
				unionExp();
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class OrExpContext extends ParserRuleContext {
		public List<AndExpContext> andExp() {
			return getRuleContexts(AndExpContext.class);
		}
		public AndExpContext andExp(int i) {
			return getRuleContext(AndExpContext.class,i);
		}
		public List<TerminalNode> OR() { return getTokens(MapParser.OR); }
		public TerminalNode OR(int i) {
			return getToken(MapParser.OR, i);
		}
		public OrExpContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_orExp; }
	}

	public final OrExpContext orExp() throws RecognitionException {
		OrExpContext _localctx = new OrExpContext(_ctx, getState());
		enterRule(_localctx, 32, RULE_orExp);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(150);
			andExp();
			setState(155);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==OR) {
				{
				{
				setState(151);
				match(OR);
				setState(152);
				andExp();
				}
				}
				setState(157);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class AndExpContext extends ParserRuleContext {
		public List<RelationalExpContext> relationalExp() {
			return getRuleContexts(RelationalExpContext.class);
		}
		public RelationalExpContext relationalExp(int i) {
			return getRuleContext(RelationalExpContext.class,i);
		}
		public List<TerminalNode> AND() { return getTokens(MapParser.AND); }
		public TerminalNode AND(int i) {
			return getToken(MapParser.AND, i);
		}
		public AndExpContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_andExp; }
	}

	public final AndExpContext andExp() throws RecognitionException {
		AndExpContext _localctx = new AndExpContext(_ctx, getState());
		enterRule(_localctx, 34, RULE_andExp);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(158);
			relationalExp();
			setState(163);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==AND) {
				{
				{
				setState(159);
				match(AND);
				setState(160);
				relationalExp();
				}
				}
				setState(165);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class RelationalExpContext extends ParserRuleContext {
		public List<AdditiveExpContext> additiveExp() {
			return getRuleContexts(AdditiveExpContext.class);
		}
		public AdditiveExpContext additiveExp(int i) {
			return getRuleContext(AdditiveExpContext.class,i);
		}
		public TerminalNode LESS() { return getToken(MapParser.LESS, 0); }
		public TerminalNode MORE_() { return getToken(MapParser.MORE_, 0); }
		public TerminalNode LE() { return getToken(MapParser.LE, 0); }
		public TerminalNode GE() { return getToken(MapParser.GE, 0); }
		public TerminalNode EQ() { return getToken(MapParser.EQ, 0); }
		public TerminalNode NE() { return getToken(MapParser.NE, 0); }
		public RelationalExpContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_relationalExp; }
	}

	public final RelationalExpContext relationalExp() throws RecognitionException {
		RelationalExpContext _localctx = new RelationalExpContext(_ctx, getState());
		enterRule(_localctx, 36, RULE_relationalExp);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(166);
			additiveExp();
			setState(169);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if ((((_la) & ~0x3f) == 0 && ((1L << _la) & ((1L << LESS) | (1L << MORE_) | (1L << LE) | (1L << GE) | (1L << EQ) | (1L << NE))) != 0)) {
				{
				setState(167);
				_la = _input.LA(1);
				if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & ((1L << LESS) | (1L << MORE_) | (1L << LE) | (1L << GE) | (1L << EQ) | (1L << NE))) != 0)) ) {
				_errHandler.recoverInline(this);
				}
				else {
					if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
					_errHandler.reportMatch(this);
					consume();
				}
				setState(168);
				additiveExp();
				}
			}

			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class AdditiveExpContext extends ParserRuleContext {
		public List<MultiplicativeExpContext> multiplicativeExp() {
			return getRuleContexts(MultiplicativeExpContext.class);
		}
		public MultiplicativeExpContext multiplicativeExp(int i) {
			return getRuleContext(MultiplicativeExpContext.class,i);
		}
		public List<TerminalNode> PLUS() { return getTokens(MapParser.PLUS); }
		public TerminalNode PLUS(int i) {
			return getToken(MapParser.PLUS, i);
		}
		public List<TerminalNode> MINUS() { return getTokens(MapParser.MINUS); }
		public TerminalNode MINUS(int i) {
			return getToken(MapParser.MINUS, i);
		}
		public AdditiveExpContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_additiveExp; }
	}

	public final AdditiveExpContext additiveExp() throws RecognitionException {
		AdditiveExpContext _localctx = new AdditiveExpContext(_ctx, getState());
		enterRule(_localctx, 38, RULE_additiveExp);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(171);
			multiplicativeExp();
			setState(176);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==MINUS || _la==PLUS) {
				{
				{
				setState(172);
				_la = _input.LA(1);
				if ( !(_la==MINUS || _la==PLUS) ) {
				_errHandler.recoverInline(this);
				}
				else {
					if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
					_errHandler.reportMatch(this);
					consume();
				}
				setState(173);
				multiplicativeExp();
				}
				}
				setState(178);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class MultiplicativeExpContext extends ParserRuleContext {
		public List<OperandContext> operand() {
			return getRuleContexts(OperandContext.class);
		}
		public OperandContext operand(int i) {
			return getRuleContext(OperandContext.class,i);
		}
		public List<TerminalNode> MUL() { return getTokens(MapParser.MUL); }
		public TerminalNode MUL(int i) {
			return getToken(MapParser.MUL, i);
		}
		public List<TerminalNode> DIV() { return getTokens(MapParser.DIV); }
		public TerminalNode DIV(int i) {
			return getToken(MapParser.DIV, i);
		}
		public List<TerminalNode> MOD() { return getTokens(MapParser.MOD); }
		public TerminalNode MOD(int i) {
			return getToken(MapParser.MOD, i);
		}
		public MultiplicativeExpContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_multiplicativeExp; }
	}

	public final MultiplicativeExpContext multiplicativeExp() throws RecognitionException {
		MultiplicativeExpContext _localctx = new MultiplicativeExpContext(_ctx, getState());
		enterRule(_localctx, 40, RULE_multiplicativeExp);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(179);
			operand();
			setState(184);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while ((((_la) & ~0x3f) == 0 && ((1L << _la) & ((1L << MUL) | (1L << DIV) | (1L << MOD))) != 0)) {
				{
				{
				setState(180);
				_la = _input.LA(1);
				if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & ((1L << MUL) | (1L << DIV) | (1L << MOD))) != 0)) ) {
				_errHandler.recoverInline(this);
				}
				else {
					if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
					_errHandler.reportMatch(this);
					consume();
				}
				setState(181);
				operand();
				}
				}
				setState(186);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class OperandContext extends ParserRuleContext {
		public OperandContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_operand; }
	 
		public OperandContext() { }
		public void copyFrom(OperandContext ctx) {
			super.copyFrom(ctx);
		}
	}
	public static class VarOpContext extends OperandContext {
		public VariableRefContext variableRef() {
			return getRuleContext(VariableRefContext.class,0);
		}
		public VarOpContext(OperandContext ctx) { copyFrom(ctx); }
	}
	public static class FunctionCallOpContext extends OperandContext {
		public FunctionCallContext functionCall() {
			return getRuleContext(FunctionCallContext.class,0);
		}
		public FunctionCallOpContext(OperandContext ctx) { copyFrom(ctx); }
	}
	public static class BracketOpContext extends OperandContext {
		public TerminalNode LPAR() { return getToken(MapParser.LPAR, 0); }
		public ExpContext exp() {
			return getRuleContext(ExpContext.class,0);
		}
		public TerminalNode RPAR() { return getToken(MapParser.RPAR, 0); }
		public BracketOpContext(OperandContext ctx) { copyFrom(ctx); }
	}
	public static class SelectorOpContext extends OperandContext {
		public SelectorContext selector() {
			return getRuleContext(SelectorContext.class,0);
		}
		public SelectorOpContext(OperandContext ctx) { copyFrom(ctx); }
	}
	public static class ConstOpContext extends OperandContext {
		public ConstantContext constant() {
			return getRuleContext(ConstantContext.class,0);
		}
		public ConstOpContext(OperandContext ctx) { copyFrom(ctx); }
	}

	public final OperandContext operand() throws RecognitionException {
		OperandContext _localctx = new OperandContext(_ctx, getState());
		enterRule(_localctx, 42, RULE_operand);
		try {
			setState(195);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,19,_ctx) ) {
			case 1:
				_localctx = new ConstOpContext(_localctx);
				enterOuterAlt(_localctx, 1);
				{
				setState(187);
				constant();
				}
				break;
			case 2:
				_localctx = new VarOpContext(_localctx);
				enterOuterAlt(_localctx, 2);
				{
				setState(188);
				variableRef();
				}
				break;
			case 3:
				_localctx = new FunctionCallOpContext(_localctx);
				enterOuterAlt(_localctx, 3);
				{
				setState(189);
				functionCall();
				}
				break;
			case 4:
				_localctx = new BracketOpContext(_localctx);
				enterOuterAlt(_localctx, 4);
				{
				{
				setState(190);
				match(LPAR);
				setState(191);
				exp();
				setState(192);
				match(RPAR);
				}
				}
				break;
			case 5:
				_localctx = new SelectorOpContext(_localctx);
				enterOuterAlt(_localctx, 5);
				{
				setState(194);
				selector();
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class UnionExpContext extends ParserRuleContext {
		public List<SelectorContext> selector() {
			return getRuleContexts(SelectorContext.class);
		}
		public SelectorContext selector(int i) {
			return getRuleContext(SelectorContext.class,i);
		}
		public List<TerminalNode> UnionOp() { return getTokens(MapParser.UnionOp); }
		public TerminalNode UnionOp(int i) {
			return getToken(MapParser.UnionOp, i);
		}
		public UnionExpContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_unionExp; }
	}

	public final UnionExpContext unionExp() throws RecognitionException {
		UnionExpContext _localctx = new UnionExpContext(_ctx, getState());
		enterRule(_localctx, 44, RULE_unionExp);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(197);
			selector();
			setState(200); 
			_errHandler.sync(this);
			_la = _input.LA(1);
			do {
				{
				{
				setState(198);
				match(UnionOp);
				setState(199);
				selector();
				}
				}
				setState(202); 
				_errHandler.sync(this);
				_la = _input.LA(1);
			} while ( _la==UnionOp );
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static final String _serializedATN =
		"\3\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786\u5964\3\'\u00cf\4\2\t\2\4"+
		"\3\t\3\4\4\t\4\4\5\t\5\4\6\t\6\4\7\t\7\4\b\t\b\4\t\t\t\4\n\t\n\4\13\t"+
		"\13\4\f\t\f\4\r\t\r\4\16\t\16\4\17\t\17\4\20\t\20\4\21\t\21\4\22\t\22"+
		"\4\23\t\23\4\24\t\24\4\25\t\25\4\26\t\26\4\27\t\27\4\30\t\30\3\2\3\2\3"+
		"\2\3\3\3\3\3\3\3\3\3\3\3\3\3\3\3\3\3\3\5\3=\n\3\3\4\3\4\3\5\5\5B\n\5\3"+
		"\5\3\5\3\5\7\5G\n\5\f\5\16\5J\13\5\3\5\3\5\3\5\3\5\3\5\5\5Q\n\5\3\6\5"+
		"\6T\n\6\3\6\3\6\3\6\3\6\3\6\3\6\5\6\\\n\6\3\6\3\6\5\6`\n\6\3\7\3\7\3\7"+
		"\5\7e\n\7\3\7\3\7\5\7i\n\7\3\b\3\b\3\t\3\t\3\n\3\n\3\n\3\n\5\ns\n\n\3"+
		"\n\3\n\3\13\3\13\3\13\3\13\3\f\3\f\3\f\3\r\3\r\3\16\3\16\3\16\3\16\3\16"+
		"\7\16\u0085\n\16\f\16\16\16\u0088\13\16\5\16\u008a\n\16\3\16\3\16\3\17"+
		"\3\17\3\20\5\20\u0091\n\20\3\20\3\20\3\21\3\21\5\21\u0097\n\21\3\22\3"+
		"\22\3\22\7\22\u009c\n\22\f\22\16\22\u009f\13\22\3\23\3\23\3\23\7\23\u00a4"+
		"\n\23\f\23\16\23\u00a7\13\23\3\24\3\24\3\24\5\24\u00ac\n\24\3\25\3\25"+
		"\3\25\7\25\u00b1\n\25\f\25\16\25\u00b4\13\25\3\26\3\26\3\26\7\26\u00b9"+
		"\n\26\f\26\16\26\u00bc\13\26\3\27\3\27\3\27\3\27\3\27\3\27\3\27\3\27\5"+
		"\27\u00c6\n\27\3\30\3\30\3\30\6\30\u00cb\n\30\r\30\16\30\u00cc\3\30\2"+
		"\2\31\2\4\6\b\n\f\16\20\22\24\26\30\32\34\36 \"$&(*,.\2\6\5\2\3\3  %%"+
		"\4\2\22\25\36\37\3\2\n\13\4\2\r\r\34\35\2\u00d7\2\60\3\2\2\2\4<\3\2\2"+
		"\2\6>\3\2\2\2\bP\3\2\2\2\n_\3\2\2\2\fd\3\2\2\2\16j\3\2\2\2\20l\3\2\2\2"+
		"\22n\3\2\2\2\24v\3\2\2\2\26z\3\2\2\2\30}\3\2\2\2\32\177\3\2\2\2\34\u008d"+
		"\3\2\2\2\36\u0090\3\2\2\2 \u0096\3\2\2\2\"\u0098\3\2\2\2$\u00a0\3\2\2"+
		"\2&\u00a8\3\2\2\2(\u00ad\3\2\2\2*\u00b5\3\2\2\2,\u00c5\3\2\2\2.\u00c7"+
		"\3\2\2\2\60\61\5\4\3\2\61\62\7\2\2\3\62\3\3\2\2\2\63=\5\6\4\2\64=\5\26"+
		"\f\2\65=\5\32\16\2\66\67\7\6\2\2\678\5\4\3\289\7\7\2\29=\3\2\2\2:=\5\b"+
		"\5\2;=\5 \21\2<\63\3\2\2\2<\64\3\2\2\2<\65\3\2\2\2<\66\3\2\2\2<:\3\2\2"+
		"\2<;\3\2\2\2=\5\3\2\2\2>?\t\2\2\2?\7\3\2\2\2@B\7\5\2\2A@\3\2\2\2AB\3\2"+
		"\2\2BC\3\2\2\2CH\5\n\6\2DE\7\5\2\2EG\5\n\6\2FD\3\2\2\2GJ\3\2\2\2HF\3\2"+
		"\2\2HI\3\2\2\2IQ\3\2\2\2JH\3\2\2\2KL\7\4\2\2LM\7\6\2\2MN\5\b\5\2NO\7\7"+
		"\2\2OQ\3\2\2\2PA\3\2\2\2PK\3\2\2\2Q\t\3\2\2\2RT\7\17\2\2SR\3\2\2\2ST\3"+
		"\2\2\2TU\3\2\2\2U[\5\f\7\2V\\\5\24\13\2W\\\5\22\n\2XY\5\22\n\2YZ\5\24"+
		"\13\2Z\\\3\2\2\2[V\3\2\2\2[W\3\2\2\2[X\3\2\2\2[\\\3\2\2\2\\`\3\2\2\2]"+
		"`\7\16\2\2^`\7\f\2\2_S\3\2\2\2_]\3\2\2\2_^\3\2\2\2`\13\3\2\2\2ab\5\16"+
		"\b\2bc\7\26\2\2ce\3\2\2\2da\3\2\2\2de\3\2\2\2eh\3\2\2\2fi\5\20\t\2gi\7"+
		"\r\2\2hf\3\2\2\2hg\3\2\2\2i\r\3\2\2\2jk\7\'\2\2k\17\3\2\2\2lm\7\'\2\2"+
		"m\21\3\2\2\2nr\7\b\2\2os\5\32\16\2ps\5\b\5\2qs\5 \21\2ro\3\2\2\2rp\3\2"+
		"\2\2rq\3\2\2\2st\3\2\2\2tu\7\t\2\2u\23\3\2\2\2vw\7\b\2\2wx\7\3\2\2xy\7"+
		"\t\2\2y\25\3\2\2\2z{\7\4\2\2{|\5\30\r\2|\27\3\2\2\2}~\7\'\2\2~\31\3\2"+
		"\2\2\177\u0080\5\36\20\2\u0080\u0089\7\6\2\2\u0081\u0086\5\34\17\2\u0082"+
		"\u0083\7\20\2\2\u0083\u0085\5\34\17\2\u0084\u0082\3\2\2\2\u0085\u0088"+
		"\3\2\2\2\u0086\u0084\3\2\2\2\u0086\u0087\3\2\2\2\u0087\u008a\3\2\2\2\u0088"+
		"\u0086\3\2\2\2\u0089\u0081\3\2\2\2\u0089\u008a\3\2\2\2\u008a\u008b\3\2"+
		"\2\2\u008b\u008c\7\7\2\2\u008c\33\3\2\2\2\u008d\u008e\5\4\3\2\u008e\35"+
		"\3\2\2\2\u008f\u0091\7\4\2\2\u0090\u008f\3\2\2\2\u0090\u0091\3\2\2\2\u0091"+
		"\u0092\3\2\2\2\u0092\u0093\7\'\2\2\u0093\37\3\2\2\2\u0094\u0097\5\"\22"+
		"\2\u0095\u0097\5.\30\2\u0096\u0094\3\2\2\2\u0096\u0095\3\2\2\2\u0097!"+
		"\3\2\2\2\u0098\u009d\5$\23\2\u0099\u009a\7\33\2\2\u009a\u009c\5$\23\2"+
		"\u009b\u0099\3\2\2\2\u009c\u009f\3\2\2\2\u009d\u009b\3\2\2\2\u009d\u009e"+
		"\3\2\2\2\u009e#\3\2\2\2\u009f\u009d\3\2\2\2\u00a0\u00a5\5&\24\2\u00a1"+
		"\u00a2\7\32\2\2\u00a2\u00a4\5&\24\2\u00a3\u00a1\3\2\2\2\u00a4\u00a7\3"+
		"\2\2\2\u00a5\u00a3\3\2\2\2\u00a5\u00a6\3\2\2\2\u00a6%\3\2\2\2\u00a7\u00a5"+
		"\3\2\2\2\u00a8\u00ab\5(\25\2\u00a9\u00aa\t\3\2\2\u00aa\u00ac\5(\25\2\u00ab"+
		"\u00a9\3\2\2\2\u00ab\u00ac\3\2\2\2\u00ac\'\3\2\2\2\u00ad\u00b2\5*\26\2"+
		"\u00ae\u00af\t\4\2\2\u00af\u00b1\5*\26\2\u00b0\u00ae\3\2\2\2\u00b1\u00b4"+
		"\3\2\2\2\u00b2\u00b0\3\2\2\2\u00b2\u00b3\3\2\2\2\u00b3)\3\2\2\2\u00b4"+
		"\u00b2\3\2\2\2\u00b5\u00ba\5,\27\2\u00b6\u00b7\t\5\2\2\u00b7\u00b9\5,"+
		"\27\2\u00b8\u00b6\3\2\2\2\u00b9\u00bc\3\2\2\2\u00ba\u00b8\3\2\2\2\u00ba"+
		"\u00bb\3\2\2\2\u00bb+\3\2\2\2\u00bc\u00ba\3\2\2\2\u00bd\u00c6\5\6\4\2"+
		"\u00be\u00c6\5\26\f\2\u00bf\u00c6\5\32\16\2\u00c0\u00c1\7\6\2\2\u00c1"+
		"\u00c2\5\4\3\2\u00c2\u00c3\7\7\2\2\u00c3\u00c6\3\2\2\2\u00c4\u00c6\5\b"+
		"\5\2\u00c5\u00bd\3\2\2\2\u00c5\u00be\3\2\2\2\u00c5\u00bf\3\2\2\2\u00c5"+
		"\u00c0\3\2\2\2\u00c5\u00c4\3\2\2\2\u00c6-\3\2\2\2\u00c7\u00ca\5\b\5\2"+
		"\u00c8\u00c9\7\21\2\2\u00c9\u00cb\5\b\5\2\u00ca\u00c8\3\2\2\2\u00cb\u00cc"+
		"\3\2\2\2\u00cc\u00ca\3\2\2\2\u00cc\u00cd\3\2\2\2\u00cd/\3\2\2\2\27<AH"+
		"PS[_dhr\u0086\u0089\u0090\u0096\u009d\u00a5\u00ab\u00b2\u00ba\u00c5\u00cc";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}
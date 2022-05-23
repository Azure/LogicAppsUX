parser grammar MapParser;
options {
    //language  =  'CSharp';
    tokenVocab = MapLexer;
}

main: exp EOF;

//map: node;
//node: nodeName KEYEND (SPACE | LINE_BREAK) nodeValue;
//nodeValue: exp | (INDENT node DEDENT)+;

exp: constant # ConstExp
| variableRef # VarExp
| functionCall # FunctionCallExp
| (LPAR exp RPAR) # BracketExp //Bracket expression are only used when we start to have operators.
| selector # SelectorExp
| operatorExp # OprExp
;

constant: Literal |  Number | System;
selector: absolute=PATHSEP? selectorFragment (PATHSEP selectorFragment)* | DOL LPAR selector RPAR;
selectorFragment: (AT? nodeName (index | filter | filter index)?) | DOTDOT | DOT;
nodeName: (nsPrefix COLON)? (ndName | MUL);
nsPrefix: NCName;
ndName: NCName;
filter: LBRAC (functionCall | selector | operatorExp) RBRAC;
index: LBRAC Number RBRAC; // only support constant number as index for now.
variableRef: DOL varName;
varName: NCName;
functionCall  : functionName LPAR ( parameter ( COMMA parameter )* )? RPAR;
parameter: exp;
functionName: DOL? NCName;

operatorExp: orExp | unionExp;
orExp  :  andExp (OR andExp)* ;
andExp  :  relationalExp (AND relationalExp)*;
relationalExp:  additiveExp ((LESS|MORE_|LE|GE|EQ|NE) additiveExp)?;
additiveExp:  multiplicativeExp ((PLUS|MINUS) multiplicativeExp)*;
multiplicativeExp :   operand ((MUL|DIV|MOD) operand)*;

// at this level operand will not be operatorExp.
operand: constant # ConstOp
| variableRef # VarOp
| functionCall # FunctionCallOp
| (LPAR exp RPAR) # BracketOp
| selector # SelectorOp
;
unionExp:  selector (UnionOp selector)+;  // TBD: we can consider Union are only for direct selectors 
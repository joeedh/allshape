
# template_parsetab.py
# This file is automatically generated. Do not edit.
_tabversion = '3.2'

_lr_method = 'LALR'

_lr_signature = b'\xea\xa7\x9f\x98\x18\xb7\xa6\x10K\x93M\x1f\xaf"U\x7f'
    
_lr_action_items = {'SHORT':([4,5,10,16,21,23,24,29,33,34,],[-64,15,15,-88,15,15,-89,-89,15,15,]),'INT':([4,5,10,16,21,23,24,29,33,34,],[-64,8,8,-88,8,8,-89,-89,8,8,]),'DOUBLE':([4,5,10,16,21,23,24,29,33,34,],[-64,9,9,-88,9,9,-89,-89,9,9,]),'ASSIGN':([7,8,9,11,12,13,15,17,18,19,22,25,26,30,35,],[23,-80,-83,-86,-82,-84,-81,-85,-74,-79,-65,-87,-78,34,-60,]),'FLOAT':([4,5,10,16,21,23,24,29,33,34,],[-64,12,12,-88,12,12,-89,-89,12,12,]),'INFERRED':([4,5,10,16,21,23,24,29,33,34,],[-64,11,11,-88,11,11,-89,-89,11,11,]),'TLTHAN':([0,7,8,9,11,12,13,15,17,18,19,22,25,26,27,30,31,35,36,37,],[4,4,-80,-83,-86,-82,-84,-81,-85,-74,-79,-65,-87,-78,4,4,4,-60,4,4,]),'CHAR':([4,5,10,16,21,23,24,29,33,34,],[-64,13,13,-88,13,13,-89,-89,13,13,]),'TGTHAN':([6,7,8,9,11,12,13,14,15,17,18,19,22,25,26,27,30,31,32,35,36,37,],[22,-47,-80,-83,-86,-82,-84,22,-81,-85,-74,-79,-65,-87,-78,-90,-49,-48,22,-60,-91,-50,]),'TYPEOF':([4,5,24,29,],[-64,16,16,16,]),'COMMA':([6,7,8,9,11,12,13,14,15,17,18,19,22,25,26,27,30,31,32,35,36,37,],[21,-47,-80,-83,-86,-82,-84,29,-81,-85,-74,-79,-65,-87,-78,-90,-49,-48,29,-60,-91,-50,]),'BYTE':([4,5,10,16,21,23,24,29,33,34,],[-64,17,17,-88,17,17,-89,-89,17,17,]),'ID':([4,5,7,8,9,10,11,12,13,15,16,17,18,19,21,22,23,24,25,26,27,29,30,31,33,34,35,36,37,],[-64,18,18,-80,-83,18,-86,-82,-84,-81,-88,-85,-74,-79,18,-65,18,-89,-87,-78,18,-89,18,18,18,18,-60,18,18,]),'$end':([1,2,3,20,22,28,],[-63,-62,0,-51,-65,-61,]),}

_lr_action = { }
for _k, _v in _lr_action_items.items():
   for _x,_y in zip(_v[0],_v[1]):
      if not _x in _lr_action:  _lr_action[_x] = { }
      _lr_action[_x][_k] = _y
del _lr_action_items

_lr_goto_items = {'templatedeflist':([5,],[6,]),'gthan_restrict':([6,14,32,],[20,28,35,]),'template_ref_validate':([0,],[1,]),'lthan_restrict':([0,7,27,30,31,36,37,],[5,24,24,24,24,24,24,]),'var_type':([5,10,21,23,33,34,],[7,27,30,31,36,37,]),'template_validate':([0,],[3,]),'typeof_opt':([5,24,29,],[10,10,33,]),'simple_templatedeflist':([5,24,],[14,32,]),'template':([0,],[2,]),'template_ref':([7,27,30,31,36,37,],[25,25,25,25,25,25,]),'id_var_type':([5,7,10,21,23,27,30,31,33,34,36,37,],[19,26,19,19,19,26,26,26,19,19,26,26,]),}

_lr_goto = { }
for _k, _v in _lr_goto_items.items():
   for _x,_y in zip(_v[0],_v[1]):
       if not _x in _lr_goto: _lr_goto[_x] = { }
       _lr_goto[_x][_k] = _y
del _lr_goto_items
_lr_productions = [
  ("S' -> template_validate","S'",1,None,None,None),
  ('statementlist -> statement','statementlist',1,'p_statementlist','/home/joeedh/dev/allshape/js_parser/js_parse.py',254),
  ('statementlist -> statement_nonctrl','statementlist',1,'p_statementlist','/home/joeedh/dev/allshape/js_parser/js_parse.py',255),
  ('statementlist -> statementlist statement','statementlist',2,'p_statementlist','/home/joeedh/dev/allshape/js_parser/js_parse.py',256),
  ('statementlist -> statementlist statement_nonctrl','statementlist',2,'p_statementlist','/home/joeedh/dev/allshape/js_parser/js_parse.py',257),
  ('statementlist -> <empty>','statementlist',0,'p_statementlist','/home/joeedh/dev/allshape/js_parser/js_parse.py',258),
  ('push_scope -> <empty>','push_scope',0,'p_push_scope','/home/joeedh/dev/allshape/js_parser/js_parse.py',278),
  ('pop_scope -> <empty>','pop_scope',0,'p_pop_scope','/home/joeedh/dev/allshape/js_parser/js_parse.py',283),
  ('opt_colon_type -> COLON var_type','opt_colon_type',2,'p_opt_colon_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',288),
  ('opt_colon_type -> <empty>','opt_colon_type',0,'p_opt_colon_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',289),
  ('assign_statement -> assign COLON var_type','assign_statement',3,'p_assign_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',295),
  ('assign_statement -> <empty>','assign_statement',0,'p_assign_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',296),
  ('statement -> function','statement',1,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',303),
  ('statement -> if','statement',1,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',304),
  ('statement -> else','statement',1,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',305),
  ('statement -> while','statement',1,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',306),
  ('statement -> with','statement',1,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',307),
  ('statement -> dowhile','statement',1,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',308),
  ('statement -> for','statement',1,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',309),
  ('statement -> return SEMI','statement',2,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',310),
  ('statement -> yield SEMI','statement',2,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',311),
  ('statement -> break SEMI','statement',2,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',312),
  ('statement -> continue SEMI','statement',2,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',313),
  ('statement -> throw SEMI','statement',2,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',314),
  ('statement -> try','statement',1,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',315),
  ('statement -> catch','statement',1,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',316),
  ('statement -> switch','statement',1,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',317),
  ('statement -> func_native SEMI','statement',2,'p_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',318),
  ('statement_nonctrl -> expr SEMI','statement_nonctrl',2,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',348),
  ('statement_nonctrl -> var_decl SEMI','statement_nonctrl',2,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',349),
  ('statement_nonctrl -> funcref SEMI','statement_nonctrl',2,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',350),
  ('statement_nonctrl -> SEMI','statement_nonctrl',1,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',351),
  ('statement_nonctrl -> if','statement_nonctrl',1,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',352),
  ('statement_nonctrl -> else','statement_nonctrl',1,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',353),
  ('statement_nonctrl -> for','statement_nonctrl',1,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',354),
  ('statement_nonctrl -> dowhile','statement_nonctrl',1,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',355),
  ('statement_nonctrl -> while','statement_nonctrl',1,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',356),
  ('statement_nonctrl -> return SEMI','statement_nonctrl',2,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',357),
  ('statement_nonctrl -> yield SEMI','statement_nonctrl',2,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',358),
  ('statement_nonctrl -> break SEMI','statement_nonctrl',2,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',359),
  ('statement_nonctrl -> continue SEMI','statement_nonctrl',2,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',360),
  ('statement_nonctrl -> throw SEMI','statement_nonctrl',2,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',361),
  ('statement_nonctrl -> try','statement_nonctrl',1,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',362),
  ('statement_nonctrl -> catch','statement_nonctrl',1,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',363),
  ('statement_nonctrl -> delete SEMI','statement_nonctrl',2,'p_statement_nonctrl','/home/joeedh/dev/allshape/js_parser/js_parse.py',364),
  ('var_decl_or_type -> var_decl','var_decl_or_type',1,'p_var_decl_or_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',393),
  ('var_decl_or_type -> var_type','var_decl_or_type',1,'p_var_decl_or_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',394),
  ('templatedeflist -> var_type','templatedeflist',1,'p_templatedeflist','/home/joeedh/dev/allshape/js_parser/js_parse.py',402),
  ('templatedeflist -> var_type ASSIGN var_type','templatedeflist',3,'p_templatedeflist','/home/joeedh/dev/allshape/js_parser/js_parse.py',403),
  ('templatedeflist -> templatedeflist COMMA var_type','templatedeflist',3,'p_templatedeflist','/home/joeedh/dev/allshape/js_parser/js_parse.py',404),
  ('templatedeflist -> templatedeflist COMMA var_type ASSIGN var_type','templatedeflist',5,'p_templatedeflist','/home/joeedh/dev/allshape/js_parser/js_parse.py',405),
  ('template -> lthan_restrict templatedeflist gthan_restrict','template',3,'p_template','/home/joeedh/dev/allshape/js_parser/js_parse.py',422),
  ('type_modifiers -> type_modifiers UNSIGNED','type_modifiers',2,'p_type_modifiers','/home/joeedh/dev/allshape/js_parser/js_parse.py',429),
  ('type_modifiers -> type_modifiers SIGNED','type_modifiers',2,'p_type_modifiers','/home/joeedh/dev/allshape/js_parser/js_parse.py',430),
  ('type_modifiers -> type_modifiers CONST','type_modifiers',2,'p_type_modifiers','/home/joeedh/dev/allshape/js_parser/js_parse.py',431),
  ('type_modifiers -> GLOBAL','type_modifiers',1,'p_type_modifiers','/home/joeedh/dev/allshape/js_parser/js_parse.py',432),
  ('type_modifiers -> VAR','type_modifiers',1,'p_type_modifiers','/home/joeedh/dev/allshape/js_parser/js_parse.py',433),
  ('left_id -> ID','left_id',1,'p_left_id','/home/joeedh/dev/allshape/js_parser/js_parse.py',450),
  ('id_opt -> ID','id_opt',1,'p_id_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',454),
  ('id_opt -> <empty>','id_opt',0,'p_id_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',455),
  ('template_ref -> lthan_restrict simple_templatedeflist gthan_restrict','template_ref',3,'p_template_ref','/home/joeedh/dev/allshape/js_parser/js_parse.py',461),
  ('template_ref_validate -> lthan_restrict simple_templatedeflist gthan_restrict','template_ref_validate',3,'p_template_ref_validate','/home/joeedh/dev/allshape/js_parser/js_parse.py',466),
  ('template_validate -> template','template_validate',1,'p_template_validate','/home/joeedh/dev/allshape/js_parser/js_parse.py',472),
  ('template_validate -> template_ref_validate','template_validate',1,'p_template_validate','/home/joeedh/dev/allshape/js_parser/js_parse.py',473),
  ('lthan_restrict -> TLTHAN','lthan_restrict',1,'p_lthan_restrict','/home/joeedh/dev/allshape/js_parser/js_parse.py',480),
  ('gthan_restrict -> TGTHAN','gthan_restrict',1,'p_gthan_restrict','/home/joeedh/dev/allshape/js_parser/js_parse.py',496),
  ('id_1 -> ID','id_1',1,'p_id1','/home/joeedh/dev/allshape/js_parser/js_parse.py',504),
  ('var_decl_no_list -> var_type','var_decl_no_list',1,'p_var_decl_no_list','/home/joeedh/dev/allshape/js_parser/js_parse.py',510),
  ('var_decl_no_list -> type_modifiers var_decl_no_list','var_decl_no_list',2,'p_var_decl_no_list','/home/joeedh/dev/allshape/js_parser/js_parse.py',511),
  ('var_decl_no_list -> var_decl_no_list ASSIGN expr','var_decl_no_list',3,'p_var_decl_no_list','/home/joeedh/dev/allshape/js_parser/js_parse.py',512),
  ('var_decl -> type_modifiers var_type','var_decl',2,'p_var_decl','/home/joeedh/dev/allshape/js_parser/js_parse.py',569),
  ('var_decl -> var_decl ASSIGN expr','var_decl',3,'p_var_decl','/home/joeedh/dev/allshape/js_parser/js_parse.py',570),
  ('var_decl -> var_decl COMMA ID','var_decl',3,'p_var_decl','/home/joeedh/dev/allshape/js_parser/js_parse.py',571),
  ('var_decl -> var_decl COMMA ID ASSIGN expr','var_decl',5,'p_var_decl','/home/joeedh/dev/allshape/js_parser/js_parse.py',572),
  ('id_var_type -> ID','id_var_type',1,'p_id_var_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',639),
  ('id_var_decl -> ID','id_var_decl',1,'p_id_var_decl','/home/joeedh/dev/allshape/js_parser/js_parse.py',645),
  ('empty -> empty','empty',1,'p_empty','/home/joeedh/dev/allshape/js_parser/js_parse.py',651),
  ('empty -> <empty>','empty',0,'p_empty','/home/joeedh/dev/allshape/js_parser/js_parse.py',652),
  ('var_type -> var_type id_var_type','var_type',2,'p_var_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',657),
  ('var_type -> id_var_type','var_type',1,'p_var_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',658),
  ('var_type -> INT','var_type',1,'p_var_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',659),
  ('var_type -> SHORT','var_type',1,'p_var_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',660),
  ('var_type -> FLOAT','var_type',1,'p_var_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',661),
  ('var_type -> DOUBLE','var_type',1,'p_var_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',662),
  ('var_type -> CHAR','var_type',1,'p_var_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',663),
  ('var_type -> BYTE','var_type',1,'p_var_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',664),
  ('var_type -> INFERRED','var_type',1,'p_var_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',665),
  ('var_type -> var_type template_ref','var_type',2,'p_var_type','/home/joeedh/dev/allshape/js_parser/js_parse.py',666),
  ('typeof_opt -> TYPEOF','typeof_opt',1,'p_typeof_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',759),
  ('typeof_opt -> <empty>','typeof_opt',0,'p_typeof_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',760),
  ('simple_templatedeflist -> typeof_opt var_type','simple_templatedeflist',2,'p_simple_templatedeflist','/home/joeedh/dev/allshape/js_parser/js_parse.py',768),
  ('simple_templatedeflist -> simple_templatedeflist COMMA typeof_opt var_type','simple_templatedeflist',4,'p_simple_templatedeflist','/home/joeedh/dev/allshape/js_parser/js_parse.py',769),
  ('simple_var_decl -> VAR ID','simple_var_decl',2,'p_simple_var_decl','/home/joeedh/dev/allshape/js_parser/js_parse.py',786),
  ('simple_var_decl -> ID','simple_var_decl',1,'p_simple_var_decl','/home/joeedh/dev/allshape/js_parser/js_parse.py',787),
  ('cmplx_assign -> ASSIGNPLUS','cmplx_assign',1,'p_cmplx_assign','/home/joeedh/dev/allshape/js_parser/js_parse.py',807),
  ('cmplx_assign -> ASSIGNMINUS','cmplx_assign',1,'p_cmplx_assign','/home/joeedh/dev/allshape/js_parser/js_parse.py',808),
  ('cmplx_assign -> ASSIGNDIVIDE','cmplx_assign',1,'p_cmplx_assign','/home/joeedh/dev/allshape/js_parser/js_parse.py',809),
  ('cmplx_assign -> ASSIGNTIMES','cmplx_assign',1,'p_cmplx_assign','/home/joeedh/dev/allshape/js_parser/js_parse.py',810),
  ('cmplx_assign -> ASSIGNBOR','cmplx_assign',1,'p_cmplx_assign','/home/joeedh/dev/allshape/js_parser/js_parse.py',811),
  ('cmplx_assign -> ASSIGNBAND','cmplx_assign',1,'p_cmplx_assign','/home/joeedh/dev/allshape/js_parser/js_parse.py',812),
  ('cmplx_assign -> ASSIGNBXOR','cmplx_assign',1,'p_cmplx_assign','/home/joeedh/dev/allshape/js_parser/js_parse.py',813),
  ('cmplx_assign -> ASSIGN','cmplx_assign',1,'p_cmplx_assign','/home/joeedh/dev/allshape/js_parser/js_parse.py',814),
  ('throw -> THROW expr','throw',2,'p_throw','/home/joeedh/dev/allshape/js_parser/js_parse.py',821),
  ('assign -> expr cmplx_assign expr','assign',3,'p_assign','/home/joeedh/dev/allshape/js_parser/js_parse.py',826),
  ('assign -> assign cmplx_assign expr','assign',3,'p_assign','/home/joeedh/dev/allshape/js_parser/js_parse.py',827),
  ('assign -> expr','assign',1,'p_assign','/home/joeedh/dev/allshape/js_parser/js_parse.py',828),
  ('exprlist -> expr','exprlist',1,'p_exprlist','/home/joeedh/dev/allshape/js_parser/js_parse.py',845),
  ('exprlist -> exprlist COMMA expr','exprlist',3,'p_exprlist','/home/joeedh/dev/allshape/js_parser/js_parse.py',846),
  ('template_ref_opt -> template_ref','template_ref_opt',1,'p_template_ref_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',869),
  ('template_ref_opt -> <empty>','template_ref_opt',0,'p_template_ref_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',870),
  ('func_call -> template_ref_opt LPAREN exprlist RPAREN','func_call',4,'p_func_call','/home/joeedh/dev/allshape/js_parser/js_parse.py',878),
  ('func_call -> template_ref_opt LPAREN RPAREN','func_call',3,'p_func_call','/home/joeedh/dev/allshape/js_parser/js_parse.py',879),
  ('funcdeflist -> var_decl_no_list','funcdeflist',1,'p_funcdeflist','/home/joeedh/dev/allshape/js_parser/js_parse.py',894),
  ('funcdeflist -> funcdeflist COMMA var_decl_no_list','funcdeflist',3,'p_funcdeflist','/home/joeedh/dev/allshape/js_parser/js_parse.py',895),
  ('funcdeflist -> <empty>','funcdeflist',0,'p_funcdeflist','/home/joeedh/dev/allshape/js_parser/js_parse.py',896),
  ('template_opt -> template','template_opt',1,'p_template_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',914),
  ('template_opt -> <empty>','template_opt',0,'p_template_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',915),
  ('func_type_opt -> COLON var_type_opt','func_type_opt',2,'p_func_type_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',923),
  ('func_type_opt -> <empty>','func_type_opt',0,'p_func_type_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',924),
  ('funcref -> FUNCTION ID template_opt push_scope LPAREN funcdeflist RPAREN func_type_opt','funcref',8,'p_funcref','/home/joeedh/dev/allshape/js_parser/js_parse.py',932),
  ('func_native -> NATIVE push_scope FUNCTION ID template_opt LPAREN funcdeflist RPAREN func_type_opt','func_native',9,'p_func_native','/home/joeedh/dev/allshape/js_parser/js_parse.py',953),
  ('function -> FUNCTION ID template_opt push_scope LPAREN funcdeflist RPAREN func_type_opt LBRACKET statementlist_opt RBRACKET','function',11,'p_function','/home/joeedh/dev/allshape/js_parser/js_parse.py',976),
  ('lbracket_restrict -> LBRACKET','lbracket_restrict',1,'p_lbracket_restrict','/home/joeedh/dev/allshape/js_parser/js_parse.py',1008),
  ('rbracket_restrict -> RBRACKET','rbracket_restrict',1,'p_rbracket_restrict','/home/joeedh/dev/allshape/js_parser/js_parse.py',1015),
  ('var_type_opt -> var_type','var_type_opt',1,'p_var_type_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',1021),
  ('var_type_opt -> <empty>','var_type_opt',0,'p_var_type_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',1022),
  ('colon_opt -> COLON','colon_opt',1,'p_colon_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',1028),
  ('colon_opt -> <empty>','colon_opt',0,'p_colon_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',1029),
  ('exprfunction -> FUNCTION template_opt push_scope LPAREN funcdeflist RPAREN colon_opt var_type_opt lbracket_restrict statementlist_opt rbracket_restrict','exprfunction',11,'p_exprfunction','/home/joeedh/dev/allshape/js_parser/js_parse.py',1035),
  ('exprfunction -> FUNCTION template_opt push_scope LPAREN RPAREN colon_opt var_type_opt lbracket_restrict statementlist_opt rbracket_restrict','exprfunction',10,'p_exprfunction','/home/joeedh/dev/allshape/js_parser/js_parse.py',1036),
  ('array_literal -> LSBRACKET exprlist RSBRACKET','array_literal',3,'p_array_literal','/home/joeedh/dev/allshape/js_parser/js_parse.py',1082),
  ('array_literal -> LSBRACKET RSBRACKET','array_literal',2,'p_array_literal','/home/joeedh/dev/allshape/js_parser/js_parse.py',1083),
  ('id_str_or_num -> ID','id_str_or_num',1,'p_id_str_or_num','/home/joeedh/dev/allshape/js_parser/js_parse.py',1092),
  ('id_str_or_num -> NUMBER','id_str_or_num',1,'p_id_str_or_num','/home/joeedh/dev/allshape/js_parser/js_parse.py',1093),
  ('id_str_or_num -> STRINGLIT','id_str_or_num',1,'p_id_str_or_num','/home/joeedh/dev/allshape/js_parser/js_parse.py',1094),
  ('typeof -> TYPEOF expr','typeof',2,'p_typeof','/home/joeedh/dev/allshape/js_parser/js_parse.py',1107),
  ('obj_lit_list -> id_str_or_num COLON expr','obj_lit_list',3,'p_obj_lit_list','/home/joeedh/dev/allshape/js_parser/js_parse.py',1113),
  ('obj_lit_list -> obj_lit_list COMMA id_str_or_num COLON expr','obj_lit_list',5,'p_obj_lit_list','/home/joeedh/dev/allshape/js_parser/js_parse.py',1114),
  ('obj_lit_list -> obj_lit_list COMMA','obj_lit_list',2,'p_obj_lit_list','/home/joeedh/dev/allshape/js_parser/js_parse.py',1115),
  ('obj_literal -> lbracket_restrict push_scope obj_lit_list rbracket_restrict','obj_literal',4,'p_obj_literal','/home/joeedh/dev/allshape/js_parser/js_parse.py',1129),
  ('obj_literal -> lbracket_restrict rbracket_restrict','obj_literal',2,'p_obj_literal','/home/joeedh/dev/allshape/js_parser/js_parse.py',1130),
  ('delete -> DELETE expr','delete',2,'p_delete','/home/joeedh/dev/allshape/js_parser/js_parse.py',1141),
  ('new -> NEW expr','new',2,'p_new','/home/joeedh/dev/allshape/js_parser/js_parse.py',1148),
  ('inc -> expr INC','inc',2,'p_inc','/home/joeedh/dev/allshape/js_parser/js_parse.py',1154),
  ('inc -> INC expr','inc',2,'p_inc','/home/joeedh/dev/allshape/js_parser/js_parse.py',1155),
  ('dec -> expr DEC','dec',2,'p_dec','/home/joeedh/dev/allshape/js_parser/js_parse.py',1164),
  ('dec -> DEC expr','dec',2,'p_dec','/home/joeedh/dev/allshape/js_parser/js_parse.py',1165),
  ('not -> NOT expr','not',2,'p_not','/home/joeedh/dev/allshape/js_parser/js_parse.py',1175),
  ('bitinv -> BITINV expr','bitinv',2,'p_bitinv','/home/joeedh/dev/allshape/js_parser/js_parse.py',1180),
  ('strlit -> STRINGLIT','strlit',1,'p_strlit','/home/joeedh/dev/allshape/js_parser/js_parse.py',1185),
  ('lparen_restrict -> LPAREN','lparen_restrict',1,'p_lparen_restrict','/home/joeedh/dev/allshape/js_parser/js_parse.py',1190),
  ('rparen_restrict -> RPAREN','rparen_restrict',1,'p_rparen_restrict','/home/joeedh/dev/allshape/js_parser/js_parse.py',1198),
  ('lsbracket_restrict -> LSBRACKET','lsbracket_restrict',1,'p_lsbracket_restrict','/home/joeedh/dev/allshape/js_parser/js_parse.py',1206),
  ('rsbracket_restrict -> RSBRACKET','rsbracket_restrict',1,'p_rsbracket_restrict','/home/joeedh/dev/allshape/js_parser/js_parse.py',1214),
  ('expr -> NUMBER','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1222),
  ('expr -> strlit','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1223),
  ('expr -> ID','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1224),
  ('expr -> ID template_ref','expr',2,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1225),
  ('expr -> template_ref','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1226),
  ('expr -> array_literal','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1227),
  ('expr -> exprfunction','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1228),
  ('expr -> obj_literal','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1229),
  ('expr -> expr cmplx_assign expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1230),
  ('expr -> expr cmplx_assign expr COLON var_type SEMI','expr',6,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1231),
  ('expr -> expr RSHIFT expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1232),
  ('expr -> expr LSHIFT expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1233),
  ('expr -> expr LLSHIFT expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1234),
  ('expr -> expr RRSHIFT expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1235),
  ('expr -> expr DOT expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1236),
  ('expr -> expr LAND expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1237),
  ('expr -> expr LOR expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1238),
  ('expr -> expr BOR expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1239),
  ('expr -> expr INSTANCEOF expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1240),
  ('expr -> expr BXOR expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1241),
  ('expr -> expr BAND expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1242),
  ('expr -> expr EQUAL expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1243),
  ('expr -> expr EQUAL_STRICT expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1244),
  ('expr -> expr NOTEQUAL_STRICT expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1245),
  ('expr -> expr GTHAN expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1246),
  ('expr -> expr GTHANEQ expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1247),
  ('expr -> expr LTHAN expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1248),
  ('expr -> expr MOD expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1249),
  ('expr -> expr LTHANEQ expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1250),
  ('expr -> expr NOTEQUAL expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1251),
  ('expr -> expr PLUS expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1252),
  ('expr -> expr MINUS expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1253),
  ('expr -> expr DIVIDE expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1254),
  ('expr -> expr TIMES expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1255),
  ('expr -> expr IN expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1256),
  ('expr -> lparen_restrict expr rparen_restrict','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1257),
  ('expr -> expr func_call','expr',2,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1258),
  ('expr -> expr lsbracket_restrict expr rsbracket_restrict','expr',4,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1259),
  ('expr -> expr QEST expr COLON expr','expr',5,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1260),
  ('expr -> expr_uminus','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1261),
  ('expr -> not','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1262),
  ('expr -> bitinv','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1263),
  ('expr -> new','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1264),
  ('expr -> inc','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1265),
  ('expr -> dec','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1266),
  ('expr -> typeof','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1267),
  ('expr -> re_lit','expr',1,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1268),
  ('expr -> expr COMMA expr','expr',3,'p_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1269),
  ('expr_uminus -> MINUS expr','expr_uminus',2,'p_expr_uminus','/home/joeedh/dev/allshape/js_parser/js_parse.py',1325),
  ('paren_expr -> LPAREN expr RPAREN','paren_expr',3,'p_paren_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1332),
  ('paren_expr -> LPAREN RPAREN','paren_expr',2,'p_paren_expr','/home/joeedh/dev/allshape/js_parser/js_parse.py',1333),
  ('assign_opt -> assign','assign_opt',1,'p_assign_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',1342),
  ('assign_opt -> <empty>','assign_opt',0,'p_assign_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',1343),
  ('expr_opt -> expr','expr_opt',1,'p_expr_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',1352),
  ('expr_opt -> <empty>','expr_opt',0,'p_expr_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',1353),
  ('re_lit -> REGEXPR','re_lit',1,'p_re_lit','/home/joeedh/dev/allshape/js_parser/js_parse.py',1362),
  ('for_var_decl -> ID','for_var_decl',1,'p_for_var_decl','/home/joeedh/dev/allshape/js_parser/js_parse.py',1368),
  ('for_var_decl -> ID ASSIGN expr','for_var_decl',3,'p_for_var_decl','/home/joeedh/dev/allshape/js_parser/js_parse.py',1369),
  ('for_var_decl -> var_decl','for_var_decl',1,'p_for_var_decl','/home/joeedh/dev/allshape/js_parser/js_parse.py',1370),
  ('for_decl -> for_var_decl SEMI expr_opt SEMI expr_opt','for_decl',5,'p_for_decl','/home/joeedh/dev/allshape/js_parser/js_parse.py',1398),
  ('for_decl -> for_var_decl IN expr','for_decl',3,'p_for_decl','/home/joeedh/dev/allshape/js_parser/js_parse.py',1399),
  ('for -> FOR LPAREN for_decl RPAREN statement_nonctrl','for',5,'p_for','/home/joeedh/dev/allshape/js_parser/js_parse.py',1408),
  ('for -> FOR LPAREN for_decl RPAREN LBRACKET statementlist_opt RBRACKET','for',7,'p_for','/home/joeedh/dev/allshape/js_parser/js_parse.py',1409),
  ('ctrl_statement -> statement_nonctrl','ctrl_statement',1,'p_ctrl_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',1421),
  ('ctrl_statement -> LBRACKET statementlist_opt RBRACKET','ctrl_statement',3,'p_ctrl_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',1422),
  ('ctrl_statement -> SEMI','ctrl_statement',1,'p_ctrl_statement','/home/joeedh/dev/allshape/js_parser/js_parse.py',1423),
  ('dowhile -> DO ctrl_statement WHILE paren_expr','dowhile',4,'p_dowhile','/home/joeedh/dev/allshape/js_parser/js_parse.py',1436),
  ('while -> WHILE paren_expr statement_nonctrl','while',3,'p_while','/home/joeedh/dev/allshape/js_parser/js_parse.py',1445),
  ('while -> WHILE paren_expr LBRACKET statementlist_opt RBRACKET','while',5,'p_while','/home/joeedh/dev/allshape/js_parser/js_parse.py',1446),
  ('default_case -> DEFAULT COLON statementlist','default_case',3,'p_default_case','/home/joeedh/dev/allshape/js_parser/js_parse.py',1458),
  ('statementlist_opt -> statementlist','statementlist_opt',1,'p_statementlist_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',1464),
  ('statementlist_opt -> <empty>','statementlist_opt',0,'p_statementlist_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',1465),
  ('case_clause -> CASE expr COLON statementlist_opt','case_clause',4,'p_case_clause','/home/joeedh/dev/allshape/js_parser/js_parse.py',1475),
  ('case_clauses -> case_clause','case_clauses',1,'p_case_clauses','/home/joeedh/dev/allshape/js_parser/js_parse.py',1482),
  ('case_clauses -> case_clauses case_clause','case_clauses',2,'p_case_clauses','/home/joeedh/dev/allshape/js_parser/js_parse.py',1483),
  ('case_clauses_opt -> case_clauses','case_clauses_opt',1,'p_case_clauses_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',1493),
  ('case_clauses_opt -> <empty>','case_clauses_opt',0,'p_case_clauses_opt','/home/joeedh/dev/allshape/js_parser/js_parse.py',1494),
  ('case_block -> case_clauses','case_block',1,'p_case_block','/home/joeedh/dev/allshape/js_parser/js_parse.py',1504),
  ('case_block -> case_clauses_opt default_case case_clauses_opt','case_block',3,'p_case_block','/home/joeedh/dev/allshape/js_parser/js_parse.py',1505),
  ('switch -> SWITCH paren_expr LBRACKET case_block RBRACKET','switch',5,'p_switch','/home/joeedh/dev/allshape/js_parser/js_parse.py',1522),
  ('with -> WITH paren_expr ctrl_statement','with',3,'p_with','/home/joeedh/dev/allshape/js_parser/js_parse.py',1530),
  ('if -> IF paren_expr ctrl_statement','if',3,'p_if','/home/joeedh/dev/allshape/js_parser/js_parse.py',1538),
  ('try -> TRY statement_nonctrl','try',2,'p_try','/home/joeedh/dev/allshape/js_parser/js_parse.py',1546),
  ('try -> TRY LBRACKET statementlist RBRACKET','try',4,'p_try','/home/joeedh/dev/allshape/js_parser/js_parse.py',1547),
  ('try -> TRY LBRACKET RBRACKET','try',3,'p_try','/home/joeedh/dev/allshape/js_parser/js_parse.py',1548),
  ('catch -> CATCH paren_expr statement_nonctrl','catch',3,'p_catch','/home/joeedh/dev/allshape/js_parser/js_parse.py',1561),
  ('catch -> CATCH paren_expr LBRACKET statementlist RBRACKET','catch',5,'p_catch','/home/joeedh/dev/allshape/js_parser/js_parse.py',1562),
  ('else -> ELSE ctrl_statement','else',2,'p_else','/home/joeedh/dev/allshape/js_parser/js_parse.py',1574),
  ('break -> BREAK','break',1,'p_break','/home/joeedh/dev/allshape/js_parser/js_parse.py',1582),
  ('continue -> CONTINUE','continue',1,'p_continue','/home/joeedh/dev/allshape/js_parser/js_parse.py',1589),
  ('return -> RETURN expr','return',2,'p_return','/home/joeedh/dev/allshape/js_parser/js_parse.py',1596),
  ('return -> RETURN','return',1,'p_return','/home/joeedh/dev/allshape/js_parser/js_parse.py',1597),
  ('yield -> YIELD expr','yield',2,'p_yield','/home/joeedh/dev/allshape/js_parser/js_parse.py',1607),
  ('yield -> YIELD','yield',1,'p_yield','/home/joeedh/dev/allshape/js_parser/js_parse.py',1608),
]

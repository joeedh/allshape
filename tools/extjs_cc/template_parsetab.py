
# template_parsetab.py
# This file is automatically generated. Do not edit.
_tabversion = '3.2'

_lr_method = 'LALR'

_lr_signature = b'\xc0\xf4\xe8\x04\x02:\x00"\xca6\x8e\xcf\xffn^5'
    
_lr_action_items = {'FLOAT':([1,5,10,13,20,21,27,29,33,35,],[19,-66,-90,19,-91,19,19,-91,19,19,]),'INFERRED':([1,5,10,13,20,21,27,29,33,35,],[6,-66,-90,6,-91,6,6,-91,6,6,]),'BYTE':([1,5,10,13,20,21,27,29,33,35,],[15,-66,-90,15,-91,15,15,-91,15,15,]),'$end':([2,3,4,25,26,28,],[-65,-64,0,-67,-52,-63,]),'INT':([1,5,10,13,20,21,27,29,33,35,],[9,-66,-90,9,-91,9,9,-91,9,9,]),'TGTHAN':([6,7,8,9,11,12,14,15,16,17,18,19,22,23,24,25,30,31,32,34,36,37,],[-88,-86,-48,-82,-83,-76,25,-87,-85,25,-81,-84,-80,-89,-92,-67,25,-49,-50,-62,-93,-51,]),'TYPEOF':([1,5,20,29,],[10,-66,10,10,]),'SHORT':([1,5,10,13,20,21,27,29,33,35,],[11,-66,-90,11,-91,11,11,-91,11,11,]),'TLTHAN':([0,6,7,8,9,11,12,15,16,18,19,22,23,24,25,31,32,34,36,37,],[5,-88,-86,5,-82,-83,-76,-87,-85,-81,-84,-80,-89,5,-67,5,5,-62,5,5,]),'ASSIGN':([6,7,8,9,11,12,15,16,18,19,22,23,25,32,34,],[-88,-86,21,-82,-83,-76,-87,-85,-81,-84,-80,-89,-67,35,-62,]),'COMMA':([6,7,8,9,11,12,14,15,16,17,18,19,22,23,24,25,30,31,32,34,36,37,],[-88,-86,-48,-82,-83,-76,27,-87,-85,29,-81,-84,-80,-89,-92,-67,29,-49,-50,-62,-93,-51,]),'DOUBLE':([1,5,10,13,20,21,27,29,33,35,],[16,-66,-90,16,-91,16,16,-91,16,16,]),'CHAR':([1,5,10,13,20,21,27,29,33,35,],[7,-66,-90,7,-91,7,7,-91,7,7,]),'ID':([1,5,6,7,8,9,10,11,12,13,15,16,18,19,20,21,22,23,24,25,27,29,31,32,33,34,35,36,37,],[12,-66,-88,-86,12,-82,-90,-83,-76,12,-87,-85,-81,-84,-91,12,-80,-89,12,-67,12,-91,12,12,12,-62,12,12,12,]),}

_lr_action = { }
for _k, _v in _lr_action_items.items():
   for _x,_y in zip(_v[0],_v[1]):
      if not _x in _lr_action:  _lr_action[_x] = { }
      _lr_action[_x][_k] = _y
del _lr_action_items

_lr_goto_items = {'lthan_restrict':([0,8,24,31,32,36,37,],[1,20,20,20,20,20,20,]),'template_ref_validate':([0,],[2,]),'template':([0,],[3,]),'typeof_opt':([1,20,29,],[13,13,33,]),'templatedeflist':([1,],[14,]),'gthan_restrict':([14,17,30,],[26,28,34,]),'var_type':([1,13,21,27,33,35,],[8,24,31,32,36,37,]),'simple_templatedeflist':([1,20,],[17,30,]),'template_validate':([0,],[4,]),'id_var_type':([1,8,13,21,24,27,31,32,33,35,36,37,],[18,22,18,18,22,18,22,22,18,18,22,22,]),'template_ref':([8,24,31,32,36,37,],[23,23,23,23,23,23,]),}

_lr_goto = { }
for _k, _v in _lr_goto_items.items():
   for _x,_y in zip(_v[0],_v[1]):
       if not _x in _lr_goto: _lr_goto[_x] = { }
       _lr_goto[_x][_k] = _y
del _lr_goto_items
_lr_productions = [
  ("S' -> template_validate","S'",1,None,None,None),
  ('statementlist -> statement','statementlist',1,'p_statementlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',264),
  ('statementlist -> statement_nonctrl','statementlist',1,'p_statementlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',265),
  ('statementlist -> statementlist statement','statementlist',2,'p_statementlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',266),
  ('statementlist -> statementlist statement_nonctrl','statementlist',2,'p_statementlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',267),
  ('statementlist -> <empty>','statementlist',0,'p_statementlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',268),
  ('push_scope -> <empty>','push_scope',0,'p_push_scope','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',288),
  ('pop_scope -> <empty>','pop_scope',0,'p_pop_scope','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',293),
  ('opt_colon_type -> COLON var_type','opt_colon_type',2,'p_opt_colon_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',298),
  ('opt_colon_type -> <empty>','opt_colon_type',0,'p_opt_colon_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',299),
  ('assign_statement -> assign COLON var_type','assign_statement',3,'p_assign_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',305),
  ('assign_statement -> <empty>','assign_statement',0,'p_assign_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',306),
  ('statement -> function','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',313),
  ('statement -> class','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',314),
  ('statement -> if','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',315),
  ('statement -> else','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',316),
  ('statement -> while','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',317),
  ('statement -> with','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',318),
  ('statement -> dowhile','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',319),
  ('statement -> for','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',320),
  ('statement -> return SEMI','statement',2,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',321),
  ('statement -> yield SEMI','statement',2,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',322),
  ('statement -> break SEMI','statement',2,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',323),
  ('statement -> continue SEMI','statement',2,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',324),
  ('statement -> throw SEMI','statement',2,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',325),
  ('statement -> try','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',326),
  ('statement -> catch','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',327),
  ('statement -> switch','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',328),
  ('statement -> func_native SEMI','statement',2,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',329),
  ('statement_nonctrl -> expr SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',359),
  ('statement_nonctrl -> var_decl SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',360),
  ('statement_nonctrl -> funcref SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',361),
  ('statement_nonctrl -> SEMI','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',362),
  ('statement_nonctrl -> if','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',363),
  ('statement_nonctrl -> else','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',364),
  ('statement_nonctrl -> for','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',365),
  ('statement_nonctrl -> dowhile','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',366),
  ('statement_nonctrl -> while','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',367),
  ('statement_nonctrl -> return SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',368),
  ('statement_nonctrl -> yield SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',369),
  ('statement_nonctrl -> break SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',370),
  ('statement_nonctrl -> continue SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',371),
  ('statement_nonctrl -> throw SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',372),
  ('statement_nonctrl -> try','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',373),
  ('statement_nonctrl -> catch','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',374),
  ('statement_nonctrl -> delete SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',375),
  ('var_decl_or_type -> var_decl','var_decl_or_type',1,'p_var_decl_or_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',404),
  ('var_decl_or_type -> var_type','var_decl_or_type',1,'p_var_decl_or_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',405),
  ('templatedeflist -> var_type','templatedeflist',1,'p_templatedeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',413),
  ('templatedeflist -> var_type ASSIGN var_type','templatedeflist',3,'p_templatedeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',414),
  ('templatedeflist -> templatedeflist COMMA var_type','templatedeflist',3,'p_templatedeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',415),
  ('templatedeflist -> templatedeflist COMMA var_type ASSIGN var_type','templatedeflist',5,'p_templatedeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',416),
  ('template -> lthan_restrict templatedeflist gthan_restrict','template',3,'p_template','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',433),
  ('type_modifiers -> type_modifiers UNSIGNED','type_modifiers',2,'p_type_modifiers','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',440),
  ('type_modifiers -> type_modifiers SIGNED','type_modifiers',2,'p_type_modifiers','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',441),
  ('type_modifiers -> type_modifiers CONST','type_modifiers',2,'p_type_modifiers','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',442),
  ('type_modifiers -> GLOBAL','type_modifiers',1,'p_type_modifiers','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',443),
  ('type_modifiers -> VAR','type_modifiers',1,'p_type_modifiers','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',444),
  ('type_modifiers -> STATIC','type_modifiers',1,'p_type_modifiers','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',445),
  ('left_id -> ID','left_id',1,'p_left_id','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',462),
  ('id_opt -> ID','id_opt',1,'p_id_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',466),
  ('id_opt -> <empty>','id_opt',0,'p_id_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',467),
  ('template_ref -> lthan_restrict simple_templatedeflist gthan_restrict','template_ref',3,'p_template_ref','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',473),
  ('template_ref_validate -> lthan_restrict simple_templatedeflist gthan_restrict','template_ref_validate',3,'p_template_ref_validate','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',478),
  ('template_validate -> template','template_validate',1,'p_template_validate','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',484),
  ('template_validate -> template_ref_validate','template_validate',1,'p_template_validate','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',485),
  ('lthan_restrict -> TLTHAN','lthan_restrict',1,'p_lthan_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',492),
  ('gthan_restrict -> TGTHAN','gthan_restrict',1,'p_gthan_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',508),
  ('id_1 -> ID','id_1',1,'p_id1','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',516),
  ('var_decl_no_list -> var_type','var_decl_no_list',1,'p_var_decl_no_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',522),
  ('var_decl_no_list -> type_modifiers var_decl_no_list','var_decl_no_list',2,'p_var_decl_no_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',523),
  ('var_decl_no_list -> var_decl_no_list ASSIGN expr','var_decl_no_list',3,'p_var_decl_no_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',524),
  ('var_decl -> type_modifiers var_type','var_decl',2,'p_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',574),
  ('var_decl -> var_decl ASSIGN expr','var_decl',3,'p_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',575),
  ('var_decl -> var_decl COMMA ID','var_decl',3,'p_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',576),
  ('var_decl -> var_decl COMMA ID ASSIGN expr','var_decl',5,'p_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',577),
  ('id_var_type -> ID','id_var_type',1,'p_id_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',644),
  ('id_var_decl -> ID','id_var_decl',1,'p_id_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',650),
  ('empty -> empty','empty',1,'p_empty','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',656),
  ('empty -> <empty>','empty',0,'p_empty','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',657),
  ('var_type -> var_type id_var_type','var_type',2,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',662),
  ('var_type -> id_var_type','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',663),
  ('var_type -> INT','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',664),
  ('var_type -> SHORT','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',665),
  ('var_type -> FLOAT','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',666),
  ('var_type -> DOUBLE','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',667),
  ('var_type -> CHAR','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',668),
  ('var_type -> BYTE','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',669),
  ('var_type -> INFERRED','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',670),
  ('var_type -> var_type template_ref','var_type',2,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',671),
  ('typeof_opt -> TYPEOF','typeof_opt',1,'p_typeof_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',764),
  ('typeof_opt -> <empty>','typeof_opt',0,'p_typeof_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',765),
  ('simple_templatedeflist -> typeof_opt var_type','simple_templatedeflist',2,'p_simple_templatedeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',773),
  ('simple_templatedeflist -> simple_templatedeflist COMMA typeof_opt var_type','simple_templatedeflist',4,'p_simple_templatedeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',774),
  ('simple_var_decl -> VAR ID','simple_var_decl',2,'p_simple_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',791),
  ('simple_var_decl -> ID','simple_var_decl',1,'p_simple_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',792),
  ('cmplx_assign -> ASSIGNPLUS','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',812),
  ('cmplx_assign -> ASSIGNMINUS','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',813),
  ('cmplx_assign -> ASSIGNDIVIDE','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',814),
  ('cmplx_assign -> ASSIGNTIMES','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',815),
  ('cmplx_assign -> ASSIGNBOR','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',816),
  ('cmplx_assign -> ASSIGNBAND','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',817),
  ('cmplx_assign -> ASSIGNBXOR','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',818),
  ('cmplx_assign -> ASSIGNLSHIFT','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',819),
  ('cmplx_assign -> ASSIGNRSHIFT','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',820),
  ('cmplx_assign -> ASSIGNRRSHIFT','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',821),
  ('cmplx_assign -> ASSIGNLLSHIFT','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',822),
  ('cmplx_assign -> ASSIGN','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',823),
  ('throw -> THROW expr','throw',2,'p_throw','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',830),
  ('assign -> expr cmplx_assign expr','assign',3,'p_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',835),
  ('assign -> assign cmplx_assign expr','assign',3,'p_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',836),
  ('assign -> expr','assign',1,'p_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',837),
  ('exprlist -> expr','exprlist',1,'p_exprlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',854),
  ('exprlist -> exprlist COMMA expr','exprlist',3,'p_exprlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',855),
  ('class -> CLASS ID template_opt class_tail','class',4,'p_class','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',882),
  ('exprclass -> CLASS id_opt class_tail','exprclass',3,'p_exprclass','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',897),
  ('class_tail -> class_heritage_opt LBRACKET class_body_opt RBRACKET','class_tail',4,'p_class_tail','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',914),
  ('class_list -> var_type','class_list',1,'p_class_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',924),
  ('class_list -> class_list COMMA var_type','class_list',3,'p_class_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',925),
  ('class_heritage -> EXTENDS class_list','class_heritage',2,'p_class_heritage','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',938),
  ('class_heritage_opt -> class_heritage','class_heritage_opt',1,'p_class_heritage_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',944),
  ('class_heritage_opt -> <empty>','class_heritage_opt',0,'p_class_heritage_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',945),
  ('class_body_opt -> class_element_list','class_body_opt',1,'p_class_body_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',953),
  ('class_body_opt -> <empty>','class_body_opt',0,'p_class_body_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',954),
  ('class_element_list -> class_element','class_element_list',1,'p_class_element_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',967),
  ('class_element_list -> class_element_list class_element','class_element_list',2,'p_class_element_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',968),
  ('class_element -> method_def','class_element',1,'p_class_element','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',979),
  ('class_element -> STATIC method_def','class_element',2,'p_class_element','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',980),
  ('method -> ID LPAREN funcdeflist RPAREN func_type_opt LBRACKET statementlist_opt RBRACKET','method',8,'p_method','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',991),
  ('method_def -> method','method_def',1,'p_method_def','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1008),
  ('method_def -> ID ID LPAREN RPAREN func_type_opt LBRACKET statementlist_opt RBRACKET','method_def',8,'p_method_def','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1009),
  ('method_def -> ID ID LPAREN setter_param_list RPAREN func_type_opt LBRACKET statementlist_opt RBRACKET','method_def',9,'p_method_def','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1010),
  ('setter_param_list -> ID','setter_param_list',1,'p_setter_param_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1042),
  ('template_ref_opt -> template_ref','template_ref_opt',1,'p_template_ref_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1050),
  ('template_ref_opt -> <empty>','template_ref_opt',0,'p_template_ref_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1051),
  ('func_call -> template_ref_opt LPAREN exprlist RPAREN','func_call',4,'p_func_call','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1059),
  ('func_call -> template_ref_opt LPAREN RPAREN','func_call',3,'p_func_call','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1060),
  ('funcdeflist -> var_decl_no_list','funcdeflist',1,'p_funcdeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1075),
  ('funcdeflist -> funcdeflist COMMA var_decl_no_list','funcdeflist',3,'p_funcdeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1076),
  ('funcdeflist -> <empty>','funcdeflist',0,'p_funcdeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1077),
  ('template_opt -> template','template_opt',1,'p_template_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1095),
  ('template_opt -> <empty>','template_opt',0,'p_template_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1096),
  ('func_type_opt -> COLON var_type_opt','func_type_opt',2,'p_func_type_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1104),
  ('func_type_opt -> <empty>','func_type_opt',0,'p_func_type_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1105),
  ('funcref -> FUNCTION ID template_opt push_scope LPAREN funcdeflist RPAREN func_type_opt','funcref',8,'p_funcref','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1113),
  ('func_native -> NATIVE push_scope FUNCTION ID template_opt LPAREN funcdeflist RPAREN func_type_opt','func_native',9,'p_func_native','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1134),
  ('function -> FUNCTION ID template_opt push_scope LPAREN funcdeflist RPAREN func_type_opt LBRACKET statementlist_opt RBRACKET','function',11,'p_function','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1157),
  ('lbracket_restrict -> LBRACKET','lbracket_restrict',1,'p_lbracket_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1189),
  ('rbracket_restrict -> RBRACKET','rbracket_restrict',1,'p_rbracket_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1196),
  ('var_type_opt -> var_type','var_type_opt',1,'p_var_type_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1202),
  ('var_type_opt -> <empty>','var_type_opt',0,'p_var_type_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1203),
  ('colon_opt -> COLON','colon_opt',1,'p_colon_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1209),
  ('colon_opt -> <empty>','colon_opt',0,'p_colon_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1210),
  ('exprfunction -> FUNCTION template_opt push_scope LPAREN funcdeflist RPAREN colon_opt var_type_opt lbracket_restrict statementlist_opt rbracket_restrict','exprfunction',11,'p_exprfunction','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1216),
  ('exprfunction -> FUNCTION template_opt push_scope LPAREN RPAREN colon_opt var_type_opt lbracket_restrict statementlist_opt rbracket_restrict','exprfunction',10,'p_exprfunction','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1217),
  ('array_literal -> LSBRACKET exprlist RSBRACKET','array_literal',3,'p_array_literal','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1263),
  ('array_literal -> LSBRACKET RSBRACKET','array_literal',2,'p_array_literal','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1264),
  ('id_str_or_num -> ID','id_str_or_num',1,'p_id_str_or_num','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1273),
  ('id_str_or_num -> NUMBER','id_str_or_num',1,'p_id_str_or_num','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1274),
  ('id_str_or_num -> STRINGLIT','id_str_or_num',1,'p_id_str_or_num','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1275),
  ('typeof -> TYPEOF expr','typeof',2,'p_typeof','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1288),
  ('obj_lit_list -> id_str_or_num COLON expr','obj_lit_list',3,'p_obj_lit_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1294),
  ('obj_lit_list -> obj_lit_list COMMA id_str_or_num COLON expr','obj_lit_list',5,'p_obj_lit_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1295),
  ('obj_lit_list -> obj_lit_list COMMA','obj_lit_list',2,'p_obj_lit_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1296),
  ('obj_literal -> lbracket_restrict push_scope obj_lit_list rbracket_restrict','obj_literal',4,'p_obj_literal','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1310),
  ('obj_literal -> lbracket_restrict rbracket_restrict','obj_literal',2,'p_obj_literal','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1311),
  ('delete -> DELETE expr','delete',2,'p_delete','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1322),
  ('new -> NEW expr','new',2,'p_new','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1329),
  ('inc -> expr INC','inc',2,'p_inc','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1335),
  ('inc -> INC expr','inc',2,'p_inc','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1336),
  ('dec -> expr DEC','dec',2,'p_dec','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1345),
  ('dec -> DEC expr','dec',2,'p_dec','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1346),
  ('not -> NOT expr','not',2,'p_not','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1356),
  ('bitinv -> BITINV expr','bitinv',2,'p_bitinv','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1361),
  ('strlit -> STRINGLIT','strlit',1,'p_strlit','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1366),
  ('lparen_restrict -> LPAREN','lparen_restrict',1,'p_lparen_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1371),
  ('rparen_restrict -> RPAREN','rparen_restrict',1,'p_rparen_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1379),
  ('lsbracket_restrict -> LSBRACKET','lsbracket_restrict',1,'p_lsbracket_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1387),
  ('rsbracket_restrict -> RSBRACKET','rsbracket_restrict',1,'p_rsbracket_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1395),
  ('expr -> NUMBER','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1403),
  ('expr -> strlit','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1404),
  ('expr -> ID','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1405),
  ('expr -> ID template_ref','expr',2,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1406),
  ('expr -> template_ref','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1407),
  ('expr -> array_literal','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1408),
  ('expr -> exprfunction','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1409),
  ('expr -> obj_literal','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1410),
  ('expr -> expr cmplx_assign expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1411),
  ('expr -> expr cmplx_assign expr COLON var_type SEMI','expr',6,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1412),
  ('expr -> expr RSHIFT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1413),
  ('expr -> expr LSHIFT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1414),
  ('expr -> expr LLSHIFT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1415),
  ('expr -> expr RRSHIFT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1416),
  ('expr -> expr DOT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1417),
  ('expr -> expr LAND expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1418),
  ('expr -> expr LOR expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1419),
  ('expr -> expr BOR expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1420),
  ('expr -> expr INSTANCEOF expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1421),
  ('expr -> expr BXOR expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1422),
  ('expr -> expr BAND expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1423),
  ('expr -> expr EQUAL expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1424),
  ('expr -> expr EQUAL_STRICT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1425),
  ('expr -> expr NOTEQUAL_STRICT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1426),
  ('expr -> expr GTHAN expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1427),
  ('expr -> expr GTHANEQ expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1428),
  ('expr -> expr LTHAN expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1429),
  ('expr -> expr MOD expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1430),
  ('expr -> expr LTHANEQ expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1431),
  ('expr -> expr NOTEQUAL expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1432),
  ('expr -> expr PLUS expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1433),
  ('expr -> expr MINUS expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1434),
  ('expr -> expr DIVIDE expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1435),
  ('expr -> expr TIMES expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1436),
  ('expr -> expr IN expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1437),
  ('expr -> lparen_restrict expr rparen_restrict','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1438),
  ('expr -> expr func_call','expr',2,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1439),
  ('expr -> expr lsbracket_restrict expr rsbracket_restrict','expr',4,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1440),
  ('expr -> expr QEST expr COLON expr','expr',5,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1441),
  ('expr -> expr_uminus','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1442),
  ('expr -> not','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1443),
  ('expr -> bitinv','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1444),
  ('expr -> new','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1445),
  ('expr -> inc','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1446),
  ('expr -> dec','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1447),
  ('expr -> typeof','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1448),
  ('expr -> re_lit','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1449),
  ('expr -> expr COMMA expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1450),
  ('expr_uminus -> MINUS expr','expr_uminus',2,'p_expr_uminus','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1506),
  ('paren_expr -> LPAREN expr RPAREN','paren_expr',3,'p_paren_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1513),
  ('paren_expr -> LPAREN RPAREN','paren_expr',2,'p_paren_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1514),
  ('assign_opt -> assign','assign_opt',1,'p_assign_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1523),
  ('assign_opt -> <empty>','assign_opt',0,'p_assign_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1524),
  ('expr_opt -> expr','expr_opt',1,'p_expr_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1533),
  ('expr_opt -> <empty>','expr_opt',0,'p_expr_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1534),
  ('re_lit -> REGEXPR','re_lit',1,'p_re_lit','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1543),
  ('for_var_decl -> ID','for_var_decl',1,'p_for_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1549),
  ('for_var_decl -> ID ASSIGN expr','for_var_decl',3,'p_for_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1550),
  ('for_var_decl -> var_decl','for_var_decl',1,'p_for_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1551),
  ('for_decl -> for_var_decl SEMI expr_opt SEMI expr_opt','for_decl',5,'p_for_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1579),
  ('for_decl -> for_var_decl IN expr','for_decl',3,'p_for_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1580),
  ('for -> FOR LPAREN for_decl RPAREN statement_nonctrl','for',5,'p_for','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1589),
  ('for -> FOR LPAREN for_decl RPAREN LBRACKET statementlist_opt RBRACKET','for',7,'p_for','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1590),
  ('ctrl_statement -> statement_nonctrl','ctrl_statement',1,'p_ctrl_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1602),
  ('ctrl_statement -> LBRACKET statementlist_opt RBRACKET','ctrl_statement',3,'p_ctrl_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1603),
  ('ctrl_statement -> SEMI','ctrl_statement',1,'p_ctrl_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1604),
  ('dowhile -> DO ctrl_statement WHILE paren_expr','dowhile',4,'p_dowhile','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1617),
  ('while -> WHILE paren_expr statement_nonctrl','while',3,'p_while','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1626),
  ('while -> WHILE paren_expr LBRACKET statementlist_opt RBRACKET','while',5,'p_while','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1627),
  ('default_case -> DEFAULT COLON statementlist','default_case',3,'p_default_case','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1639),
  ('statementlist_opt -> statementlist','statementlist_opt',1,'p_statementlist_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1645),
  ('statementlist_opt -> <empty>','statementlist_opt',0,'p_statementlist_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1646),
  ('case_clause -> CASE expr COLON statementlist_opt','case_clause',4,'p_case_clause','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1656),
  ('case_clauses -> case_clause','case_clauses',1,'p_case_clauses','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1663),
  ('case_clauses -> case_clauses case_clause','case_clauses',2,'p_case_clauses','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1664),
  ('case_clauses_opt -> case_clauses','case_clauses_opt',1,'p_case_clauses_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1674),
  ('case_clauses_opt -> <empty>','case_clauses_opt',0,'p_case_clauses_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1675),
  ('case_block -> case_clauses','case_block',1,'p_case_block','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1685),
  ('case_block -> case_clauses_opt default_case case_clauses_opt','case_block',3,'p_case_block','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1686),
  ('switch -> SWITCH paren_expr LBRACKET case_block RBRACKET','switch',5,'p_switch','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1703),
  ('with -> WITH paren_expr ctrl_statement','with',3,'p_with','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1711),
  ('if -> IF paren_expr ctrl_statement','if',3,'p_if','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1719),
  ('try -> TRY statement_nonctrl','try',2,'p_try','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1727),
  ('try -> TRY LBRACKET statementlist RBRACKET','try',4,'p_try','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1728),
  ('try -> TRY LBRACKET RBRACKET','try',3,'p_try','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1729),
  ('catch -> CATCH paren_expr statement_nonctrl','catch',3,'p_catch','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1742),
  ('catch -> CATCH paren_expr LBRACKET statementlist RBRACKET','catch',5,'p_catch','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1743),
  ('else -> ELSE ctrl_statement','else',2,'p_else','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1755),
  ('break -> BREAK','break',1,'p_break','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1763),
  ('continue -> CONTINUE','continue',1,'p_continue','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1770),
  ('return -> RETURN expr','return',2,'p_return','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1777),
  ('return -> RETURN','return',1,'p_return','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1778),
  ('yield -> YIELD expr','yield',2,'p_yield','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1788),
  ('yield -> YIELD','yield',1,'p_yield','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1789),
]

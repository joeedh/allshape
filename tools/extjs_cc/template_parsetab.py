
# template_parsetab.py
# This file is automatically generated. Do not edit.
_tabversion = '3.2'

_lr_method = 'LALR'

_lr_signature = b'\r\x15ik\x14\xc1\x00\x98\xa0\xa8\x80\x04#\nY*'
    
_lr_action_items = {'BYTE':([2,3,8,14,22,24,26,29,30,36,],[11,-65,-89,11,-90,11,-90,11,11,11,]),'DOUBLE':([2,3,8,14,22,24,26,29,30,36,],[7,-65,-89,7,-90,7,-90,7,7,7,]),'ASSIGN':([7,9,10,11,12,13,16,17,18,19,21,23,25,33,35,],[-84,-75,-83,-86,24,-80,-87,-85,-81,-82,-66,-88,-79,36,-61,]),'FLOAT':([2,3,8,14,22,24,26,29,30,36,],[10,-65,-89,10,-90,10,-90,10,10,10,]),'TGTHAN':([6,7,9,10,11,12,13,15,16,17,18,19,21,23,25,27,31,32,33,34,35,37,],[21,-84,-75,-83,-86,-48,-80,21,-87,-85,-81,-82,-66,-88,-79,-91,-49,21,-50,-92,-61,-51,]),'TYPEOF':([2,3,22,26,],[8,-65,8,8,]),'COMMA':([6,7,9,10,11,12,13,15,16,17,18,19,21,23,25,27,31,32,33,34,35,37,],[22,-84,-75,-83,-86,-48,-80,29,-87,-85,-81,-82,-66,-88,-79,-91,-49,22,-50,-92,-61,-51,]),'INFERRED':([2,3,8,14,22,24,26,29,30,36,],[16,-65,-89,16,-90,16,-90,16,16,16,]),'CHAR':([2,3,8,14,22,24,26,29,30,36,],[17,-65,-89,17,-90,17,-90,17,17,17,]),'$end':([1,4,5,20,21,28,],[0,-63,-64,-62,-66,-52,]),'ID':([2,3,7,8,9,10,11,12,13,14,16,17,18,19,21,22,23,24,25,26,27,29,30,31,33,34,35,36,37,],[9,-65,-84,-89,-75,-83,-86,9,-80,9,-87,-85,-81,-82,-66,-90,-88,9,-79,-90,9,9,9,9,9,9,-61,9,9,]),'INT':([2,3,8,14,22,24,26,29,30,36,],[18,-65,-89,18,-90,18,-90,18,18,18,]),'SHORT':([2,3,8,14,22,24,26,29,30,36,],[19,-65,-89,19,-90,19,-90,19,19,19,]),'TLTHAN':([0,7,9,10,11,12,13,16,17,18,19,21,23,25,27,31,33,34,35,37,],[3,-84,-75,-83,-86,3,-80,-87,-85,-81,-82,-66,-88,-79,3,3,3,3,-61,3,]),}

_lr_action = { }
for _k, _v in _lr_action_items.items():
   for _x,_y in zip(_v[0],_v[1]):
      if not _x in _lr_action:  _lr_action[_x] = { }
      _lr_action[_x][_k] = _y
del _lr_action_items

_lr_goto_items = {'gthan_restrict':([6,15,32,],[20,28,35,]),'templatedeflist':([2,],[15,]),'template_validate':([0,],[1,]),'lthan_restrict':([0,12,27,31,33,34,37,],[2,26,26,26,26,26,26,]),'simple_templatedeflist':([2,26,],[6,32,]),'template_ref':([12,27,31,33,34,37,],[23,23,23,23,23,23,]),'var_type':([2,14,24,29,30,36,],[12,27,31,33,34,37,]),'id_var_type':([2,12,14,24,27,29,30,31,33,34,36,37,],[13,25,13,13,25,13,13,25,25,25,13,25,]),'typeof_opt':([2,22,26,],[14,30,14,]),'template':([0,],[4,]),'template_ref_validate':([0,],[5,]),}

_lr_goto = { }
for _k, _v in _lr_goto_items.items():
   for _x,_y in zip(_v[0],_v[1]):
       if not _x in _lr_goto: _lr_goto[_x] = { }
       _lr_goto[_x][_k] = _y
del _lr_goto_items
_lr_productions = [
  ("S' -> template_validate","S'",1,None,None,None),
  ('statementlist -> statement','statementlist',1,'p_statementlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',262),
  ('statementlist -> statement_nonctrl','statementlist',1,'p_statementlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',263),
  ('statementlist -> statementlist statement','statementlist',2,'p_statementlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',264),
  ('statementlist -> statementlist statement_nonctrl','statementlist',2,'p_statementlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',265),
  ('statementlist -> <empty>','statementlist',0,'p_statementlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',266),
  ('push_scope -> <empty>','push_scope',0,'p_push_scope','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',286),
  ('pop_scope -> <empty>','pop_scope',0,'p_pop_scope','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',291),
  ('opt_colon_type -> COLON var_type','opt_colon_type',2,'p_opt_colon_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',296),
  ('opt_colon_type -> <empty>','opt_colon_type',0,'p_opt_colon_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',297),
  ('assign_statement -> assign COLON var_type','assign_statement',3,'p_assign_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',303),
  ('assign_statement -> <empty>','assign_statement',0,'p_assign_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',304),
  ('statement -> function','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',311),
  ('statement -> class','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',312),
  ('statement -> if','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',313),
  ('statement -> else','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',314),
  ('statement -> while','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',315),
  ('statement -> with','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',316),
  ('statement -> dowhile','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',317),
  ('statement -> for','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',318),
  ('statement -> return SEMI','statement',2,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',319),
  ('statement -> yield SEMI','statement',2,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',320),
  ('statement -> break SEMI','statement',2,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',321),
  ('statement -> continue SEMI','statement',2,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',322),
  ('statement -> throw SEMI','statement',2,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',323),
  ('statement -> try','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',324),
  ('statement -> catch','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',325),
  ('statement -> switch','statement',1,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',326),
  ('statement -> func_native SEMI','statement',2,'p_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',327),
  ('statement_nonctrl -> expr SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',357),
  ('statement_nonctrl -> var_decl SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',358),
  ('statement_nonctrl -> funcref SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',359),
  ('statement_nonctrl -> SEMI','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',360),
  ('statement_nonctrl -> if','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',361),
  ('statement_nonctrl -> else','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',362),
  ('statement_nonctrl -> for','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',363),
  ('statement_nonctrl -> dowhile','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',364),
  ('statement_nonctrl -> while','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',365),
  ('statement_nonctrl -> return SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',366),
  ('statement_nonctrl -> yield SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',367),
  ('statement_nonctrl -> break SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',368),
  ('statement_nonctrl -> continue SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',369),
  ('statement_nonctrl -> throw SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',370),
  ('statement_nonctrl -> try','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',371),
  ('statement_nonctrl -> catch','statement_nonctrl',1,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',372),
  ('statement_nonctrl -> delete SEMI','statement_nonctrl',2,'p_statement_nonctrl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',373),
  ('var_decl_or_type -> var_decl','var_decl_or_type',1,'p_var_decl_or_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',402),
  ('var_decl_or_type -> var_type','var_decl_or_type',1,'p_var_decl_or_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',403),
  ('templatedeflist -> var_type','templatedeflist',1,'p_templatedeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',411),
  ('templatedeflist -> var_type ASSIGN var_type','templatedeflist',3,'p_templatedeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',412),
  ('templatedeflist -> templatedeflist COMMA var_type','templatedeflist',3,'p_templatedeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',413),
  ('templatedeflist -> templatedeflist COMMA var_type ASSIGN var_type','templatedeflist',5,'p_templatedeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',414),
  ('template -> lthan_restrict templatedeflist gthan_restrict','template',3,'p_template','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',431),
  ('type_modifiers -> type_modifiers UNSIGNED','type_modifiers',2,'p_type_modifiers','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',438),
  ('type_modifiers -> type_modifiers SIGNED','type_modifiers',2,'p_type_modifiers','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',439),
  ('type_modifiers -> type_modifiers CONST','type_modifiers',2,'p_type_modifiers','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',440),
  ('type_modifiers -> GLOBAL','type_modifiers',1,'p_type_modifiers','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',441),
  ('type_modifiers -> VAR','type_modifiers',1,'p_type_modifiers','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',442),
  ('left_id -> ID','left_id',1,'p_left_id','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',459),
  ('id_opt -> ID','id_opt',1,'p_id_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',463),
  ('id_opt -> <empty>','id_opt',0,'p_id_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',464),
  ('template_ref -> lthan_restrict simple_templatedeflist gthan_restrict','template_ref',3,'p_template_ref','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',470),
  ('template_ref_validate -> lthan_restrict simple_templatedeflist gthan_restrict','template_ref_validate',3,'p_template_ref_validate','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',475),
  ('template_validate -> template','template_validate',1,'p_template_validate','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',481),
  ('template_validate -> template_ref_validate','template_validate',1,'p_template_validate','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',482),
  ('lthan_restrict -> TLTHAN','lthan_restrict',1,'p_lthan_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',489),
  ('gthan_restrict -> TGTHAN','gthan_restrict',1,'p_gthan_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',505),
  ('id_1 -> ID','id_1',1,'p_id1','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',513),
  ('var_decl_no_list -> var_type','var_decl_no_list',1,'p_var_decl_no_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',519),
  ('var_decl_no_list -> type_modifiers var_decl_no_list','var_decl_no_list',2,'p_var_decl_no_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',520),
  ('var_decl_no_list -> var_decl_no_list ASSIGN expr','var_decl_no_list',3,'p_var_decl_no_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',521),
  ('var_decl -> type_modifiers var_type','var_decl',2,'p_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',578),
  ('var_decl -> var_decl ASSIGN expr','var_decl',3,'p_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',579),
  ('var_decl -> var_decl COMMA ID','var_decl',3,'p_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',580),
  ('var_decl -> var_decl COMMA ID ASSIGN expr','var_decl',5,'p_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',581),
  ('id_var_type -> ID','id_var_type',1,'p_id_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',648),
  ('id_var_decl -> ID','id_var_decl',1,'p_id_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',654),
  ('empty -> empty','empty',1,'p_empty','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',660),
  ('empty -> <empty>','empty',0,'p_empty','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',661),
  ('var_type -> var_type id_var_type','var_type',2,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',666),
  ('var_type -> id_var_type','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',667),
  ('var_type -> INT','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',668),
  ('var_type -> SHORT','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',669),
  ('var_type -> FLOAT','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',670),
  ('var_type -> DOUBLE','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',671),
  ('var_type -> CHAR','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',672),
  ('var_type -> BYTE','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',673),
  ('var_type -> INFERRED','var_type',1,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',674),
  ('var_type -> var_type template_ref','var_type',2,'p_var_type','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',675),
  ('typeof_opt -> TYPEOF','typeof_opt',1,'p_typeof_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',768),
  ('typeof_opt -> <empty>','typeof_opt',0,'p_typeof_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',769),
  ('simple_templatedeflist -> typeof_opt var_type','simple_templatedeflist',2,'p_simple_templatedeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',777),
  ('simple_templatedeflist -> simple_templatedeflist COMMA typeof_opt var_type','simple_templatedeflist',4,'p_simple_templatedeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',778),
  ('simple_var_decl -> VAR ID','simple_var_decl',2,'p_simple_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',795),
  ('simple_var_decl -> ID','simple_var_decl',1,'p_simple_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',796),
  ('cmplx_assign -> ASSIGNPLUS','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',816),
  ('cmplx_assign -> ASSIGNMINUS','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',817),
  ('cmplx_assign -> ASSIGNDIVIDE','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',818),
  ('cmplx_assign -> ASSIGNTIMES','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',819),
  ('cmplx_assign -> ASSIGNBOR','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',820),
  ('cmplx_assign -> ASSIGNBAND','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',821),
  ('cmplx_assign -> ASSIGNBXOR','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',822),
  ('cmplx_assign -> ASSIGN','cmplx_assign',1,'p_cmplx_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',823),
  ('throw -> THROW expr','throw',2,'p_throw','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',830),
  ('assign -> expr cmplx_assign expr','assign',3,'p_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',835),
  ('assign -> assign cmplx_assign expr','assign',3,'p_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',836),
  ('assign -> expr','assign',1,'p_assign','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',837),
  ('exprlist -> expr','exprlist',1,'p_exprlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',854),
  ('exprlist -> exprlist COMMA expr','exprlist',3,'p_exprlist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',855),
  ('class -> CLASS ID class_tail','class',3,'p_class','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',882),
  ('exprclass -> CLASS id_opt class_tail','exprclass',3,'p_exprclass','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',896),
  ('class_tail -> class_heritage_opt LBRACKET class_body_opt RBRACKET','class_tail',4,'p_class_tail','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',912),
  ('class_heritage -> EXTENDS ID','class_heritage',2,'p_class_heritage','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',922),
  ('class_heritage_opt -> class_heritage','class_heritage_opt',1,'p_class_heritage_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',927),
  ('class_heritage_opt -> <empty>','class_heritage_opt',0,'p_class_heritage_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',928),
  ('class_body_opt -> class_element_list','class_body_opt',1,'p_class_body_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',934),
  ('class_body_opt -> <empty>','class_body_opt',0,'p_class_body_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',935),
  ('class_element_list -> class_element','class_element_list',1,'p_class_element_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',942),
  ('class_element_list -> class_element_list class_element','class_element_list',2,'p_class_element_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',943),
  ('class_element -> method_def','class_element',1,'p_class_element','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',953),
  ('class_element -> STATIC method_def','class_element',2,'p_class_element','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',954),
  ('method -> ID LPAREN funcdeflist RPAREN func_type_opt LBRACKET statementlist_opt RBRACKET','method',8,'p_method','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',964),
  ('method_def -> method','method_def',1,'p_method_def','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',978),
  ('method_def -> ID ID LPAREN RPAREN func_type_opt LBRACKET statementlist_opt RBRACKET','method_def',8,'p_method_def','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',979),
  ('method_def -> ID ID LPAREN setter_param_list RPAREN func_type_opt LBRACKET statementlist_opt RBRACKET','method_def',9,'p_method_def','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',980),
  ('setter_param_list -> ID','setter_param_list',1,'p_setter_param_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1007),
  ('template_ref_opt -> template_ref','template_ref_opt',1,'p_template_ref_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1014),
  ('template_ref_opt -> <empty>','template_ref_opt',0,'p_template_ref_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1015),
  ('func_call -> template_ref_opt LPAREN exprlist RPAREN','func_call',4,'p_func_call','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1023),
  ('func_call -> template_ref_opt LPAREN RPAREN','func_call',3,'p_func_call','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1024),
  ('funcdeflist -> var_decl_no_list','funcdeflist',1,'p_funcdeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1039),
  ('funcdeflist -> funcdeflist COMMA var_decl_no_list','funcdeflist',3,'p_funcdeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1040),
  ('funcdeflist -> <empty>','funcdeflist',0,'p_funcdeflist','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1041),
  ('template_opt -> template','template_opt',1,'p_template_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1059),
  ('template_opt -> <empty>','template_opt',0,'p_template_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1060),
  ('func_type_opt -> COLON var_type_opt','func_type_opt',2,'p_func_type_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1068),
  ('func_type_opt -> <empty>','func_type_opt',0,'p_func_type_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1069),
  ('funcref -> FUNCTION ID template_opt push_scope LPAREN funcdeflist RPAREN func_type_opt','funcref',8,'p_funcref','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1077),
  ('func_native -> NATIVE push_scope FUNCTION ID template_opt LPAREN funcdeflist RPAREN func_type_opt','func_native',9,'p_func_native','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1098),
  ('function -> FUNCTION ID template_opt push_scope LPAREN funcdeflist RPAREN func_type_opt LBRACKET statementlist_opt RBRACKET','function',11,'p_function','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1121),
  ('lbracket_restrict -> LBRACKET','lbracket_restrict',1,'p_lbracket_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1153),
  ('rbracket_restrict -> RBRACKET','rbracket_restrict',1,'p_rbracket_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1160),
  ('var_type_opt -> var_type','var_type_opt',1,'p_var_type_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1166),
  ('var_type_opt -> <empty>','var_type_opt',0,'p_var_type_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1167),
  ('colon_opt -> COLON','colon_opt',1,'p_colon_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1173),
  ('colon_opt -> <empty>','colon_opt',0,'p_colon_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1174),
  ('exprfunction -> FUNCTION template_opt push_scope LPAREN funcdeflist RPAREN colon_opt var_type_opt lbracket_restrict statementlist_opt rbracket_restrict','exprfunction',11,'p_exprfunction','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1180),
  ('exprfunction -> FUNCTION template_opt push_scope LPAREN RPAREN colon_opt var_type_opt lbracket_restrict statementlist_opt rbracket_restrict','exprfunction',10,'p_exprfunction','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1181),
  ('array_literal -> LSBRACKET exprlist RSBRACKET','array_literal',3,'p_array_literal','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1227),
  ('array_literal -> LSBRACKET RSBRACKET','array_literal',2,'p_array_literal','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1228),
  ('id_str_or_num -> ID','id_str_or_num',1,'p_id_str_or_num','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1237),
  ('id_str_or_num -> NUMBER','id_str_or_num',1,'p_id_str_or_num','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1238),
  ('id_str_or_num -> STRINGLIT','id_str_or_num',1,'p_id_str_or_num','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1239),
  ('typeof -> TYPEOF expr','typeof',2,'p_typeof','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1252),
  ('obj_lit_list -> id_str_or_num COLON expr','obj_lit_list',3,'p_obj_lit_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1258),
  ('obj_lit_list -> obj_lit_list COMMA id_str_or_num COLON expr','obj_lit_list',5,'p_obj_lit_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1259),
  ('obj_lit_list -> obj_lit_list COMMA','obj_lit_list',2,'p_obj_lit_list','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1260),
  ('obj_literal -> lbracket_restrict push_scope obj_lit_list rbracket_restrict','obj_literal',4,'p_obj_literal','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1274),
  ('obj_literal -> lbracket_restrict rbracket_restrict','obj_literal',2,'p_obj_literal','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1275),
  ('delete -> DELETE expr','delete',2,'p_delete','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1286),
  ('new -> NEW expr','new',2,'p_new','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1293),
  ('inc -> expr INC','inc',2,'p_inc','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1299),
  ('inc -> INC expr','inc',2,'p_inc','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1300),
  ('dec -> expr DEC','dec',2,'p_dec','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1309),
  ('dec -> DEC expr','dec',2,'p_dec','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1310),
  ('not -> NOT expr','not',2,'p_not','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1320),
  ('bitinv -> BITINV expr','bitinv',2,'p_bitinv','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1325),
  ('strlit -> STRINGLIT','strlit',1,'p_strlit','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1330),
  ('lparen_restrict -> LPAREN','lparen_restrict',1,'p_lparen_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1335),
  ('rparen_restrict -> RPAREN','rparen_restrict',1,'p_rparen_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1343),
  ('lsbracket_restrict -> LSBRACKET','lsbracket_restrict',1,'p_lsbracket_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1351),
  ('rsbracket_restrict -> RSBRACKET','rsbracket_restrict',1,'p_rsbracket_restrict','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1359),
  ('expr -> NUMBER','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1367),
  ('expr -> strlit','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1368),
  ('expr -> ID','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1369),
  ('expr -> ID template_ref','expr',2,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1370),
  ('expr -> template_ref','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1371),
  ('expr -> array_literal','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1372),
  ('expr -> exprfunction','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1373),
  ('expr -> obj_literal','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1374),
  ('expr -> expr cmplx_assign expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1375),
  ('expr -> expr cmplx_assign expr COLON var_type SEMI','expr',6,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1376),
  ('expr -> expr RSHIFT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1377),
  ('expr -> expr LSHIFT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1378),
  ('expr -> expr LLSHIFT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1379),
  ('expr -> expr RRSHIFT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1380),
  ('expr -> expr DOT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1381),
  ('expr -> expr LAND expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1382),
  ('expr -> expr LOR expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1383),
  ('expr -> expr BOR expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1384),
  ('expr -> expr INSTANCEOF expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1385),
  ('expr -> expr BXOR expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1386),
  ('expr -> expr BAND expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1387),
  ('expr -> expr EQUAL expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1388),
  ('expr -> expr EQUAL_STRICT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1389),
  ('expr -> expr NOTEQUAL_STRICT expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1390),
  ('expr -> expr GTHAN expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1391),
  ('expr -> expr GTHANEQ expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1392),
  ('expr -> expr LTHAN expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1393),
  ('expr -> expr MOD expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1394),
  ('expr -> expr LTHANEQ expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1395),
  ('expr -> expr NOTEQUAL expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1396),
  ('expr -> expr PLUS expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1397),
  ('expr -> expr MINUS expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1398),
  ('expr -> expr DIVIDE expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1399),
  ('expr -> expr TIMES expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1400),
  ('expr -> expr IN expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1401),
  ('expr -> lparen_restrict expr rparen_restrict','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1402),
  ('expr -> expr func_call','expr',2,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1403),
  ('expr -> expr lsbracket_restrict expr rsbracket_restrict','expr',4,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1404),
  ('expr -> expr QEST expr COLON expr','expr',5,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1405),
  ('expr -> expr_uminus','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1406),
  ('expr -> not','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1407),
  ('expr -> bitinv','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1408),
  ('expr -> new','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1409),
  ('expr -> inc','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1410),
  ('expr -> dec','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1411),
  ('expr -> typeof','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1412),
  ('expr -> re_lit','expr',1,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1413),
  ('expr -> expr COMMA expr','expr',3,'p_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1414),
  ('expr_uminus -> MINUS expr','expr_uminus',2,'p_expr_uminus','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1470),
  ('paren_expr -> LPAREN expr RPAREN','paren_expr',3,'p_paren_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1477),
  ('paren_expr -> LPAREN RPAREN','paren_expr',2,'p_paren_expr','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1478),
  ('assign_opt -> assign','assign_opt',1,'p_assign_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1487),
  ('assign_opt -> <empty>','assign_opt',0,'p_assign_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1488),
  ('expr_opt -> expr','expr_opt',1,'p_expr_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1497),
  ('expr_opt -> <empty>','expr_opt',0,'p_expr_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1498),
  ('re_lit -> REGEXPR','re_lit',1,'p_re_lit','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1507),
  ('for_var_decl -> ID','for_var_decl',1,'p_for_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1513),
  ('for_var_decl -> ID ASSIGN expr','for_var_decl',3,'p_for_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1514),
  ('for_var_decl -> var_decl','for_var_decl',1,'p_for_var_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1515),
  ('for_decl -> for_var_decl SEMI expr_opt SEMI expr_opt','for_decl',5,'p_for_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1543),
  ('for_decl -> for_var_decl IN expr','for_decl',3,'p_for_decl','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1544),
  ('for -> FOR LPAREN for_decl RPAREN statement_nonctrl','for',5,'p_for','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1553),
  ('for -> FOR LPAREN for_decl RPAREN LBRACKET statementlist_opt RBRACKET','for',7,'p_for','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1554),
  ('ctrl_statement -> statement_nonctrl','ctrl_statement',1,'p_ctrl_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1566),
  ('ctrl_statement -> LBRACKET statementlist_opt RBRACKET','ctrl_statement',3,'p_ctrl_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1567),
  ('ctrl_statement -> SEMI','ctrl_statement',1,'p_ctrl_statement','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1568),
  ('dowhile -> DO ctrl_statement WHILE paren_expr','dowhile',4,'p_dowhile','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1581),
  ('while -> WHILE paren_expr statement_nonctrl','while',3,'p_while','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1590),
  ('while -> WHILE paren_expr LBRACKET statementlist_opt RBRACKET','while',5,'p_while','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1591),
  ('default_case -> DEFAULT COLON statementlist','default_case',3,'p_default_case','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1603),
  ('statementlist_opt -> statementlist','statementlist_opt',1,'p_statementlist_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1609),
  ('statementlist_opt -> <empty>','statementlist_opt',0,'p_statementlist_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1610),
  ('case_clause -> CASE expr COLON statementlist_opt','case_clause',4,'p_case_clause','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1620),
  ('case_clauses -> case_clause','case_clauses',1,'p_case_clauses','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1627),
  ('case_clauses -> case_clauses case_clause','case_clauses',2,'p_case_clauses','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1628),
  ('case_clauses_opt -> case_clauses','case_clauses_opt',1,'p_case_clauses_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1638),
  ('case_clauses_opt -> <empty>','case_clauses_opt',0,'p_case_clauses_opt','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1639),
  ('case_block -> case_clauses','case_block',1,'p_case_block','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1649),
  ('case_block -> case_clauses_opt default_case case_clauses_opt','case_block',3,'p_case_block','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1650),
  ('switch -> SWITCH paren_expr LBRACKET case_block RBRACKET','switch',5,'p_switch','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1667),
  ('with -> WITH paren_expr ctrl_statement','with',3,'p_with','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1675),
  ('if -> IF paren_expr ctrl_statement','if',3,'p_if','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1683),
  ('try -> TRY statement_nonctrl','try',2,'p_try','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1691),
  ('try -> TRY LBRACKET statementlist RBRACKET','try',4,'p_try','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1692),
  ('try -> TRY LBRACKET RBRACKET','try',3,'p_try','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1693),
  ('catch -> CATCH paren_expr statement_nonctrl','catch',3,'p_catch','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1706),
  ('catch -> CATCH paren_expr LBRACKET statementlist RBRACKET','catch',5,'p_catch','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1707),
  ('else -> ELSE ctrl_statement','else',2,'p_else','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1719),
  ('break -> BREAK','break',1,'p_break','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1727),
  ('continue -> CONTINUE','continue',1,'p_continue','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1734),
  ('return -> RETURN expr','return',2,'p_return','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1741),
  ('return -> RETURN','return',1,'p_return','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1742),
  ('yield -> YIELD expr','yield',2,'p_yield','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1752),
  ('yield -> YIELD','yield',1,'p_yield','c:\\dev\\allshape\\tools\\extjs_cc\\js_parse.py',1753),
]

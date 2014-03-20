
# parsetab.py
# This file is automatically generated. Do not edit.
_tabversion = '3.2'

_lr_method = 'LALR'

_lr_signature = b'.\x91\xf4\x02\x83e\xe1\x9c\x8f\x0c\x82@\xe0\x94l\xd1'
    
_lr_action_items = {'HTML':([0,1,2,3,4,5,6,7,8,9,10,11,],[5,-5,-9,-6,-1,-11,-10,5,-7,-4,-8,-2,]),'INCLUDE':([0,1,2,3,4,5,6,7,8,9,10,11,],[2,-5,-9,-6,-1,-11,-10,2,-7,-4,-8,-2,]),'BINDING':([0,1,2,3,4,5,6,7,8,9,10,11,],[6,-5,-9,-6,-1,-11,-10,6,-7,-4,-8,-2,]),'CODE':([0,1,2,3,4,5,6,7,8,9,10,11,],[10,-5,-9,-6,-1,-11,-10,10,-7,-4,-8,-2,]),'$end':([0,1,2,3,4,5,6,7,8,9,10,11,],[-3,-5,-9,-6,-1,-11,-10,0,-7,-4,-8,-2,]),}

_lr_action = { }
for _k, _v in _lr_action_items.items():
   for _x,_y in zip(_v[0],_v[1]):
      if not _x in _lr_action:  _lr_action[_x] = { }
      _lr_action[_x][_k] = _y
del _lr_action_items

_lr_goto_items = {'html':([0,7,],[1,1,]),'binding':([0,7,],[3,3,]),'statement':([0,7,],[4,11,]),'statementlist':([0,],[7,]),'include':([0,7,],[8,8,]),'code':([0,7,],[9,9,]),}

_lr_goto = { }
for _k, _v in _lr_goto_items.items():
   for _x,_y in zip(_v[0],_v[1]):
       if not _x in _lr_goto: _lr_goto[_x] = { }
       _lr_goto[_x][_k] = _y
del _lr_goto_items
_lr_productions = [
  ("S' -> statementlist","S'",1,None,None,None),
  ('statementlist -> statement','statementlist',1,'p_statementlist','c:\\dev\\allshape\\cserver\\cs_parse.py',24),
  ('statementlist -> statementlist statement','statementlist',2,'p_statementlist','c:\\dev\\allshape\\cserver\\cs_parse.py',25),
  ('statementlist -> <empty>','statementlist',0,'p_statementlist','c:\\dev\\allshape\\cserver\\cs_parse.py',26),
  ('statement -> code','statement',1,'p_statement','c:\\dev\\allshape\\cserver\\cs_parse.py',39),
  ('statement -> html','statement',1,'p_statement','c:\\dev\\allshape\\cserver\\cs_parse.py',40),
  ('statement -> binding','statement',1,'p_statement','c:\\dev\\allshape\\cserver\\cs_parse.py',41),
  ('statement -> include','statement',1,'p_statement','c:\\dev\\allshape\\cserver\\cs_parse.py',42),
  ('code -> CODE','code',1,'p_code','c:\\dev\\allshape\\cserver\\cs_parse.py',47),
  ('include -> INCLUDE','include',1,'p_include','c:\\dev\\allshape\\cserver\\cs_parse.py',52),
  ('binding -> BINDING','binding',1,'p_binding','c:\\dev\\allshape\\cserver\\cs_parse.py',57),
  ('html -> HTML','html',1,'p_html','c:\\dev\\allshape\\cserver\\cs_parse.py',68),
]

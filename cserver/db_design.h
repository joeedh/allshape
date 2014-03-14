/*
  possible DB threading model:
  
  maintain two DB states: a read-only database,
  and and write database.  whenever a transaction
  happens, lock the read-only DB then swap pointers
  with the write DB.
  
  the read DB would be totally thread-safe being, 
  you know, read-only.  to make things even easier,
  we could use mmap on linux in lieu of file
  i/o and manual caching (and associated i/o locks).
  
  also, rather than having a single DB server for reads and writes, 
  we could have each web server maintain a read-only cached DB, which would be
  updated periodically by the main DB server.
*/

/*
hilariously enough, I could re-use my struct serialization
grammar for this.  have something like:

TableDef {
  userid : ID;
  username : string[255];
  password : string[128];
  permissions : int;
}

which would turn into:
  typedef struct TableStruct {
    int userid;
    char username[255];
    char pad1;
    char password[255];
    char pad2;
    int permissions;
  }
  
  typedef struct TableColumn {
    int type; //DATETIME, INT, STRING, etc.
    some_hashtable hash; //would need to support duplicat entries.
    btree_if_I_feel_like_it btree;
  }
  
  typedef struct Table {
    SparseArray *table_struct_array;
    TableColumn *columns;
  }

client code would read structs directly (or a copy on the 
stack, perhaps), with a more complex api for writing.

so you could have something like:
int userid = dbquery(db.users, username).userid;

dbquery would be a macro, of course.

updating a DB entry would involve sending the field struct
to the server, which would then enter a transactional/journaling
update mode.

the server would write a journal file, perhaps something like this:

TRANSACTION_START
UPDATE users, byte_offset, writelen
[a copy of the data at byte_offset and writelen]
COMPLETE
TRANSACTION_END

it wouldn't be foolproof, but if the DB server crashed, it could restore
its state by simply undoing what it did before it crashed, via the journal
file.

periodic backups would still be necessary, of course.